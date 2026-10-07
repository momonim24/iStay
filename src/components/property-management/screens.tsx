import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  PROPERTY_TYPES,
  updateOwnerProperty,
  savePropertyRoom,
  deletePropertyRoom,
  updatePropertyAmenities,
  uploadPropertyImages,
  deletePropertyImage,
  setPropertyCoverImage,
  ManagementError,
  type PropertyEdit,
  type RoomEdit,
} from "../../services/property-management.service";
import {
  Action,
  Field,
  Toggle,
  ManagementFrame,
  usePropertyManagement,
  styles,
} from "./shared";

const emptyProperty: PropertyEdit = {
  name: "",
  property_type: "",
  description: "",
  address: "",
  barangay: "",
  city: "",
  monthly_rent: "",
  security_deposit: "0",
  electricity_included: false,
  water_included: false,
  internet_included: false,
};
const emptyRoom: RoomEdit = {
  name: "",
  description: "",
  monthly_rent: "",
  capacity: "1",
  available_slots: "1",
};

export function EditPropertyScreen() {
  const state = usePropertyManagement();
  const [form, setForm] = useState<PropertyEdit>(emptyProperty);
  useEffect(() => {
    const p = state.property;
    if (p)
      setForm({
        name: p.name,
        property_type: p.property_type,
        description: p.description ?? "",
        address: p.address,
        barangay: p.barangay ?? "",
        city: p.city,
        monthly_rent: String(p.monthly_rent),
        security_deposit: String(p.security_deposit ?? 0),
        electricity_included: p.electricity_included,
        water_included: p.water_included,
        internet_included: p.internet_included,
      });
  }, [state.property]);
  const field = (
    key: keyof PropertyEdit,
    label: string,
    numeric = false,
    multiline = false,
  ) => (
    <Field
      label={label}
      value={String(form[key])}
      onChangeText={(value) =>
        setForm((current) => ({ ...current, [key]: value }))
      }
      numeric={numeric}
      multiline={multiline}
      disabled={state.busy}
    />
  );
  const save = async () => {
    if (
      await state.run(
        () => updateOwnerProperty(state.id, state.ownerId, form),
        { refresh: false, success: "Property information updated." },
      )
    )
      state.back();
  };
  return (
    <ManagementFrame title="Edit Property" state={state}>
      <View style={styles.card}>
        {field("name", "Property Name")}
        <Text style={styles.label}>Property Type</Text>
        <View style={styles.options}>
          {PROPERTY_TYPES.map((type) => (
            <Pressable
              key={type}
              disabled={state.busy}
              accessibilityRole="radio"
              accessibilityState={{ checked: form.property_type === type }}
              style={[
                styles.option,
                form.property_type === type && styles.selected,
              ]}
              onPress={() =>
                setForm((current) => ({ ...current, property_type: type }))
              }
            >
              <Text style={styles.body}>{type}</Text>
            </Pressable>
          ))}
        </View>
        {field("description", "Description", false, true)}
        {field("address", "Address")}
        {field("barangay", "Barangay")}
        {field("city", "City")}
        <Text style={styles.label}>Province</Text>
        <Text style={styles.body}>Cavite</Text>
        {field("monthly_rent", "Monthly Rent (₱)", true)}
        {field("security_deposit", "Security Deposit (₱)", true)}
        {(
          [
            "electricity_included",
            "water_included",
            "internet_included",
          ] as const
        ).map((key, index) => (
          <Toggle
            key={key}
            label={
              ["Electricity Included", "Water Included", "Internet Included"][
                index
              ]
            }
            value={form[key]}
            onChange={(value) =>
              setForm((current) => ({ ...current, [key]: value }))
            }
            disabled={state.busy}
          />
        ))}
        <Action
          label={state.busy ? "Saving..." : "Save Changes"}
          disabled={state.busy}
          onPress={() => void save()}
        />
      </View>
    </ManagementFrame>
  );
}

