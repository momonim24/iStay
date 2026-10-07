import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { card, colors, radius, spacing, type } from "../constants/ui";
import {
  TenantProperty,
  propertyLocation,
} from "../services/tenant-discovery.service";
import { Button, Notice } from "./ui";

type CardProps = {
  property: TenantProperty;
  favorite: boolean;
  busy?: boolean;
  onFavorite: () => void;
  // Narrow card for horizontal carousels.
  compact?: boolean;
};

export function PropertyPhoto({
  uri,
  height,
}: {
  uri: string | null;
  height: number;
}) {
  return uri ? (
    <Image source={{ uri }} style={[styles.image, { height }]} />
  ) : (
    <View style={[styles.image, styles.placeholder, { height }]}>
      <Image
        source={require("../../assets/images/logo_gray.png")}
        style={{ width: 52, height: 52 }}
        resizeMode="contain"
      />
      <Text style={type.caption}>No photo yet</Text>
    </View>
  );
}

export function Price({ value, large }: { value: number; large?: boolean }) {
  return (
    <Text style={[type.price, large && { fontSize: 24 }]}>
      ₱{Number(value).toLocaleString("en-PH")}
      <Text style={styles.perMonth}> / month</Text>
    </Text>
  );
}

export function ListingCard({
  property,
  favorite,
  busy,
  onFavorite,
  compact = false,
}: CardProps) {
  const slots = property.rooms.reduce((sum, r) => sum + r.available_slots, 0);
  return (
    <Pressable
      style={[styles.card, compact && styles.compact]}
      onPress={() =>
        router.push({
          pathname: "/(tenant)/property/[id]",
          params: { id: property.id },
        })
      }
    >
      <View>
        <PropertyPhoto uri={property.image} height={compact ? 140 : 180} />
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{property.property_type}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Remove favorite" : "Save favorite"}
          disabled={busy}
          hitSlop={6}
          style={styles.heart}
          onPress={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={20}
            color={favorite ? colors.heart : colors.brandDark}
          />
        </Pressable>
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={[type.subheading, { flexShrink: 1 }]} numberOfLines={1}>
            {property.name}
          </Text>
          {property.verified && (
            <Ionicons
              accessibilityLabel="Verified listing"
              name="shield-checkmark"
              size={15}
              color={colors.brand}
            />
          )}
        </View>
        <View style={styles.row}>
          <Ionicons
            name="location-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={[type.caption, { flexShrink: 1 }]} numberOfLines={1}>
            {propertyLocation(property)}
          </Text>
        </View>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Price value={property.monthly_rent} />
          <Text style={type.caption}>
            {slots} {slots === 1 ? "slot" : "slots"} open
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function DiscoveryState({
  loading,
  error,
  empty,
  onRetry,
  emptyTitle = "No properties to show yet",
  emptyMessage = "New verified listings will appear here.",
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  onRetry: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (loading)
    return (
      <View style={styles.loading}>
        <Text style={type.body}>Loading properties…</Text>
      </View>
    );
  if (error)
    return (
      <Notice icon="cloud-offline-outline" title={error} tone="danger">
        <Button title="Retry" variant="secondary" onPress={onRetry} />
      </Notice>
    );
  if (empty)
    return (
      <Notice icon="home-outline" title={emptyTitle} message={emptyMessage} />
    );
  return null;
}

const styles = StyleSheet.create({
  card: { ...card, overflow: "hidden", marginBottom: spacing.lg },
  compact: { width: 232, marginBottom: 0, marginRight: spacing.md },
  image: { width: "100%", backgroundColor: colors.placeholder },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 6 },
  info: { padding: spacing.md, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  perMonth: { fontSize: 12, fontWeight: "500", color: colors.textMuted },
  typeTag: {
    position: "absolute",
    left: 10,
    top: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  typeText: { fontSize: 11, fontWeight: "700", color: colors.brandDark },
  heart: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  loading: { paddingVertical: spacing.xxl, alignItems: "center" },
});
