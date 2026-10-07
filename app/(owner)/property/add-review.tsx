import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "../../../src/auth/useAuth";
import {
  submitProperty,
  parseRooms,
  parseAmenities,
  type PropertyPhoto,
} from "../../../src/services/property.service";

type SelectedPhoto = PropertyPhoto;

type Room = {
  id: number;
  name: string;
  monthlyRent: string;
  capacity: string;
  availableSlots: string;
};

const AMENITY_NAMES: Record<string, string> = {
  wifi: "Wi-Fi",
  parking: "Parking",
  aircon: "Air Conditioning",
  bathroom: "Private Bathroom",
  kitchen: "Kitchen",
  laundry: "Laundry Area",
  security: "CCTV / Security",
  furnished: "Furnished",
  pets: "Pet Friendly",
};

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseBoolean(value: string | string[] | undefined): boolean {
  return getParam(value) === "true";
}

export default function AddReviewScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const submissionLocked = useRef(false);

  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);

  const rooms = useMemo<Room[]>(() => {
    try {
      const value = getParam(params.rooms);

      return value ? parseRooms(value) : [];
    } catch {
      return [];
    }
  }, [params.rooms]);

  const amenities = useMemo<string[]>(() => {
    try {
      const value = getParam(params.amenities);

      return value ? parseAmenities(value) : [];
    } catch {
      return [];
    }
  }, [params.amenities]);

  const pickPhotos = async () => {
    if (submissionLocked.current) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow iStay to access your photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8,
    });

    if (result.canceled || submissionLocked.current) return;

    const newPhotos = result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}`,
      uri: asset.uri,
      mimeType: asset.mimeType,
    }));

    setPhotos((current) => {
      const updated = [...current, ...newPhotos].slice(0, 8);

      if (!coverPhotoId && updated.length > 0) {
        setCoverPhotoId(updated[0].id);
      }

      return updated;
    });
  };

  const removePhoto = (id: string) => {
    if (submissionLocked.current) return;
    setPhotos((current) => {
      const updated = current.filter((photo) => photo.id !== id);

      if (coverPhotoId === id) {
        setCoverPhotoId(updated[0]?.id ?? null);
      }

      return updated;
    });
  };

  const handleSubmit = async () => {
    if (submissionLocked.current) return;
    if (photos.length === 0) {
      Alert.alert(
        "Add a Photo",
        "Please add at least one property photo before submitting.",
      );
      return;
    }
    submissionLocked.current = true;
    setSubmitting(true);
    let succeeded = false;
    try {
      if (!user) throw new Error("An authenticated user is required");
      await submitProperty(user.id, params, photos, coverPhotoId);
      succeeded = true;
    } catch (error) {
      console.error("Failed to submit property:", error);
      Alert.alert(
        "Submission Failed",
        "We couldn't submit your property. Please try again.",
      );
    } finally {
      setSubmitting(false);
      // Keep successful forms locked until navigation completes.
      if (!succeeded) submissionLocked.current = false;
    }
    if (succeeded) {
      Alert.alert(
        "Property Submitted",
        "Property submitted successfully. Your listing is pending verification.",
      );
      // Remove the completed form stack before replacing with Your Listings.
      if (router.canDismiss()) router.dismissAll();
      router.replace("/(owner)/(tabs)/properties");
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          disabled={submitting}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>

        <Text style={styles.headerTitle}>Add Property</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepText}>STEP 5 OF 5</Text>

        <Text style={styles.title}>Photos & Review</Text>

        <Text style={styles.subtitle}>
          Add photos and review your property before submitting it.
        </Text>

        <View style={styles.progressBackground}>
          <View style={styles.progressFill} />
        </View>

        {/* Photos */}

        <Text style={styles.sectionTitle}>Property Photos</Text>

        <Text style={styles.sectionDescription}>
          Add up to 8 photos. Choose the best image as your cover photo.
        </Text>

        <Pressable
          style={styles.photoButton}
          disabled={submitting}
          onPress={pickPhotos}
        >
          <Ionicons name="images-outline" size={25} color="#2563EB" />

          <Text style={styles.photoButtonTitle}>Add Photos</Text>

          <Text style={styles.photoButtonSubtitle}>
            {photos.length}/8 selected
          </Text>
        </Pressable>

        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoList}
          >
            {photos.map((photo) => {
              const isCover = photo.id === coverPhotoId;

              return (
                <View key={photo.id} style={styles.photoCard}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photo}
                    contentFit="cover"
                  />

                  {isCover && (
                    <View style={styles.coverBadge}>
                      <Ionicons name="star" size={12} color="#FFFFFF" />

                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}

                  <Pressable
                    style={styles.removePhotoButton}
                    disabled={submitting}
                    onPress={() => removePhoto(photo.id)}
                  >
                    <Ionicons name="close" size={17} color="#FFFFFF" />
                  </Pressable>

                  {!isCover && (
                    <Pressable
                      style={styles.setCoverButton}
                      disabled={submitting}
                      onPress={() =>
                        !submissionLocked.current && setCoverPhotoId(photo.id)
                      }
                    >
                      <Text style={styles.setCoverText}>Set Cover</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Property */}

        <ReviewSection title="Property">
          <ReviewRow label="Name" value={getParam(params.propertyName)} />

          <ReviewRow label="Type" value={getParam(params.propertyType)} />

          <ReviewRow
            label="Location"
            value={[
              getParam(params.barangay),
              getParam(params.city),
              getParam(params.province),
            ]
              .filter(Boolean)
              .join(", ")}
          />

          <ReviewRow label="Address" value={getParam(params.address)} />
        </ReviewSection>

        {/* Pricing */}

        <ReviewSection title="Pricing">
          <ReviewRow
            label="Monthly Rent"
            value={`₱${Number(getParam(params.monthlyRent)).toLocaleString()}`}
          />

          <ReviewRow
            label="Security Deposit"
            value={`₱${Number(
              getParam(params.securityDeposit),
            ).toLocaleString()}`}
          />
        </ReviewSection>

        {/* Utilities */}

        <ReviewSection title="Utilities Included">
          <ReviewRow
            label="Electricity"
            value={
              parseBoolean(params.electricityIncluded)
                ? "Included"
                : "Not Included"
            }
          />

          <ReviewRow
            label="Water"
            value={
              parseBoolean(params.waterIncluded) ? "Included" : "Not Included"
            }
          />

          <ReviewRow
            label="Internet"
            value={
              parseBoolean(params.internetIncluded)
                ? "Included"
                : "Not Included"
            }
          />
        </ReviewSection>

        {/* Rooms */}

        <ReviewSection title="Rooms">
          {rooms.length === 0 ? (
            <Text style={styles.emptyText}>No rooms found.</Text>
          ) : (
            rooms.map((room, index) => (
              <View key={room.id} style={styles.roomReview}>
                <Text style={styles.roomName}>
                  {room.name || `Room ${index + 1}`}
                </Text>

                <Text style={styles.roomInfo}>
                  ₱{Number(room.monthlyRent).toLocaleString()}
                  /month
                </Text>

                <Text style={styles.roomInfo}>
                  Capacity: {room.capacity} • Available: {room.availableSlots}
                </Text>
              </View>
            ))
          )}
        </ReviewSection>

        {/* Amenities */}

        <ReviewSection title="Amenities">
          {amenities.length === 0 ? (
            <Text style={styles.emptyText}>No amenities selected.</Text>
          ) : (
            <View style={styles.amenityTags}>
              {amenities.map((amenity) => (
                <View key={amenity} style={styles.amenityTag}>
                  <Ionicons name="checkmark" size={14} color="#2563EB" />

                  <Text style={styles.amenityTagText}>
                    {AMENITY_NAMES[amenity] ?? amenity}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ReviewSection>

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#2563EB"
          />

          <Text style={styles.noticeText}>
            Your property will be submitted for verification before it becomes
            publicly available.
          </Text>
        </View>

        <Pressable
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          disabled={submitting}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.submitText}>
            {submitting ? "Submitting..." : "Submit Property"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.reviewSection}>
      <Text style={styles.reviewTitle}>{title}</Text>

      {children}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>

      <Text style={styles.reviewValue}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 60,
  },

  stepText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 5,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    marginTop: 5,
  },

  progressBackground: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 28,
    overflow: "hidden",
  },

  progressFill: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2563EB",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
  },

  photoButton: {
    minHeight: 120,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#93C5FD",
    borderRadius: 16,
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
  },

  photoButtonTitle: {
    marginTop: 7,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },

  photoButtonSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },

  photoList: {
    gap: 12,
    paddingVertical: 16,
  },

  photoCard: {
    width: 160,
    height: 130,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  coverBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },

  coverBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  removePhotoButton: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },

  setCoverButton: {
    position: "absolute",
    bottom: 7,
    left: 7,
    right: 7,
    backgroundColor: "rgba(15,23,42,0.78)",
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },

  setCoverText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  reviewSection: {
    marginTop: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  reviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  reviewLabel: {
    fontSize: 12,
    color: "#64748B",
  },

  reviewValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },

  roomReview: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  roomName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },

  roomInfo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  amenityTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  amenityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  amenityTagText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "600",
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
  },

  notice: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },

  noticeText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
  },

  submitButton: {
    minHeight: 54,
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
