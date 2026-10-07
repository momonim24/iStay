import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequireAuth } from "../../../src/auth/use-require-auth";
import { useAuth } from "../../../src/auth/useAuth";
import {
  DiscoveryState,
  Price,
  PropertyPhoto,
} from "../../../src/components/tenant-listings";
import {
  Badge,
  Button,
  IconButton,
  Notice,
  type IconName,
} from "../../../src/components/ui";
import {
  card,
  colors,
  radius,
  spacing,
  type,
} from "../../../src/constants/ui";
import { useTenantFavorites } from "../../../src/hooks/use-tenant-favorites";
import { ownPropertyMessage } from "../../../src/services/application.service";
import {
  fetchTenantProperty,
  TenantProperty,
} from "../../../src/services/tenant-discovery.service";

export default function PropertyDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const saved = useTenantFavorites();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { width } = useWindowDimensions();
  const [property, setProperty] = useState<TenantProperty | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setProperty(null);
      setLoading(true);
      setError("");
      void fetchTenantProperty(id)
        .then((p) => {
          if (active) setProperty(p);
        })
        .catch((e: unknown) => {
          if (active)
            setError(
              e instanceof Error ? e.message : "Unable to load this property.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [id, revision]),
  );
  const own = !!property && !!user && property.owner_id === user.id;
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tenant)/(tabs)");
  // Guests are asked to log in, then continue into this Apply flow.
  const apply = (roomId?: string) => {
    if (!property) return;
    const next = {
      pathname: "/(tenant)/property/apply",
      params: roomId
        ? { propertyId: property.id, roomId }
        : { propertyId: property.id },
    } as const;
    if (
      requireAuth(
        roomId
          ? "Log in to apply for this room."
          : "Log in to apply for this property.",
        next,
      )
    )
      router.push(next);
  };
  const favorite = saved.ids.includes(id);
  const photoWidth = Math.min(width, 720);
  const amenities = (property?.property_amenities ?? []).flatMap((a) =>
    a.amenities ? (Array.isArray(a.amenities) ? a.amenities : [a.amenities]) : [],
  );
  const utilities: [string, IconName, boolean][] = property
    ? [
        ["Electricity", "flash-outline", property.electricity_included],
        ["Water", "water-outline", property.water_included],
        ["Internet", "wifi-outline", property.internet_included],
      ]
    : [];
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          {property && property.property_images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {property.property_images.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.image_url }}
                  style={[styles.photo, { width: photoWidth }]}
                />
              ))}
            </ScrollView>
          ) : (
            <PropertyPhoto uri={null} height={property ? 260 : 96} />
          )}
          <View style={styles.overlay}>
            <IconButton
              icon="arrow-back"
              accessibilityLabel="Go back"
              onPress={back}
            />
            {property && (
              <IconButton
                icon={favorite ? "heart" : "heart-outline"}
                color={favorite ? colors.heart : colors.brandDark}
                accessibilityLabel={
                  favorite ? "Remove favorite" : "Save favorite"
                }
                disabled={!saved.ready || saved.busy.includes(id)}
                onPress={() => void saved.toggle(id)}
              />
            )}
          </View>
          {property && property.property_images.length > 1 && (
            <View style={styles.count}>
              <Ionicons name="images-outline" size={13} color={colors.surface} />
              <Text style={styles.countText}>
                {property.property_images.length} photos
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <DiscoveryState
            loading={loading}
            error={error}
            empty={false}
            onRetry={() => setRevision((r) => r + 1)}
          />
          {!!saved.error && (
            <DiscoveryState
              loading={false}
              error={saved.error}
              empty={false}
              onRetry={saved.retry}
            />
          )}
          {!loading && !error && !property && (
            <Notice
              icon="alert-circle-outline"
              title="This listing is unavailable"
              message="It may have been removed, or the link is invalid."
            >
              <Button title="Browse properties" onPress={back} />
            </Notice>
          )}
          {property && (
            <>
              <Text style={type.title}>{property.name}</Text>
              <View style={styles.row}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={[type.body, { flex: 1 }]}>
                  {[
                    property.address,
                    property.barangay,
                    property.city,
                    property.province,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
              <Price value={property.monthly_rent} large />
              <View style={styles.wrap}>
                <Badge
                  label="Verified"
                  icon="shield-checkmark-outline"
                  color={colors.brand}
                  background={colors.brandSoft}
                />
                <Badge
                  label={property.property_type}
                  icon="business-outline"
                  color={colors.neutral}
                  background={colors.neutralSoft}
                />
              </View>

              <Text style={styles.heading}>About this property</Text>
              <Text style={type.body}>
                {property.description || "No description provided."}
              </Text>

              <Text style={styles.heading}>Costs and utilities</Text>
              <View style={styles.panel}>
                <View style={styles.line}>
                  <Ionicons
                    name="wallet-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text style={[type.body, { flex: 1 }]}>Security deposit</Text>
                  <Text style={styles.value}>
                    {property.security_deposit == null
                      ? "Not specified"
                      : `₱${property.security_deposit.toLocaleString("en-PH")}`}
                  </Text>
                </View>
                {utilities.map(([name, icon, included]) => (
                  <View key={name} style={styles.line}>
                    <Ionicons name={icon} size={18} color={colors.textMuted} />
                    <Text style={[type.body, { flex: 1 }]}>{name}</Text>
                    <Text
                      style={[
                        styles.value,
                        !included && { color: colors.textMuted },
                      ]}
                    >
                      {included ? "Included" : "Not included"}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.heading}>Amenities</Text>
              {amenities.length ? (
                <View style={styles.wrap}>
                  {amenities.map((a) => (
                    <View key={a.id} style={styles.amenity}>
                      {a.icon && a.icon in Ionicons.glyphMap && (
                        <Ionicons
                          name={a.icon as IconName}
                          size={15}
                          color={colors.textMuted}
                        />
                      )}
                      <Text style={styles.amenityText}>{a.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={type.body}>No amenities listed.</Text>
              )}

              <Text style={styles.heading}>Available rooms</Text>
              {own && (
                <Notice
                  icon="information-circle-outline"
                  title={ownPropertyMessage}
                  message="This is how tenants see your listing."
                />
              )}
              {property.rooms.length ? (
                property.rooms.map((room) => (
                  <View key={room.id} style={styles.room}>
                    <View style={styles.roomHeader}>
                      <Text style={[type.subheading, { flex: 1 }]}>
                        {room.name}
                      </Text>
                      <Price value={room.monthly_rent} />
                    </View>
                    {!!room.description && (
                      <Text style={type.body}>{room.description}</Text>
                    )}
                    <View style={styles.wrap}>
                      <View style={styles.row}>
                        <Ionicons
                          name="people-outline"
                          size={15}
                          color={colors.textMuted}
                        />
                        <Text style={type.caption}>
                          Capacity: {room.capacity}
                        </Text>
                      </View>
                      <View style={styles.row}>
                        <Ionicons
                          name="bed-outline"
                          size={15}
                          color={colors.textMuted}
                        />
                        <Text style={type.caption}>
                          Available slots: {room.available_slots}
                        </Text>
                      </View>
                    </View>
                    {!own && (
                      <Button
                        title="Apply for this room"
                        variant="secondary"
                        accessibilityLabel={`Apply for ${room.name}`}
                        onPress={() => apply(room.id)}
                      />
                    )}
                  </View>
                ))
              ) : (
                <Text style={type.body}>No rooms are currently available.</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
      {property && !own && (
        <View style={styles.bar}>
          <View style={{ flex: 1 }}>
            <Text style={type.caption}>Monthly rent from</Text>
            <Price value={property.monthly_rent} />
          </View>
          <Button
            title="Apply"
            accessibilityLabel="Apply to this property"
            disabled={!property.rooms.length}
            style={{ minWidth: 132 }}
            onPress={() => apply()}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingBottom: spacing.xxl },
  photo: { height: 280, backgroundColor: colors.placeholder },
  overlay: {
    position: "absolute",
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  count: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  countText: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  content: { padding: spacing.xl, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  heading: { ...type.heading, marginTop: spacing.lg },
  panel: { ...card, paddingHorizontal: spacing.lg },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  value: { fontSize: 14, fontWeight: "600", color: colors.text },
  amenity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralSoft,
  },
  amenityText: { fontSize: 13, color: colors.text },
  room: { ...card, padding: spacing.lg, gap: spacing.sm },
  roomHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
