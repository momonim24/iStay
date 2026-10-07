import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { requireSupabase } from "../lib/supabase";

type Params = Record<string, string | string[] | undefined>;

export function isPropertyId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getManagedProperty(id: string, ownerId: string) {
  if (!isPropertyId(id) || !ownerId)
    throw new Error("Invalid property or owner");
  const { data, error } = await requireSupabase()
    .from("properties")
    .select(
      `
      id, owner_id, name, description, property_type, address, barangay, city,
      province, monthly_rent, security_deposit, electricity_included,
      water_included, internet_included, verified, status, created_at, updated_at,
      rooms (id, property_id, name, description, monthly_rent, capacity, available_slots, available),
      property_images (id, property_id, image_url, is_cover, sort_order),
      property_amenities (property_id, amenity_id, amenities (id, name, icon))
    `,
    )
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    property_images: [...(data.property_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    ),
  };
}

export type ManagedProperty = NonNullable<
  Awaited<ReturnType<typeof getManagedProperty>>
>;
export type PropertyPhoto = {
  id: string;
  uri: string;
  mimeType?: string | null;
};
export type FormRoom = {
  id: number;
  name: string;
  monthlyRent: string;
  capacity: string;
  availableSlots: string;
};

const AMENITY_IDS: Record<string, number> = {
  wifi: 1,
  aircon: 2,
  parking: 3,
  bathroom: 4,
  kitchen: 5,
  laundry: 6,
  furnished: 7,
  security: 8,
  pets: 9,
};
const MAX_PHOTO_BYTES = 5_242_880;

export function getParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function jsonArray(value: string | string[] | undefined): unknown[] {
  const parsed: unknown = JSON.parse(getParam(value));
  if (!Array.isArray(parsed)) throw new Error("Expected a form array");
  return parsed;
}

export function parseRooms(value: string | string[] | undefined): FormRoom[] {
  return jsonArray(value).map((room: unknown) => {
    if (!room || typeof room !== "object") throw new Error("Invalid room");
    const row = room as Record<string, unknown>;
    if (
      typeof row.id !== "number" ||
      !Number.isFinite(row.id) ||
      !["name", "monthlyRent", "capacity", "availableSlots"].every(
        (field) => typeof row[field] === "string",
      )
    )
      throw new Error("Invalid room fields");
    return {
      id: row.id,
      name: row.name as string,
      monthlyRent: row.monthlyRent as string,
      capacity: row.capacity as string,
      availableSlots: row.availableSlots as string,
    };
  });
}

export function parseAmenities(value: string | string[] | undefined): string[] {
  const keys = jsonArray(value);
  if (
    !keys.every(
      (key): key is string =>
        typeof key === "string" && Object.hasOwn(AMENITY_IDS, key),
    )
  )
    throw new Error("Unknown amenity");
  return [...new Set(keys)];
}

function numeric(value: string, minimum: number, integer = false): number {
  const result = Number(value);
  if (
    !value.trim() ||
    !Number.isFinite(result) ||
    result < minimum ||
    (integer && (!Number.isInteger(result) || result > 2_147_483_647))
  ) {
    throw new Error("Invalid numeric form value");
  }
  return result;
}

function booleanParam(value: string | string[] | undefined): boolean {
  const text = getParam(value);
  if (text !== "true" && text !== "false")
    throw new Error("Invalid utility value");
  return text === "true";
}

function required(value: string | string[] | undefined): string {
  const text = getParam(value).trim();
  if (!text) throw new Error("Missing required property field");
  return text;
}

export async function readPropertyPhoto(photo: PropertyPhoto) {
  // Native File reads bytes directly; never pass a native Blob/FormData to Storage.
  const file = Platform.OS === "web" ? null : new File(photo.uri);
  if (file && file.size > MAX_PHOTO_BYTES)
    throw new Error("Photo exceeds 5 MB");
  const response = file ? null : await fetch(photo.uri);
  if (response && !response.ok)
    throw new Error("Could not read selected photo");
  const bytes = file ? await file.arrayBuffer() : await response!.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO_BYTES)
    throw new Error("Invalid photo size");
  const contentType =
    photo.mimeType ||
    file?.type ||
    response?.headers.get("content-type") ||
    "application/octet-stream";
  const extension =
    (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
        "image/heif": "heif",
      } as Record<string, string>
    )[contentType] || "bin";
  return { bytes, contentType, extension };
}

