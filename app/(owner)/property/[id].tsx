import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/auth/useAuth";
import {
  getManagedProperty,
  isPropertyId,
  type ManagedProperty,
} from "../../../src/services/property.service";

import { updateOwnerListingStatus } from "../../../src/services/property-management.service";
import {
  confirmChange,
  feedback,
} from "../../../src/components/property-management/shared";

const money = (value: number | string | null) =>
  `₱${Number(value ?? 0).toLocaleString()}`;
const STATUS_NAMES: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
  rejected: "Rejected",
};
const statusName = (status: string) => STATUS_NAMES[status] ?? status;

export default function ManagePropertyScreen() {
  const { id: routeId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof routeId === "string" ? routeId : "";
  const { user, loading: authLoading } = useAuth();
  const ownerId = user?.id;
  const [result, setResult] = useState<{
    id: string;
    ownerId: string;
    property: ManagedProperty;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [savingStatus, setSavingStatus] = useState(false);
  const statusLock = useRef(false);
  const identity = `${id}:${ownerId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setResult(null);
      setError(null);
      setLoading(true);
      const load = async () => {
        if (authLoading) return;
        try {
          if (!isPropertyId(id))
            throw new Error("This property link is invalid.");
          if (!ownerId)
            throw new Error(
              "Please sign in as the landlord to manage this property.",
            );
          const property = await getManagedProperty(id, ownerId);
          if (!property)
            throw new Error(
              "This property is unavailable or does not belong to your account.",
            );
          if (active) setResult({ id, ownerId, property });
        } catch (cause) {
          console.error("Failed to load managed property:", cause);
          if (active)
            setError(
              !isPropertyId(id)
                ? "This property link is invalid."
                : !ownerId
                  ? "Please sign in as the landlord to manage this property."
                  : "We couldn't load this property. It may be unavailable or belong to another account.",
            );
        } finally {
          if (active) setLoading(false);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [id, ownerId, authLoading, attempt]),
  );

  // Never render a previous account's or previous route's fetched property.
  const property =
    result?.id === id && result.ownerId === ownerId ? result.property : null;
  const photos = property?.property_images ?? [];
  const cover = photos.find((photo) => photo.is_cover) ?? photos[0];
  const rooms = property?.rooms ?? [];
  const address = property
    ? [property.address, property.barangay, property.city, property.province]
        .filter(Boolean)
        .join(", ")
    : "";
  const amenityNames =
    property?.property_amenities.flatMap((relation) => {
      const amenities = relation.amenities;
      return (
        Array.isArray(amenities) ? amenities : amenities ? [amenities] : []
      ).map((amenity) => amenity.name);
    }) ?? [];

  const changeStatus = async () => {
    if (!property || !ownerId || statusLock.current) return;
    const next = property.status === "active" ? "inactive" : "active";
    statusLock.current = true;
    setSavingStatus(true);
    try {
      if (
        !(await confirmChange(
          next === "active" ? "Reactivate Listing" : "Deactivate Listing",
          next === "active"
            ? "Make this listing active again?"
            : "Make this listing inactive?",
        ))
      )
        return;
      if (identityRef.current !== identity) return;
      await updateOwnerListingStatus(id, ownerId, next);
      if (identityRef.current === identity)
        setAttempt((current) => current + 1);
    } catch (cause) {
      console.error("Listing status update failed:", cause);
      if (identityRef.current === identity) {
        feedback(
          "Change failed",
          "We couldn't update the listing status. Refresh and try again.",
        );
        setAttempt((current) => current + 1);
      }
    } finally {
      statusLock.current = false;
      setSavingStatus(false);
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
          accessibilityLabel="Back"
          style={styles.backButton}
          disabled={savingStatus}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(owner)/(tabs)/properties")
          }
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Property</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading || authLoading ? (
          <ActivityIndicator
            style={styles.loading}
            size="large"
            color="#2563EB"
          />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Property unavailable</Text>
            <Text style={styles.body}>{error}</Text>
            <Pressable
              style={styles.button}
              onPress={() => setAttempt((current) => current + 1)}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          </View>
        ) : property ? (
          <>
            <View style={styles.overview}>
              {cover ? (
                <Image
                  source={{ uri: cover.image_url }}
                  style={styles.cover}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.cover, styles.noPhoto]}>
                  <Ionicons name="business-outline" size={40} color="#94A3B8" />
                  <Text style={styles.body}>No photos yet</Text>
                </View>
              )}
              <View style={styles.overviewContent}>
                <Text style={styles.title}>{property.name}</Text>
                <Text style={styles.body}>{address}</Text>
                <Text style={styles.price}>
                  {money(property.monthly_rent)}
                  <Text style={styles.body}> / month</Text>
                </Text>
                <Text style={styles.body}>{property.property_type}</Text>
                <View style={styles.tags}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {statusName(property.status)}
                    </Text>
                  </View>
                  <Text style={styles.verification}>
                    {property.verified ? "✓ Verified" : "Not verified"}
                  </Text>
                </View>
              </View>
            </View>
            <Section
              title="Property Information"
              action="Edit Property"
              onAction={() =>
                router.push({
                  pathname: "/(owner)/property/manage/[id]/edit",
                  params: { id },
                })
              }
              disabled={savingStatus}
            >
              <Text style={styles.body}>
                {property.description || "No description provided."}
              </Text>
              <Text style={styles.body}>Address: {address}</Text>
              <Text style={styles.body}>
                Security deposit: {money(property.security_deposit)}
              </Text>
              <Text style={styles.body}>
                Utilities included:{" "}
                {[
                  property.electricity_included && "Electricity",
                  property.water_included && "Water",
                  property.internet_included && "Internet / Wi-Fi",
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </Text>
            </Section>
            <Section
              title="Rooms"
              action="Manage Rooms"
              onAction={() =>
                router.push({
                  pathname: "/(owner)/property/manage/[id]/rooms",
                  params: { id },
                })
              }
              disabled={savingStatus}
            >
              <Text style={styles.body}>Rooms: {rooms.length}</Text>
              <Text style={styles.body}>
                Total capacity:{" "}
                {rooms.reduce(
                  (total, room) => total + Number(room.capacity),
                  0,
                )}
              </Text>
              <Text style={styles.body}>
                Total available slots:{" "}
                {rooms.reduce(
                  (total, room) => total + Number(room.available_slots),
                  0,
                )}
              </Text>
            </Section>
            <Section
              title="Amenities"
              action="Manage Amenities"
              onAction={() =>
                router.push({
                  pathname: "/(owner)/property/manage/[id]/amenities",
                  params: { id },
                })
              }
              disabled={savingStatus}
            >
              <Text style={styles.body}>
                {amenityNames.join(", ") || "No amenities selected."}
              </Text>
            </Section>
            <Section
              title="Photos"
              action="Manage Photos"
              onAction={() =>
                router.push({
                  pathname: "/(owner)/property/manage/[id]/photos",
                  params: { id },
                })
              }
              disabled={savingStatus}
            >
              <Text style={styles.body}>
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </Text>
              {photos.length > 0 && (
                <View style={styles.thumbnails}>
                  {photos.map((photo) => (
                    <Image
                      key={photo.id}
                      source={{ uri: photo.image_url }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />
                  ))}
                </View>
              )}
            </Section>
            <Section title="Listing Status">
              {property.status === "pending" && (
                <Text style={styles.body}>Pending Verification</Text>
              )}
              {property.status === "rejected" && (
                <Text style={styles.body}>
                  Rejected. Administrator approval is required before
                  activation.
                </Text>
              )}
              {(property.status === "active" ||
                property.status === "inactive") && (
                <Pressable
                  style={[styles.button, savingStatus && { opacity: 0.5 }]}
                  disabled={
                    savingStatus ||
                    (property.status === "inactive" && !property.verified)
                  }
                  onPress={() => void changeStatus()}
                >
                  <Text style={styles.buttonText}>
                    {savingStatus
                      ? "Saving..."
                      : property.status === "active"
                        ? "Deactivate Listing"
                        : "Reactivate Listing"}
                  </Text>
                </Pressable>
              )}
              {property.status === "inactive" && !property.verified && (
                <Text style={styles.body}>
                  Administrator verification is required before reactivation.
                </Text>
              )}
              <View style={styles.tags}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {statusName(property.status)}
                  </Text>
                </View>
              </View>
            </Section>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  action,
  onAction,
  disabled,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      {action && (
        <Pressable style={styles.button} disabled={disabled} onPress={onAction}>
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
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
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  loading: { marginVertical: 40 },
  card: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    gap: 8,
  },
  overview: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    overflow: "hidden",
  },
  cover: { width: "100%", height: 180, backgroundColor: "#E2E8F0" },
  noPhoto: { alignItems: "center", justifyContent: "center", gap: 8 },
  overviewContent: { padding: 20, gap: 8 },
  title: { fontSize: 23, fontWeight: "800", color: "#0F172A" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  body: { fontSize: 14, lineHeight: 21, color: "#64748B" },
  price: { fontSize: 20, fontWeight: "800", color: "#1D4ED8" },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: "#1D4ED8", fontSize: 12, fontWeight: "700" },
  verification: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  thumbnails: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
});
