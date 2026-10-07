import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DiscoveryState } from "../../../src/components/tenant-listings";
import {
  fetchTenantProperty,
  rentLabel,
  TenantProperty,
} from "../../../src/services/tenant-discovery.service";
import { useTenantFavorites } from "../../../src/hooks/use-tenant-favorites";

export default function PropertyDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const saved = useTenantFavorites();
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
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tenant)/(tabs)")
          }
        >
          <Ionicons name="arrow-back" size={26} color="#172554" />
        </Pressable>
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
          <Text style={styles.body}>
            This listing is unavailable or the property link is invalid.
          </Text>
        )}
        {property && (
          <>
            <Text style={styles.title}>{property.name}</Text>
            <Text style={styles.body}>
              {property.property_type} · Verified ✓
            </Text>
            <Pressable
              disabled={!saved.ready || saved.busy.includes(id)}
              accessibilityLabel={
                saved.ids.includes(id) ? "Remove favorite" : "Save favorite"
              }
              onPress={() => {
                void saved.toggle(id);
              }}
            >
              <Text style={styles.price}>
                {saved.busy.includes(id)
                  ? "Saving…"
                  : saved.ids.includes(id)
                    ? "♥ Saved — remove favorite"
                    : "♡ Save to Favorites"}
              </Text>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {property.property_images.length ? (
                property.property_images.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.image_url }}
                    style={styles.photo}
                  />
                ))
              ) : (
                <View
                  style={[
                    styles.photo,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Image
                    source={require("../../../assets/images/logo_gray.png")}
                    style={{ width: 65, height: 65 }}
                  />
                  <Text>No photo yet</Text>
                </View>
              )}
            </ScrollView>
            <Text style={styles.price}>{rentLabel(property.monthly_rent)}</Text>
            <Pressable
              accessibilityLabel="Apply to this property"
              onPress={() => router.push({ pathname: "/(tenant)/property/apply", params: { propertyId: property.id } })}
              style={{ backgroundColor: "#1D4ED8", padding: 14, borderRadius: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Apply</Text>
            </Pressable>
            <Text style={styles.body}>
              Security deposit:{" "}
              {property.security_deposit == null
                ? "Not specified"
                : `₱${property.security_deposit.toLocaleString("en-PH")}`}
            </Text>
            <Text style={styles.body}>
              {[
                property.address,
                property.barangay,
                property.city,
                property.province,
              ]
                .filter(Boolean)
                .join(", ")}
            </Text>
            <Text style={styles.heading}>About this property</Text>
            <Text style={styles.body}>
              {property.description || "No description provided."}
            </Text>
            <Text style={styles.heading}>Utilities</Text>
            {[
              ["Electricity", property.electricity_included],
              ["Water", property.water_included],
              ["Internet", property.internet_included],
            ].map(([name, included]) => (
              <Text key={String(name)} style={styles.body}>
                {name}: {included ? "Included" : "Not included"}
              </Text>
            ))}
            <Text style={styles.heading}>Amenities</Text>
            {property.property_amenities.length ? (
              property.property_amenities
                .flatMap((a) =>
                  a.amenities
                    ? Array.isArray(a.amenities)
                      ? a.amenities
                      : [a.amenities]
                    : [],
                )
                .map((a) => (
                  <View key={a.id} style={{ flexDirection: "row", gap: 8 }}>
                    {a.icon && a.icon in Ionicons.glyphMap && (
                      <Ionicons
                        name={a.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color="#64748B"
                      />
                    )}
                    <Text style={styles.body}>{a.name}</Text>
                  </View>
                ))
            ) : (
              <Text style={styles.body}>No amenities listed.</Text>
            )}
            <Text style={styles.heading}>Available rooms</Text>
            {property.rooms.length ? (
              property.rooms.map((room) => (
                <View key={room.id} style={styles.room}>
                  <Text style={styles.heading}>{room.name}</Text>
                  {!!room.description && (
                    <Text style={styles.body}>{room.description}</Text>
                  )}
                  <Text style={styles.price}>
                    {rentLabel(room.monthly_rent)}
                  </Text>
                  <Text style={styles.body}>
                    Capacity: {room.capacity} · Available slots:{" "}
                    {room.available_slots}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.body}>No rooms are currently available.</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: "#0F172A" },
  heading: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginTop: 12 },
  body: { color: "#64748B", fontSize: 14, lineHeight: 21 },
  price: { color: "#1D4ED8", fontSize: 18, fontWeight: "700" },
  photo: {
    width: 280,
    height: 190,
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
    marginRight: 12,
  },
  room: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
});
