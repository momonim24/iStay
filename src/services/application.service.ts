import { requireSupabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  fetchTenantProperty,
  orderPhotos,
  tenantVisible,
  validPropertyId,
  TenantPhoto,
} from "./tenant-discovery.service";
import type {
  ApplicationDetails,
  ApplicationProperty,
  ApplicationRoom,
  ApplicationStatus,
  RentalApplication,
} from "../types/application";

export class ApplicationError extends Error {}
const unavailable = "This property is no longer available for applications.";
const conflict =
  "You already have a pending or approved application for this property and room. Check My Applications.";
const changed =
  "This application has already been decided or is no longer available. Refresh the list.";
const baseFields =
  "id,tenant_id,property_id,room_id,message,status,created_at,updated_at";
const detailFields = `${baseFields},
  property:properties(id,owner_id,name,address,barangay,city,province,property_type,monthly_rent,
    property_images(id,image_url,is_cover,sort_order)),
  room:rooms(id,property_id,name,monthly_rent)`;

function logError(error: unknown) {
  if (typeof __DEV__ !== "undefined" && __DEV__)
    console.warn("Rental application request failed:", error);
}
async function request<T>(
  query: PromiseLike<{ data: T; error: unknown }>,
  message: string,
): Promise<T> {
  try {
    const { data, error } = await query;
    if (error) {
      logError(error);
      if ((error as { code?: string }).code === "23505")
        throw new ApplicationError(conflict);
      throw new ApplicationError(message);
    }
    return data;
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    logError(error);
    throw new ApplicationError(message);
  }
}
async function authenticatedUserId(): Promise<string> {
  const data = await request<{ user: User | null }>(
    requireSupabase().auth.getUser(),
    "Please sign in again to manage applications.",
  );
  if (!data.user || data.user.is_anonymous)
    throw new ApplicationError("Please sign in again to manage applications.");
  return data.user.id;
}
function uuid(value: string, label: string) {
  if (!validPropertyId(value))
    throw new ApplicationError(`This ${label} link is invalid.`);
}
export function applicationMessage(value?: string): string | null {
  if (value !== undefined && typeof value !== "string")
    throw new ApplicationError("Enter a valid message.");
  const message = value?.trim() || null;
  if (message && message.length > 2000)
    throw new ApplicationError("Keep your message within 2,000 characters.");
  return message;
}
export function sortApplications<T extends RentalApplication>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
  );
}
type JoinedRow = RentalApplication & {
  property:
    | (Omit<ApplicationProperty, "image"> & { property_images: TenantPhoto[] })
    | null;
  room: ApplicationRoom | null;
};
export function formatApplication(row: JoinedRow): ApplicationDetails {
  const property = row.property?.id === row.property_id ? row.property : null;
  const room =
    row.room?.id === row.room_id && row.room?.property_id === row.property_id
      ? row.room
      : null;
  return {
    ...row,
    property: property
      ? {
          ...property,
          monthly_rent: Number(property.monthly_rent),
          image:
            orderPhotos(property.property_images ?? [])[0]?.image_url ?? null,
        }
      : null,
    room: room ? { ...room, monthly_rent: Number(room.monthly_rent) } : null,
    tenantName: null,
  };
}
async function existing(
  tenantId: string,
  propertyId: string,
  roomId: string | null,
): Promise<RentalApplication | null> {
  let query = requireSupabase()
    .from("applications")
    .select(baseFields)
    .eq("tenant_id", tenantId)
    .eq("property_id", propertyId)
    .in("status", ["pending", "approved"]);
  query =
    roomId === null ? query.is("room_id", null) : query.eq("room_id", roomId);
  const rows = await request(
    query.order("created_at", { ascending: false }).limit(1),
    "Unable to check existing applications. Please try again.",
  );
  return (rows?.[0] as RentalApplication | undefined) ?? null;
}
export async function findRelevantApplication(
  propertyId: string,
  roomId: string | null = null,
): Promise<RentalApplication | null> {
  uuid(propertyId, "property");
  if (roomId !== null) uuid(roomId, "room");
  return existing(await authenticatedUserId(), propertyId, roomId);
}
const submissions = new Set<string>();
export async function submitApplication(input: {
  propertyId: string;
  roomId?: string | null;
  message?: string;
}): Promise<RentalApplication> {
  uuid(input.propertyId, "property");
  const roomId = input.roomId ?? null;
  if (roomId !== null) uuid(roomId, "room");
  const message = applicationMessage(input.message);
  const tenantId = await authenticatedUserId();
  const key = `${tenantId}:${input.propertyId}:${roomId ?? "property"}`;
  if (submissions.has(key))
    throw new ApplicationError(
      "Your application is already being submitted. Please wait.",
    );
  submissions.add(key);
  try {
    // Revalidate fresh data; navigation parameters are never evidence of eligibility.
    let property;
    try {
      property = await fetchTenantProperty(input.propertyId);
    } catch (error) {
      logError(error);
      throw new ApplicationError(
        "Unable to check this property. Please try again.",
      );
    }
    if (!property || !tenantVisible(property))
      throw new ApplicationError(unavailable);
    if (roomId !== null) {
      const room = await request(
        requireSupabase()
          .from("rooms")
          .select("id,property_id,available,available_slots")
          .eq("id", roomId)
          .eq("property_id", input.propertyId)
          .maybeSingle(),
        "Unable to check the selected room. Please try again.",
      );
      if (!room || room.property_id !== input.propertyId)
        throw new ApplicationError(
          "This room is no longer available for this property. Choose another room.",
        );
      if (room.available !== true || !(Number(room.available_slots) > 0))
        throw new ApplicationError(
          "This room has no available slots. Choose another room or a property inquiry.",
        );
    }
    if (await existing(tenantId, input.propertyId, roomId))
      throw new ApplicationError(conflict);
    // Only whitelisted fields; caller-supplied tenant_id/status/etc. are ignored.
    const row = await request(
      requireSupabase()
        .from("applications")
        .insert({
          tenant_id: tenantId,
          property_id: input.propertyId,
          room_id: roomId,
          message,
          status: "pending",
        })
        .select(baseFields)
        .single(),
      "Unable to submit your application. Please check My Applications before trying again.",
    );
    if (!row)
      throw new ApplicationError(
        "Unable to confirm your application. Check My Applications before trying again.",
      );
    return row as RentalApplication;
  } finally {
    submissions.delete(key);
  }
}
// Page reads so the backend's default row limit cannot silently truncate history.
function applicationQuery() {
  return requireSupabase().from("applications").select(detailFields);
}
async function applicationPages(
  scope: (
    query: ReturnType<typeof applicationQuery>,
  ) => ReturnType<typeof applicationQuery>,
): Promise<ApplicationDetails[]> {
  const result: ApplicationDetails[] = [];
  for (let offset = 0; ; offset += 200) {
    const rows = await request(
      scope(applicationQuery())
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 199),
      "Unable to load applications. Please try again.",
    );
    result.push(
      ...((rows ?? []) as unknown as JoinedRow[]).map(formatApplication),
    );
    if (!rows || rows.length < 200) break;
  }
  return sortApplications(result);
}
export async function fetchTenantApplications(): Promise<ApplicationDetails[]> {
  const id = await authenticatedUserId();
  return (await applicationPages((query) => query.eq("tenant_id", id))).filter(
    (row) => row.tenant_id === id,
  );
}
export async function fetchTenantApplication(
  id: string,
): Promise<ApplicationDetails | null> {
  uuid(id, "application");
  const tenantId = await authenticatedUserId();
  const row = await request(
    requireSupabase()
      .from("applications")
      .select(detailFields)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    "Unable to load this application. Please try again.",
  );
  return row && row.tenant_id === tenantId
    ? formatApplication(row as unknown as JoinedRow)
    : null;
}
async function ownedPropertyIds(ownerId: string): Promise<string[]> {
  const ids: string[] = [];
  for (let offset = 0; ; offset += 200) {
    const rows = await request(
      requireSupabase()
        .from("properties")
        .select("id,owner_id")
        .eq("owner_id", ownerId)
        .order("id")
        .range(offset, offset + 199),
      "Unable to check your properties. Please try again.",
    );
    ids.push(
      ...(rows ?? [])
        .filter((row) => row.owner_id === ownerId)
        .map((row) => row.id as string),
    );
    if (!rows || rows.length < 200) break;
  }
  return ids;
}
export async function fetchLandlordApplications(): Promise<
  ApplicationDetails[]
