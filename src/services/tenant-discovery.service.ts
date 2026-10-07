import { requireSupabase } from "../lib/supabase";

export type TenantRoom = {
  id: string;
  name: string;
  description: string | null;
  monthly_rent: number;
  capacity: number;
  available_slots: number;
  available: boolean;
};
export type TenantPhoto = {
  id: string;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
};
export type TenantAmenity = { id: number; name: string; icon: string | null };
export type TenantProperty = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  property_type: string;
  address: string;
  barangay: string | null;
  city: string;
  province: string;
  monthly_rent: number;
  security_deposit: number | null;
  electricity_included: boolean;
  water_included: boolean;
  internet_included: boolean;
  verified: boolean;
  status: string;
  created_at: string;
  rooms: TenantRoom[];
  property_images: TenantPhoto[];
  property_amenities: { amenities: TenantAmenity | TenantAmenity[] | null }[];
  image: string | null;
};
export type DiscoveryFilters = {
  text?: string;
  city?: string;
  propertyType?: string;
  minRent?: string;
  maxRent?: string;
};
export const validPropertyId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const tenantVisible = (p: { status: string; verified: boolean }) =>
  p.status === "active" && p.verified === true;
export const orderPhotos = (photos: TenantPhoto[]) =>
  [...photos].sort(
    (a, b) =>
      Number(b.is_cover) - Number(a.is_cover) ||
      a.sort_order - b.sort_order ||
      a.id.localeCompare(b.id),
  );
export const availableRooms = (rooms: TenantRoom[]) =>
  rooms
    .filter((r) => r.available === true && r.available_slots > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
export const propertyLocation = (p: TenantProperty) =>
  [p.barangay, p.city, p.province].filter(Boolean).join(", ");
export const rentLabel = (value: number) =>
  `₱${Number(value).toLocaleString("en-PH")} / month`;
export function normalizeFilters(filters: DiscoveryFilters) {
  const price = (value?: string) => {
    if (!value?.trim()) return undefined;
    if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
      throw new Error("Enter a valid non-negative rent amount.");
    const result = Number(value);
    if (!Number.isFinite(result)) throw new Error("Enter a valid rent amount.");
    return result;
  };
  const min = price(filters.minRent),
    max = price(filters.maxRent);
  if (min !== undefined && max !== undefined && min > max)
    throw new Error("Minimum rent must not exceed maximum rent.");
  return {
    text: filters.text?.trim() || "",
    city: filters.city?.trim() || "",
    propertyType: filters.propertyType?.trim() || "",
    min,
    max,
  };
}
const fields = `id,owner_id,name,description,property_type,address,barangay,city,province,monthly_rent,security_deposit,electricity_included,water_included,internet_included,verified,status,created_at,
  rooms(id,name,description,monthly_rent,capacity,available_slots,available),
  property_images(id,image_url,is_cover,sort_order),property_amenities(amenities(id,name,icon))`;
function publicQuery() {
  return requireSupabase()
    .from("properties")
    .select(fields)
    .eq("status", "active")
    .eq("verified", true);
}
export function isCancellationError(
  error: unknown,
  signal?: AbortSignal,
): boolean {
  if (signal?.aborted) return true;
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: unknown; code?: unknown; message?: unknown };
  return (
    value.name === "AbortError" ||
    value.code === "ABORT_ERR" ||
    (typeof value.message === "string" &&
      /\bAbortError\b|\b(?:operation|request) (?:was |has been )?aborted\b/i.test(
        value.message,
      ))
  );
}
function cancellation(): never {
  const error = new Error("Discovery request cancelled.");
  error.name = "AbortError";
  throw error;
}
function failure(error: unknown): never {
  if (isCancellationError(error)) cancellation();
  console.error("Tenant discovery request failed:", error);
  throw new Error("Unable to load properties. Please try again.");
}
function format(row: Omit<TenantProperty, "image">): TenantProperty {
  const photos = orderPhotos(row.property_images ?? []);
  return {
    ...row,
    monthly_rent: Number(row.monthly_rent),
    security_deposit:
      row.security_deposit == null ? null : Number(row.security_deposit),
    property_images: photos,
    rooms: availableRooms(row.rooms ?? []).map((r) => ({
      ...r,
      monthly_rent: Number(r.monthly_rent),
    })),
    property_amenities: row.property_amenities ?? [],
    image: photos[0]?.image_url || null,
  };
}
export async function fetchTenantProperties(
  filters: DiscoveryFilters = {},
  signal?: AbortSignal,
): Promise<TenantProperty[]> {
  const f = normalizeFilters(filters);
  let query = publicQuery()
    .order("created_at", { ascending: false })
    .order("id");
  // Quote PostgREST values and escape LIKE wildcards: user text cannot inject filter syntax.
  const pattern = (text: string) =>
    `"%${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[%_]/g, "\\$&")}%"`;
  if (f.text)
    query = query.or(
      ["name", "address", "barangay", "city"]
        .map((field) => `${field}.ilike.${pattern(f.text)}`)
        .join(","),
    );
  // These Search inputs are free text, rather than controlled enum values.
  const literal = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
  if (f.city) query = query.ilike("city", literal(f.city));
  if (f.propertyType)
    query = query.ilike("property_type", literal(f.propertyType));
  if (f.min !== undefined) query = query.gte("monthly_rent", f.min);
  if (f.max !== undefined) query = query.lte("monthly_rent", f.max);
  if (signal) query = query.abortSignal(signal);
  const result: TenantProperty[] = [];
  for (let offset = 0; ; offset += 200) {
    if (signal?.aborted) cancellation();
    const { data, error } = await query.range(offset, offset + 199).then(
      (response) => response,
      (error: unknown) => {
        if (isCancellationError(error, signal)) cancellation();
        failure(error);
      },
    );
    if (isCancellationError(error, signal)) cancellation();
    if (error) failure(error);
    const rows = (data ?? []) as unknown as Omit<TenantProperty, "image">[];
    result.push(...rows.filter(tenantVisible).map(format));
    if (rows.length < 200) break;
  }
  return result;
}
export async function fetchTenantProperty(
  id: string,
): Promise<TenantProperty | null> {
  if (!validPropertyId(id)) return null;
  const { data, error } = await publicQuery().eq("id", id).maybeSingle();
  if (error) failure(error);
  const row = data as unknown as Omit<TenantProperty, "image"> | null;
  return row && tenantVisible(row) ? format(row) : null;
}
export async function fetchAvailableRooms(id: string) {
  return (await fetchTenantProperty(id))?.rooms ?? [];
}
export async function fetchPropertyPhotos(id: string) {
  return (await fetchTenantProperty(id))?.property_images ?? [];
}
export async function fetchPropertyAmenities(
  id: string,
): Promise<TenantAmenity[]> {
  return (
    (await fetchTenantProperty(id))?.property_amenities.flatMap((a) =>
      a.amenities
        ? Array.isArray(a.amenities)
          ? a.amenities
          : [a.amenities]
        : [],
    ) ?? []
  );
}

