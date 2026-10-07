import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../src/auth/useAuth";
import { requireSupabase } from "../../src/lib/supabase";

type Property = {
  id: string;
  name: string;
  city: string;
  province: string;
  monthly_rent: number;
  status: string;
  verified: boolean;
  image: string | null;
};

export default function OwnerPropertiesScreen() {
  const { user } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      const loadProperties = async () => {
        setLoading(true);

        const { data, error } = await requireSupabase()
          .from("properties")
          .select(`
            id,
            name,
            city,
            province,
            monthly_rent,
            status,
            verified,
            property_images (
              image_url,
              is_cover
            )
          `)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to load owner properties:", error);
          setLoading(false);
          return;
        }

        const formatted: Property[] = (data ?? []).map((property) => {
          const images = property.property_images ?? [];

          const cover =
            images.find((image) => image.is_cover) ??
            images[0];

          return {
            id: property.id,
            name: property.name,
            city: property.city,
            province: property.province,
            monthly_rent: Number(property.monthly_rent),
            status: property.status,
            verified: property.verified,
            image: cover?.image_url ?? null,
          };
        });

        setProperties(formatted);
        setLoading(false);
      };

      void loadProperties();
    }, [user]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#0F172A"
            />
          </Pressable>

          <Pressable
            style={styles.addTopButton}
            onPress={() => {
              // Add Property screen comes next.
            }}
          >
            <Ionicons name="add" size={23} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text style={styles.title}>Your Listings</Text>

        <Text style={styles.subtitle}>
          Manage your rental properties on iStay.
        </Text>

        {/* LOADING */}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        )}

        {/* EMPTY */}

        {!loading && properties.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="business-outline"
                size={36}
                color="#2563EB"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No properties yet
            </Text>

            <Text style={styles.emptyDescription}>
              Add your first rental property to start receiving
              applications from renters.
            </Text>
          </View>
        )}

        {/* PROPERTIES */}

        {!loading &&
          properties.map((property) => (
            <View
              key={property.id}
              style={styles.propertyCard}
            >
              {property.image ? (
                <Image
                  source={{ uri: property.image }}
                  style={styles.propertyImage}
                />
              ) : (
                <View
                  style={[
                    styles.propertyImage,
                    styles.noImage,
                  ]}
                >
                  <Image
                    source={require("../../assets/images/logo_gray.png")}
                    style={styles.placeholderLogo}
                    resizeMode="contain"
                  />
                </View>
              )}

              <View style={styles.propertyContent}>
                <View style={styles.titleRow}>
                  <Text
                    style={styles.propertyName}
                    numberOfLines={1}
                  >
                    {property.name}
                  </Text>

                  {property.verified && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#2563EB"
                    />
                  )}
                </View>

                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color="#64748B"
                  />

                  <Text style={styles.location}>
                    {property.city}, {property.province}
                  </Text>
                </View>

                <Text style={styles.price}>
                  ₱{property.monthly_rent.toLocaleString()}
                  <Text style={styles.perMonth}>
                    {" "}
                    / month
                  </Text>
                </Text>

                <View style={styles.statusRow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {property.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable style={styles.secondaryButton}>
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color="#1D4ED8"
                    />

                    <Text style={styles.secondaryButtonText}>
                      Edit
                    </Text>
                  </Pressable>

                  <Pressable style={styles.primaryButton}>
                    <Ionicons
                      name="settings-outline"
                      size={17}
                      color="#FFFFFF"
                    />

                    <Text style={styles.primaryButtonText}>
                      Manage
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

        {/* ADD PROPERTY */}

        {!loading && (
          <Pressable
            style={styles.addPropertyButton}
            onPress={() => {
              // We'll connect this next.
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={21}
              color="#FFFFFF"
            />

            <Text style={styles.addPropertyText}>
              Add Property
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  addTopButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 25,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 5,
    marginBottom: 24,
  },

  loadingContainer: {
    paddingVertical: 70,
    alignItems: "center",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyDescription: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 7,
  },

  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
  },

  propertyImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#E2E8F0",
  },

  noImage: {
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderLogo: {
    width: 70,
    height: 70,
  },

  propertyContent: {
    padding: 16,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  propertyName: {
    flexShrink: 1,
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "700",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 6,
  },

  location: {
    color: "#64748B",
    fontSize: 12,
  },

  price: {
    color: "#1D4ED8",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
  },

  perMonth: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
  },

  statusRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  statusBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusText: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  secondaryButton: {
    flex: 1,
    height: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  secondaryButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 13,
  },

  primaryButton: {
    flex: 1,
    height: 43,
    borderRadius: 11,
    backgroundColor: "#1D4ED8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  addPropertyButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#1D4ED8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 5,
  },

  addPropertyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});