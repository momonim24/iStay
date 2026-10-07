import { randomUUID } from "expo-crypto";
import { requireSupabase } from "../lib/supabase";
import {
  getManagedProperty,
  isPropertyId,
  readPropertyPhoto,
  type PropertyPhoto,
} from "./property.service";

export const PROPERTY_TYPES = [
  "Apartment",
  "Boarding House",
  "Dormitory",
  "Bedspace",
  "House",
  "Room for Rent",
];
export class ManagementError extends Error {}
export type PropertyEdit = {
  name: string;
  property_type: string;
  description: string;
  address: string;
  barangay: string;
  city: string;
  monthly_rent: string;
  security_deposit: string;
  electricity_included: boolean;
  water_included: boolean;
  internet_included: boolean;
};
export type RoomEdit = {
  name: string;
  description: string;
  monthly_rent: string;
  capacity: string;
  available_slots: string;
};

function text(value: string, label: string) {
  if (!value.trim()) throw new ManagementError(`${label} is required.`);
  return value.trim();
}
function number(
  value: string,
  label: string,
  positive = false,
  integer = false,
) {
  const result = Number(value);
  if (
    !value.trim() ||
    !Number.isFinite(result) ||
    result < 0 ||
    (positive && result === 0) ||
    (integer && (!Number.isInteger(result) || result > 2_147_483_647))
  ) {
    throw new ManagementError(
      `${label} must be ${positive ? "greater than zero" : "zero or greater"}${integer ? " and a whole number" : ""}.`,
    );
  }
  return result;
}
export function validatePropertyEdit(form: PropertyEdit) {
  if (!PROPERTY_TYPES.includes(form.property_type))
    throw new ManagementError("Choose a property type.");
  return {
    name: text(form.name, "Property name"),
    property_type: form.property_type,
    description: form.description.trim() || null,
    address: text(form.address, "Address"),
    barangay: text(form.barangay, "Barangay"),
    city: text(form.city, "City"),
    province: "Cavite",
    monthly_rent: number(form.monthly_rent, "Monthly rent", true),
    security_deposit: number(form.security_deposit || "0", "Security deposit"),
    electricity_included: form.electricity_included,
    water_included: form.water_included,
    internet_included: form.internet_included,
  };
}
export function validateRoomEdit(form: RoomEdit) {
  const capacity = number(form.capacity, "Capacity", true, true);
  const slots = number(form.available_slots, "Available slots", false, true);
  if (slots > capacity)
    throw new ManagementError("Available slots cannot exceed capacity.");
  return {
    name: text(form.name, "Room name"),
    description: form.description.trim() || null,
    monthly_rent: number(form.monthly_rent, "Monthly rent", true),
    capacity,
    available_slots: slots,
    available: slots > 0,
  };
}
export function amenityDiff(current: number[], selected: number[]) {
  const previous = new Set(current),
    next = new Set(selected);
  return {
    additions: [...next].filter((id) => !previous.has(id)),
    removals: [...previous].filter((id) => !next.has(id)),
  };
}
export function validateStatusTransition(current: string, next: string) {
  if (!(
    (current === "active" && next === "inactive") ||
    (current === "inactive" && next === "active")
  )) {
    throw new ManagementError(
      "Only active and inactive listings can be switched. Administrator verification cannot be changed here.",
    );
  }
}
export function validatePhotoCount(current: number, additions: number) {
  if (
    !Number.isInteger(current) ||
    !Number.isInteger(additions) ||
    current < 0 ||
    additions < 1 ||
    current + additions > 8
  ) {
    throw new ManagementError("A property can have at most 8 photos.");
  }
}

export function safePropertyImagePath(
  imageUrl: string,
  propertyId: string,
  bucketPublicUrl: string,
): string {
  try {
    if (!isPropertyId(propertyId)) throw new Error();
    const url = new URL(imageUrl),
      root = new URL(bucketPublicUrl);
    const prefix = root.pathname.endsWith("/")
      ? root.pathname
      : `${root.pathname}/`;
    if (
      url.origin !== root.origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(prefix)
    )
      throw new Error();
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const parts = path.split("/");
    if (
      parts.length !== 2 ||
      parts[0] !== propertyId ||
      !parts[1] ||
      parts[1] === "." ||
      parts[1] === ".." ||
      /[\\\x00-\x1f]/.test(path)
    )
      throw new Error();
    return path;
  } catch {
    throw new ManagementError(
      "This photo URL does not match this property's Storage folder. It was not removed.",
    );
  }
}

async function owned(id: string, ownerId: string) {
  if (!isPropertyId(id) || !ownerId)
    throw new ManagementError("Invalid property link or signed-out account.");
  const property = await getManagedProperty(id, ownerId);
  if (!property)
    throw new ManagementError(
      "This property is unavailable or does not belong to your account.",
    );
  return property;
}