export function ManageRoomsScreen() {
  const state = usePropertyManagement();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState<RoomEdit>(emptyRoom);
  const rooms = state.property?.rooms ?? [];
  const field = (
    key: keyof RoomEdit,
    label: string,
    numeric = false,
    multiline = false,
  ) => (
    <Field
      label={label}
      value={form[key]}
      onChangeText={(value) =>
        setForm((current) => ({ ...current, [key]: value }))
      }
      numeric={numeric}
      multiline={multiline}
      disabled={state.busy}
    />
  );
  const save = async () => {
    if (editing === undefined) return;
    if (
      await state.run(
        () => savePropertyRoom(state.id, state.ownerId, editing, form),
        { success: "Room saved." },
      )
    ) {
      setEditing(undefined);
      setForm(emptyRoom);
    }
  };
  return (
    <ManagementFrame title="Manage Rooms" state={state}>
      {rooms.length === 0 && (
        <Text style={styles.body}>No rooms yet. Add a rental space below.</Text>
      )}
      {rooms.map((room) => (
        <View key={room.id} style={styles.card}>
          <Text style={styles.title}>{room.name}</Text>
          {room.description && (
            <Text style={styles.body}>{room.description}</Text>
          )}
          <Text style={styles.body}>
            ₱{Number(room.monthly_rent).toLocaleString()} / month
          </Text>
          <Text style={styles.body}>
            Capacity: {room.capacity} · Available slots: {room.available_slots}
          </Text>
          <Text style={styles.body}>
            {room.available ? "Available" : "Unavailable"}
          </Text>
          <Action
            label="Edit Room"
            secondary
            disabled={state.busy}
            onPress={() => {
              setEditing(room.id);
              setForm({
                name: room.name,
                description: room.description ?? "",
                monthly_rent: String(room.monthly_rent),
                capacity: String(room.capacity),
                available_slots: String(room.available_slots),
              });
            }}
          />
          <Action
            label="Delete Room"
            danger
            disabled={state.busy}
            onPress={() =>
              void state
                .run(
                  () => deletePropertyRoom(state.id, state.ownerId, room.id),
                  {
                    confirmation: [
                      "Delete Room",
                      `Delete ${room.name}? This cannot be undone.`,
                    ],
                  },
                )
                .then((ok) => {
                  if (ok && editing === room.id) setEditing(undefined);
                })
            }
          />
        </View>
      ))}
      {editing === undefined ? (
        <Action
          label="Add Room"
          disabled={state.busy}
          onPress={() => {
            setForm(emptyRoom);
            setEditing(null);
          }}
        />
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>{editing ? "Edit Room" : "Add Room"}</Text>
          {field("name", "Room Name")}
          {field("description", "Description", false, true)}
          {field("monthly_rent", "Monthly Rent (₱)", true)}
          {field("capacity", "Capacity", true)}
          {field("available_slots", "Available Slots", true)}
          <Action
            label={state.busy ? "Saving..." : "Save Room"}
            disabled={state.busy}
            onPress={() => void save()}
          />
          <Action
            label="Cancel"
            secondary
            disabled={state.busy}
            onPress={() => setEditing(undefined)}
          />
        </View>
      )}
    </ManagementFrame>
  );
}

export function ManageAmenitiesScreen() {
  const state = usePropertyManagement(true);
  const [selected, setSelected] = useState<number[]>([]);
  useEffect(() => {
    if (state.property)
      setSelected(
        state.property.property_amenities.map((row) => Number(row.amenity_id)),
      );
  }, [state.property]);
  return (
    <ManagementFrame title="Manage Amenities" state={state}>
      <Text style={styles.body}>
        Select the amenities available at your property.
      </Text>
      {state.catalogue.length === 0 && (
        <Text style={styles.body}>No amenities are available yet.</Text>
      )}
      <View style={styles.options}>
        {state.catalogue.map((amenity) => (
          <Pressable
            key={amenity.id}
            disabled={state.busy}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected.includes(amenity.id) }}
            style={[
              styles.option,
              selected.includes(amenity.id) && styles.selected,
            ]}
            onPress={() =>
              setSelected((current) =>
                current.includes(amenity.id)
                  ? current.filter((id) => id !== amenity.id)
                  : [...current, amenity.id],
              )
            }
          >
            <Text style={styles.body}>
              {selected.includes(amenity.id) ? "✓ " : ""}
              {amenity.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Action
        label={state.busy ? "Saving..." : "Save Changes"}
        disabled={state.busy}
        onPress={() =>
          void state.run(
            () => updatePropertyAmenities(state.id, state.ownerId, selected),
            { success: "Amenities updated." },
          )
        }
      />
    </ManagementFrame>
  );
}

export function ManagePhotosScreen() {
  const state = usePropertyManagement();
  const photos = state.property?.property_images ?? [];
  const addPhotos = () =>
    state.run(async () => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new ManagementError("Please allow iStay to access your photos.");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 8 - photos.length,
      });
      if (result.canceled) return;
      await uploadPropertyImages(
        state.id,
        state.ownerId,
        result.assets.map((asset, index) => ({
          id: `${Date.now()}-${index}`,
          uri: asset.uri,
          mimeType: asset.mimeType,
        })),
      );
    });
  return (
    <ManagementFrame title="Manage Photos" state={state}>
      <Text style={styles.body}>
        {photos.length}/8 photos · Maximum 5 MB per photo
      </Text>
      {!photos.length && (
        <Text style={styles.body}>
          No photos yet. Add photos to show renters your property.
        </Text>
      )}
      {photos.map((photo) => (
        <View key={photo.id} style={styles.card}>
          <Image
            source={{ uri: photo.image_url }}
            style={styles.image}
            contentFit="cover"
          />
          <Text style={styles.body}>
            {photo.is_cover ? "Cover photo" : "Property photo"}
          </Text>
          {!photo.is_cover && (
            <Action
              label="Set Cover Photo"
              secondary
              disabled={state.busy}
              onPress={() =>
                void state.run(() =>
                  setPropertyCoverImage(state.id, state.ownerId, photo.id),
                )
              }
            />
          )}
          <Action
            label="Remove Photo"
            danger
            disabled={state.busy}
            onPress={() =>
              void state.run(
                () => deletePropertyImage(state.id, state.ownerId, photo.id),
                {
                  confirmation: [
                    "Remove Photo",
                    "Remove this property photo? This cannot be undone.",
                  ],
                },
              )
            }
          />
        </View>
      ))}
      <Action
        label={state.busy ? "Updating..." : "Add Photos"}
        disabled={state.busy || photos.length >= 8}
        onPress={() => void addPhotos()}
      />
    </ManagementFrame>
  );
}