export async function submitProperty(
  ownerId: string,
  params: Params,
  photos: PropertyPhoto[],
  coverPhotoId: string | null,
): Promise<string> {
  if (!ownerId) throw new Error("An authenticated owner is required");
  if (
    photos.length < 1 ||
    photos.length > 8 ||
    new Set(photos.map((photo) => photo.id)).size !== photos.length
  ) {
    throw new Error("Select between one and eight unique photos");
  }
  const property = {
    owner_id: ownerId,
    name: required(params.propertyName),
    description: getParam(params.description).trim() || null,
    property_type: required(params.propertyType),
    address: required(params.address),
    barangay: required(params.barangay),
    city: required(params.city),
    province: "Cavite",
    monthly_rent: numeric(getParam(params.monthlyRent), Number.MIN_VALUE),
    security_deposit: numeric(getParam(params.securityDeposit) || "0", 0),
    electricity_included: booleanParam(params.electricityIncluded),
    water_included: booleanParam(params.waterIncluded),
    internet_included: booleanParam(params.internetIncluded),
    verified: false,
    status: "pending",
  };
  const rooms = parseRooms(params.rooms).map((room) => {
    const capacity = numeric(room.capacity, 1, true);
    const slots = numeric(room.availableSlots, 0, true);
    if (slots > capacity) throw new Error("Available slots exceed capacity");
    return {
      name: required(room.name),
      monthly_rent: numeric(room.monthlyRent, Number.MIN_VALUE),
      capacity,
      available_slots: slots,
      available: slots > 0,
    };
  });
  if (!rooms.length) throw new Error("At least one room is required");
  const amenityIds = parseAmenities(params.amenities).map(
    (key) => AMENITY_IDS[key],
  );
  const coverIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === coverPhotoId),
  );
  const client = requireSupabase();
  const bucket = client.storage.from("property-images");
  let propertyId: string | null = null;
  const uploadedPaths: string[] = [];
  try {
    const { data, error } = await client
      .from("properties")
      .insert(property)
      .select("id")
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("Property insert did not return an ID");
    propertyId = data.id;
    const { error: roomError } = await client
      .from("rooms")
      .insert(rooms.map((room) => ({ ...room, property_id: propertyId })));
    if (roomError) throw roomError;
    if (amenityIds.length) {
      const { error } = await client.from("property_amenities").insert(
        amenityIds.map((amenity_id) => ({
          property_id: propertyId,
          amenity_id,
        })),
      );
      if (error) throw error;
    }
    const images = [];
    for (const [index, photo] of photos.entries()) {
      const { bytes, contentType, extension } = await readPropertyPhoto(photo);
      const path = `${propertyId}/${randomUUID()}.${extension}`;
      // Track the attempted path too: a lost upload response may still have stored it.
      uploadedPaths.push(path);

      console.log("Uploading property image:", {
        propertyId,
        path,
        ownerId,
      });

      const { data: ownershipCheck, error: ownershipError } = await client
        .from("properties")
        .select("id, owner_id, status")
        .eq("id", propertyId)
        .single();

      console.log("Property before storage upload:", {
        ownershipCheck,
        ownershipError,
      });

      const { error } = await bucket.upload(path, bytes, {
        contentType,
        upsert: false,
      });
      if (error) throw error;
      const { data: url } = bucket.getPublicUrl(path);
      images.push({
        property_id: propertyId,
        image_url: url.publicUrl,
        is_cover: index === coverIndex,
        sort_order: index,
      });
    }
    const { error: imageError } = await client
      .from("property_images")
      .insert(images);
    if (imageError) throw imageError;
    return propertyId!;
  } catch (error) {
    if (propertyId) {
      let cleanupFailed = false;
      const cleanup = async (
        label: string,
        action: () => PromiseLike<{ error: unknown }>,
      ) => {
        try {
          const result = await action();
          if (result.error) throw result.error;
        } catch (cleanupError) {
          cleanupFailed = true;
          console.error(
            `Property submission cleanup failed (${label}, ${propertyId}):`,
            cleanupError,
          );
        }
      };
      // Storage ownership depends on the property row, so remove files first.
      if (uploadedPaths.length)
        await cleanup("storage", () => bucket.remove(uploadedPaths));

      for (const table of ["property_images", "property_amenities", "rooms"]) {
        await cleanup(table, () =>
          client.from(table).delete().eq("property_id", propertyId!),
        );
      }

      // Retain the ownership row if cleanup failed so remaining objects can be removed later.
      if (!cleanupFailed)
        await cleanup("properties", () =>
          client
            .from("properties")
            .delete()
            .eq("id", propertyId!)
            .eq("owner_id", ownerId),
        );
    }

    throw error;
  }
}