// Prevent overlapping management mutations for one property in this app instance.
const locks = new Set<string>();
async function mutate<T>(
  id: string,
  ownerId: string,
  action: (
    property: NonNullable<Awaited<ReturnType<typeof owned>>>,
  ) => Promise<T>,
) {
  if (locks.has(id))
    throw new ManagementError("A change is already being saved. Please wait.");
  locks.add(id);
  try {
    return await action(await owned(id, ownerId));
  } finally {
    locks.delete(id);
  }
}
function check(error: unknown) {
  if (error) throw error;
}
function changed(data: unknown[] | null) {
  if (!data?.length)
    throw new ManagementError(
      "No changes were saved. The item may have changed or your account may not have permission.",
    );
}

export async function updateOwnerProperty(
  id: string,
  ownerId: string,
  form: PropertyEdit,
) {
  const payload = validatePropertyEdit(form);
  return mutate(id, ownerId, async () => {
    const { data, error } = await requireSupabase()
      .from("properties")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("id");
    check(error);
    changed(data);
  });
}
export async function savePropertyRoom(
  id: string,
  ownerId: string,
  roomId: string | null,
  form: RoomEdit,
) {
  const payload = validateRoomEdit(form);
  return mutate(id, ownerId, async (property) => {
    const client = requireSupabase();
    if (roomId && !property.rooms.some((room) => room.id === roomId))
      throw new ManagementError("Room not found in this property.");
    const result = roomId
      ? await client
          .from("rooms")
          .update(payload)
          .eq("id", roomId)
          .eq("property_id", id)
          .select("id")
      : await client
          .from("rooms")
          .insert({ ...payload, property_id: id })
          .select("id");
    check(result.error);
    changed(result.data);
  });
}
export async function deletePropertyRoom(
  id: string,
  ownerId: string,
  roomId: string,
) {
  return mutate(id, ownerId, async (property) => {
    if (!property.rooms.some((room) => room.id === roomId))
      throw new ManagementError("Room not found in this property.");
    const { data, error } = await requireSupabase()
      .from("rooms")
      .delete()
      .eq("id", roomId)
      .eq("property_id", id)
      .select("id");
    check(error);
    changed(data);
  });
}
export async function getAmenitiesForProperty(id: string, ownerId: string) {
  await owned(id, ownerId);
  const { data, error } = await requireSupabase()
    .from("amenities")
    .select("id, name, icon")
    .order("id");
  check(error);
  return (data ?? []) as { id: number; name: string; icon: string | null }[];
}
export async function updatePropertyAmenities(
  id: string,
  ownerId: string,
  selected: number[],
) {
  if (selected.some((value) => !Number.isSafeInteger(value) || value <= 0))
    throw new ManagementError("Invalid amenity selection.");
  return mutate(id, ownerId, async (property) => {
    const client = requireSupabase();
    const { data: catalogue, error: catalogueError } = await client
      .from("amenities")
      .select("id");
    check(catalogueError);
    if (
      selected.some(
        (value) => !catalogue?.some((row) => Number(row.id) === value),
      )
    )
      throw new ManagementError(
        "An amenity is no longer available. Please reload.",
      );
    const { additions, removals } = amenityDiff(
      property.property_amenities.map((row) => Number(row.amenity_id)),
      selected,
    );
    if (additions.length) {
      const { data, error } = await client
        .from("property_amenities")
        .insert(
          additions.map((amenity_id) => ({ property_id: id, amenity_id })),
        )
        .select("amenity_id");
      check(error);
      changed(data);
    }
    if (removals.length) {
      const { data, error } = await client
        .from("property_amenities")
        .delete()
        .eq("property_id", id)
        .in("amenity_id", removals)
        .select("amenity_id");
      check(error);
      changed(data);
    }
  });
}
export async function updateOwnerListingStatus(
  id: string,
  ownerId: string,
  next: "active" | "inactive",
) {
  return mutate(id, ownerId, async (property) => {
    validateStatusTransition(property.status, next);
    if (next === "active" && !property.verified)
      throw new ManagementError(
        "Administrator verification is required before reactivation.",
      );
    let query = requireSupabase()
      .from("properties")
      .update({ status: next })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .eq("status", property.status);
    if (next === "active") query = query.eq("verified", true);
    const { data, error } = await query.select("id");
    check(error);
    changed(data);
  });
}

type ImageRow = {
  id: string;
  is_cover: boolean;
  sort_order: number;
  image_url: string;
};
async function applyCover(id: string, targetId: string, previous: ImageRow[]) {
  const client = requireSupabase();
  try {
    const clear = await client
      .from("property_images")
      .update({ is_cover: false })
      .eq("property_id", id)
      .select("id");
    check(clear.error);
    changed(clear.data);
    const set = await client
      .from("property_images")
      .update({ is_cover: true })
      .eq("property_id", id)
      .eq("id", targetId)
      .select("id");
    check(set.error);
    changed(set.data);
  } catch (error) {
    // Restore one prior cover if possible; caller refetches on either outcome.
    const fallback = previous.find((row) => row.is_cover) ?? previous[0];
    if (fallback) {
      try {
        const clear = await client
          .from("property_images")
          .update({ is_cover: false })
          .eq("property_id", id);
        check(clear.error);
        const restore = await client
          .from("property_images")
          .update({ is_cover: true })
          .eq("property_id", id)
          .eq("id", fallback.id)
          .select("id");
        check(restore.error);
        changed(restore.data);
      } catch (restoreError) {
        console.error("Could not restore property cover:", {
          propertyId: id,
          restoreError,
        });
      }
    }
    throw error;
  }
}
export async function setPropertyCoverImage(
  id: string,
  ownerId: string,
  imageId: string,
) {
  return mutate(id, ownerId, async (property) => {
    if (!property.property_images.some((row) => row.id === imageId))
      throw new ManagementError("Photo not found in this property.");
    await applyCover(id, imageId, property.property_images);
  });
}