> {
  const ownerId = await authenticatedUserId();
  const ids = await ownedPropertyIds(ownerId);
  const result: ApplicationDetails[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    result.push(
      ...(
        await applicationPages((query) => query.in("property_id", chunk))
      ).filter(
        (row) =>
          chunk.includes(row.property_id) && row.property?.owner_id === ownerId,
      ),
    );
  }
  // Profile privacy stays with RLS. Failure here must not hide application history.
  const tenantIds = [...new Set(result.map((row) => row.tenant_id))];
  const names = new Map<string, string>();
  for (let index = 0; index < tenantIds.length; index += 100) {
    try {
      const rows = await request(
        requireSupabase()
          .from("profiles")
          .select("id,full_name")
          .in("id", tenantIds.slice(index, index + 100)),
        "Applicant names are unavailable.",
      );
      for (const row of rows ?? [])
        if (row.full_name) names.set(row.id, row.full_name);
    } catch {
      /* Use application tenant_id only when profiles are inaccessible. */
    }
  }
  return sortApplications(
    result.map((row) => ({
      ...row,
      tenantName: names.get(row.tenant_id) ?? null,
    })),
  );
}
const decisions = new Set<string>();
async function decideApplication(
  id: string,
  status: Exclude<ApplicationStatus, "pending">,
): Promise<RentalApplication> {
  uuid(id, "application");
  const ownerId = await authenticatedUserId();
  const key = `${ownerId}:${id}`;
  if (decisions.has(key))
    throw new ApplicationError(
      "This application is already being updated. Please wait.",
    );
  decisions.add(key);
  try {
    const row = await request(
      requireSupabase()
        .from("applications")
        .select(baseFields)
        .eq("id", id)
        .maybeSingle(),
      "Unable to check this application. Please try again.",
    );
    if (!row) throw new ApplicationError(changed);
    const property = await request(
      requireSupabase()
        .from("properties")
        .select("id,owner_id")
        .eq("id", row.property_id)
        .eq("owner_id", ownerId)
        .maybeSingle(),
      "Unable to check property ownership. Please try again.",
    );
    if (!property || property.owner_id !== ownerId)
      throw new ApplicationError(
        "You can only manage applications for your own properties.",
      );
    if (row.status !== "pending") throw new ApplicationError(changed);
    // Atomic conditional status transition; room slots are deliberately untouched.
    // RLS must also enforce ownership at update time (see the manual SQL review).
    const updated = await request(
      requireSupabase()
        .from("applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("property_id", property.id)
        .eq("status", "pending")
        .select(baseFields)
        .maybeSingle(),
      "Unable to update this application. Refresh the list and try again.",
    );
    if (!updated) throw new ApplicationError(changed);
    return updated as RentalApplication;
  } finally {
    decisions.delete(key);
  }
}
export const approveApplication = (id: string) =>
  decideApplication(id, "approved");
export const rejectApplication = (id: string) =>
  decideApplication(id, "rejected");
