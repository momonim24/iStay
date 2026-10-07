import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  TenantProperty,
  propertyLocation,
  rentLabel,
} from "../services/tenant-discovery.service";

export function ListingCard({
  property,
  favorite,
  busy,
  onFavorite,
}: {
  property: TenantProperty;
  favorite: boolean;
  busy?: boolean;
  onFavorite: () => void;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/(tenant)/property/[id]",
          params: { id: property.id },
        })
      }
    >
      {property.image ? (
        <Image source={{ uri: property.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Image
            source={require("../../assets/images/logo_gray.png")}
            style={{ width: 65, height: 65 }}
            resizeMode="contain"
          />
          <Text>No photo yet</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{property.name}</Text>
        <Text style={styles.secondary}>
          {property.property_type} · Verified ✓
        </Text>
        <Text style={styles.secondary}>{propertyLocation(property)}</Text>
        <Text style={styles.price}>{rentLabel(property.monthly_rent)}</Text>
        <Text style={styles.secondary}>
          {property.rooms.reduce((sum, r) => sum + r.available_slots, 0)}{" "}
          available slots
        </Text>
      </View>
      <Pressable
        accessibilityLabel={favorite ? "Remove favorite" : "Save favorite"}
        disabled={busy}
        style={styles.heart}
        onPress={(event) => {
          event.stopPropagation();
          onFavorite();
        }}
      >
        <Ionicons
          name={favorite ? "heart" : "heart-outline"}
          size={24}
          color={favorite ? "#DC2626" : "#172554"}
        />
      </Pressable>
    </Pressable>
  );
}
export function DiscoveryState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  onRetry: () => void;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <View style={{ paddingVertical: 24, gap: 12 }}>
      <Text style={styles.secondary}>
        {loading
          ? "Loading properties…"
          : error || "No properties to show yet."}
      </Text>
      {!!error && (
        <Pressable onPress={onRetry}>
          <Text style={styles.price}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
  },
  image: { width: "100%", height: 160, backgroundColor: "#E2E8F0" },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  info: { padding: 14, gap: 7 },
  name: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  secondary: { fontSize: 13, color: "#64748B" },
  price: { color: "#1D4ED8", fontSize: 16, fontWeight: "700" },
  heart: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 24,
  },
});