export async function uploadPropertyImages(
  id: string,
  ownerId: string,
  photos: PropertyPhoto[],
) {
  return mutate(id, ownerId, async (property) => {
    validatePhotoCount(property.property_images.length, photos.length);
    const client = requireSupabase(),
      bucket = client.storage.from("property-images");
    const startOrder =
      Math.max(-1, ...property.property_images.map((row) => row.sort_order)) +
      1;
    // Validate/read all files before uploading any.
    const files = [];
    for (const photo of photos) files.push(await readPropertyPhoto(photo));
    let completed = 0;
    for (const [index, file] of files.entries()) {
      const path = `${id}/${randomUUID()}.${file.extension}`;
      let inserted = false;
      try {
        const upload = await bucket.upload(path, file.bytes, {
          contentType: file.contentType,
          upsert: false,
        });
        check(upload.error);
        const { data: url } = bucket.getPublicUrl(path);
        const insert = await client
          .from("property_images")
          .insert({
            property_id: id,
            image_url: url.publicUrl,
            is_cover: property.property_images.length === 0 && index === 0,
            sort_order: startOrder + index,
          })
          .select("id");
        check(insert.error);
        changed(insert.data);
        inserted = true;
        completed++;
      } catch (error) {
        // Do not delete a successfully linked photo after a later failure.
        if (!inserted) {
          try {
            // A lost insert response might still have committed. Check before deleting.
            const checkRow = await client
              .from("property_images")
              .select("id")
              .eq("property_id", id)
              .eq("image_url", bucket.getPublicUrl(path).data.publicUrl);
            check(checkRow.error);
            if (!checkRow.data?.length) {
              const removal = await bucket.remove([path]);
              check(removal.error);
            }
          } catch (cleanupError) {
            console.error("Photo upload cleanup failed:", {
              propertyId: id,
              path,
              cleanupError,
            });
          }
        }
        console.error("Property photo upload failed:", error);
        throw new ManagementError(
          `Could not finish adding photos. ${completed} photo(s) were added before the failure. Refresh and check your photos before retrying.`,
        );
      }
    }
    const refreshed = await owned(id, ownerId);
    const covers = refreshed.property_images.filter((row) => row.is_cover);
    if (refreshed.property_images.length && covers.length !== 1)
      await applyCover(
        id,
        covers[0]?.id ?? refreshed.property_images[0].id,
        refreshed.property_images,
      );
  });
}

export async function deletePropertyImage(
  id: string,
  ownerId: string,
  imageId: string,
) {
  return mutate(id, ownerId, async (property) => {
    const image = property.property_images.find((row) => row.id === imageId);
    if (!image) throw new ManagementError("Photo not found in this property.");
    const client = requireSupabase(),
      bucket = client.storage.from("property-images");
    const path = safePropertyImagePath(
      image.image_url,
      id,
      bucket.getPublicUrl("").data.publicUrl,
    );
    console.log("Attempting Storage removal:", {
      propertyId: id,
      imageId,
      path,
    });

    const removal = await bucket.remove([path]);

    console.log("Storage removal result:", {
      data: removal.data,
      error: removal.error,
    });

    check(removal.error);
    // Empty removal is ambiguous (missing object or Storage SELECT/DELETE policy).
    if (!removal.data?.length)
      throw new ManagementError(
        "Storage did not confirm removal. Check the Storage SELECT and DELETE permissions; the photo record was retained.",
      );
    const deletion = await client
      .from("property_images")
      .delete()
      .eq("property_id", id)
      .eq("id", imageId)
      .select("id");
    if (deletion.error || !deletion.data?.length) {
      console.error(
        "Photo file removed but database deletion failed:",
        deletion.error,
      );
      throw new ManagementError(
        "The photo file was removed, but its record could not be deleted. Refresh and check your photos; database permissions may need review.",
      );
    }
    const remaining = property.property_images.filter(
      (row) => row.id !== imageId,
    );
    if (
      remaining.length &&
      (image.is_cover || remaining.filter((row) => row.is_cover).length !== 1)
    ) {
      try {
        await applyCover(id, remaining[0].id, remaining);
      } catch (error) {
        console.error("Photo removed but replacement cover failed:", error);
        throw new ManagementError(
          "Photo removed, but the replacement cover could not be saved. Refresh and choose a cover again.",
        );
      }
    }
  });
}