async function authenticatedUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user) {
    if (error) console.error("Favorite authentication failed:", error);
    throw new Error("Please sign in again to manage favorites.");
  }
  return data.user.id;
}
function favoriteFailure(error: unknown): never {
  console.error("Favorite request failed:", error);
  throw new Error("Unable to update or load favorites. Please try again.");
}
export async function fetchFavoriteIds(): Promise<string[]> {
  const userId = await authenticatedUserId();
  const ids: string[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await requireSupabase()
      .from("favorites")
      .select("property_id")
      .eq("user_id", userId)
      .order("property_id")
      .range(offset, offset + 199);
    if (error) favoriteFailure(error);
    ids.push(...(data ?? []).map((row) => String(row.property_id)));
    if ((data ?? []).length < 200) break;
  }
  return [...new Set(ids)];
}
export async function isFavorite(id: string): Promise<boolean> {
  if (!validPropertyId(id)) return false;
  return (await fetchFavoriteIds()).includes(id);
}
const favoriteMutations = new Map<string, Promise<void>>();
// Serialize mutations for the same user/listing in this client. The existing
// database unique constraint, if present, provides cross-client protection.
function serializeFavorite(
  key: string,
  action: () => Promise<void>,
): Promise<void> {
  const previous = favoriteMutations.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(action);
  favoriteMutations.set(key, next);
  void next
    .finally(() => {
      if (favoriteMutations.get(key) === next) favoriteMutations.delete(key);
    })
    .catch(() => {});
  return next;
}
export async function addFavorite(id: string): Promise<void> {
  if (!validPropertyId(id)) throw new Error("This property link is invalid.");
  const userId = await authenticatedUserId();
  return serializeFavorite(`${userId}:${id}`, async () => {
    if (!(await fetchTenantProperty(id)))
      throw new Error("This listing is no longer available.");
    const client = requireSupabase();
    const { data, error } = await client
      .from("favorites")
      .select("property_id")
      .eq("user_id", userId)
      .eq("property_id", id);
    if (error) favoriteFailure(error);
    if (!data?.length) {
      const { error } = await client
        .from("favorites")
        .insert({ user_id: userId, property_id: id });
      // A concurrent insert can win the unique constraint; confirm below.
      if (error && error.code !== "23505") favoriteFailure(error);
    }
    const { data: confirmed, error: readError } = await client
      .from("favorites")
      .select("property_id")
      .eq("user_id", userId)
      .eq("property_id", id);
    if (readError || !confirmed?.length)
      favoriteFailure(readError || new Error("Favorite was not saved"));
  });
}
export async function removeFavorite(id: string): Promise<void> {
  if (!validPropertyId(id)) throw new Error("This property link is invalid.");
  const userId = await authenticatedUserId();
  return serializeFavorite(`${userId}:${id}`, async () => {
    const client = requireSupabase();
    const { error } = await client
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("property_id", id);
    if (error) favoriteFailure(error);
    const { data, error: readError } = await client
      .from("favorites")
      .select("property_id")
      .eq("user_id", userId)
      .eq("property_id", id);
    if (readError || data?.length)
      favoriteFailure(readError || new Error("Favorite was not removed"));
  });
}
export async function fetchTenantFavorites(
  signal?: AbortSignal,
): Promise<TenantProperty[]> {
  const ids = await fetchFavoriteIds();
  if (!ids.length) return [];
  // Chunk IDs to avoid oversized REST URLs, keeping explicit public filters.
  const rows: TenantProperty[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    let query = publicQuery()
      .in("id", ids.slice(index, index + 100))
      .order("created_at", { ascending: false })
      .order("id");
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) failure(error);
    rows.push(
      ...((data ?? []) as unknown as Omit<TenantProperty, "image">[])
        .filter(tenantVisible)
        .map(format),
    );
  }
  return rows.sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
  );
}
