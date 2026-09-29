import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../../src/auth/useAuth";
import { requireSupabase } from "../../../src/lib/supabase";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Property = {
  id: string;
  name: string;
  city: string;
  province: string;
  monthly_rent: number;
  verified: boolean;
  image?: string | null;
};

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data, error } = await requireSupabase()
        .from("profiles")
        .select("full_name, is_owner")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Failed to load profile:", error);
        return;
      }

      setFullName(data.full_name ?? "");
      setIsOwner(data.is_owner ?? false);
    };

    void loadProfile();
  }, [user]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const openSearch = () => {
    router.push("/(tenant)/(tabs)/search");
  };

  useEffect(() => {
    const loadProperties = async () => {
      setPropertiesLoading(true);

      const { data, error } = await requireSupabase()
        .from("properties")
        .select(
          `
        id,
        name,
        city,
        province,
        monthly_rent,
        verified,
        property_images (
          image_url,
          is_cover
        )
      `,
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load properties:", error);
        setPropertiesLoading(false);
        return;
      }

      const formatted: Property[] = (data ?? []).map((property) => {
        const images = property.property_images ?? [];
        const cover = images.find((image) => image.is_cover) ?? images[0];

        return {
          id: property.id,
          name: property.name,
          city: property.city,
          province: property.province,
          monthly_rent: Number(property.monthly_rent),
          verified: property.verified,
          image: cover?.image_url ?? null,
        };
      });

      setProperties(formatted);
      setPropertiesLoading(false);
    };

    void loadProperties();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>iStay</Text>

            <Text style={styles.greeting}>
              {fullName ? `Welcome, ${fullName.split(" ")[0]}!` : "Welcome!"}
            </Text>
          </View>

          <Pressable
            style={styles.notificationButton}
            onPress={() => router.push("/(tenant)/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color="#172554" />

            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroSmall}>WELCOME TO ISTAY</Text>

          <Text style={styles.heroTitle}>
            Find a place that{"\n"}feels like home.
          </Text>

          <Text style={styles.heroDescription}>
            Discover rental properties across Cavite that match your needs and
            budget.
          </Text>

          {/* SEARCH */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={21} color="#64748B" />

            <TextInput
              style={styles.searchInput}
              placeholder="Search properties, locations..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={openSearch}
            />

            <Pressable onPress={openSearch}>
              <Ionicons name="options-outline" size={22} color="#1D4ED8" />
            </Pressable>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickActions}>
          <QuickAction
            icon="sparkles-outline"
            title="Smart Match"
            onPress={() => router.push("/(tenant)/smart-match")}
          />

          <QuickAction
            icon="search-outline"
            title="Search"
            onPress={() => router.push("/(tenant)/(tabs)/search")}
          />

          <QuickAction
            icon="heart-outline"
            title="Favorites"
            onPress={() => router.push("/(tenant)/(tabs)/favorites")}
          />

          <QuickAction
            icon="document-text-outline"
            title="Applications"
            onPress={() => router.push("/(tenant)/(tabs)/applications")}
          />
        </View>

        {/* OWNER / LIST PROPERTY CARD */}
        <Pressable
          style={styles.ownerCard}
          onPress={() =>
            isOwner
              ? router.push("/(owner)/properties")
              : router.push("/(tenant)/become-owner")
          }
        >
          <View style={styles.ownerCardIcon}>
            <Ionicons
              name={isOwner ? "business-outline" : "home-outline"}
              size={27}
              color="#1D4ED8"
            />
          </View>

          <View style={styles.ownerCardContent}>
            <Text style={styles.ownerCardLabel}>
              {isOwner ? "PROPERTY MANAGEMENT" : "LIST ON ISTAY"}
            </Text>

            <Text style={styles.ownerCardTitle}>
              {isOwner ? "Manage your properties" : "Have a property to rent?"}
            </Text>

            <Text style={styles.ownerCardDescription}>
              {isOwner
                ? "View and manage your rental listings."
                : "List your property and reach renters across Cavite."}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#64748B" />
        </Pressable>

        {/* RECOMMENDED */}
        <SectionHeader
          title="Recommended for You"
          onSeeAll={() => router.push("/(tenant)/(tabs)/search")}
        />

        <Text style={styles.sectionDescription}>
          Properties you may be interested in.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              favorite={favorites.includes(property.id)}
              onFavorite={() => toggleFavorite(property.id)}
            />
          ))}
        </ScrollView>

        {/* RECENT */}
        <SectionHeader
          title="Recently Added"
          onSeeAll={() => router.push("/(tenant)/(tabs)/search")}
        />

        <Text style={styles.sectionDescription}>
          Check out the newest rental listings.
        </Text>

        <View style={styles.recentList}>
          {properties.slice(0, 3).map((property) => (
            <RecentPropertyCard
              key={property.id}
              property={property}
              favorite={favorites.includes(property.id)}
              onFavorite={() => toggleFavorite(property.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={23} color="#1D4ED8" />
      </View>

      <Text style={styles.quickTitle}>{title}</Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <Pressable onPress={onSeeAll}>
        <Text style={styles.seeAll}>See All</Text>
      </Pressable>
    </View>
  );
}

function PropertyCard({
  property,
  favorite,
  onFavorite,
}: {
  property: Property;
  favorite: boolean;
  onFavorite: () => void;
}) {
  return (
    <Pressable
      style={styles.propertyCard}
      onPress={() =>
        router.push({
          pathname: "/(tenant)/property/[id]",
          params: { id: property.id },
        })
      }
    >
      <View>
        {property.image ? (
          <Image
            source={{ uri: property.image }}
            style={styles.propertyImage}
          />
        ) : (
          <View style={[styles.propertyImage, styles.noImage]}>
            <Image
              source={require("../../../assets/images/logo_gray.png")}
              style={styles.placeholderLogo}
              resizeMode="contain"
            />
            <Text style={styles.noImageText}>No photo yet</Text>
          </View>
        )}

        <Pressable
          style={styles.favoriteButton}
          onPress={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={21}
            color={favorite ? "#DC2626" : "#172554"}
          />
        </Pressable>

        {property.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName} numberOfLines={1}>
          {property.name}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={15} color="#64748B" />

          <Text
            style={styles.locationText}
          >{`${property.city}, ${property.province}`}</Text>
        </View>

        <Text style={styles.price}>
          ₱{property.monthly_rent.toLocaleString()}
          <Text style={styles.perMonth}> / month</Text>
        </Text>

        <View style={styles.availableRow}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>Available</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RecentPropertyCard({
  property,
  favorite,
  onFavorite,
}: {
  property: Property;
  favorite: boolean;
  onFavorite: () => void;
}) {
  return (
    <Pressable
      style={styles.recentCard}
      onPress={() =>
        router.push({
          pathname: "/(tenant)/property/[id]",
          params: { id: property.id },
        })
      }
    >
      {property.image ? (
        <Image source={{ uri: property.image }} style={styles.recentImage} />
      ) : (
        <View style={[styles.recentImage, styles.noImage]}>
          <Image
            source={require("../../../assets/images/logo_gray.png")}
            style={styles.smallPlaceholderLogo}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={styles.recentInfo}>
        <View style={styles.recentTitleRow}>
          <Text style={styles.recentName} numberOfLines={1}>
            {property.name}
          </Text>

          {property.verified && (
            <Ionicons name="checkmark-circle" size={17} color="#2563EB" />
          )}
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />

          <Text
            style={styles.locationText}
          >{`${property.city}, ${property.province}`}</Text>
        </View>

        <Text style={styles.price}>
          ₱{property.monthly_rent.toLocaleString()}
          <Text style={styles.perMonth}> / month</Text>
        </Text>
      </View>

      <Pressable
        style={styles.recentFavorite}
        onPress={(event) => {
          event.stopPropagation();
          onFavorite();
        }}
      >
        <Ionicons
          name={favorite ? "heart" : "heart-outline"}
          size={22}
          color={favorite ? "#DC2626" : "#64748B"}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 35,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  logo: {
    fontSize: 29,
    fontWeight: "800",
    color: "#172554",
    letterSpacing: -1,
  },

  greeting: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  notificationDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    right: 10,
    top: 9,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  hero: {
    backgroundColor: "#172554",
    borderRadius: 24,
    padding: 22,
    marginBottom: 25,
  },

  heroSmall: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 9,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
  },

  heroDescription: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 18,
  },

  searchBox: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginHorizontal: 10,
    color: "#0F172A",
    fontSize: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0F172A",
  },

  sectionDescription: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },

  seeAll: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },

  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 27,
  },

  quickAction: {
    width: "23%",
    alignItems: "center",
  },

  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  quickTitle: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  horizontalList: {
    paddingRight: 20,
    paddingBottom: 26,
  },

  propertyCard: {
    width: 235,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  propertyImage: {
    width: "100%",
    height: 145,
    backgroundColor: "#E2E8F0",
  },

  favoriteButton: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.94)",
    justifyContent: "center",
    alignItems: "center",
  },

  verifiedBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  verifiedText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  propertyInfo: {
    padding: 14,
  },

  propertyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 7,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  locationText: {
    color: "#64748B",
    fontSize: 12,
    flexShrink: 1,
  },

  price: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },

  perMonth: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
  },

  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },

  availableText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "600",
  },

  recentList: {
    gap: 12,
  },

  recentCard: {
    minHeight: 110,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  recentImage: {
    width: 92,
    height: 90,
    borderRadius: 13,
    backgroundColor: "#E2E8F0",
  },

  recentInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },

  recentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  recentName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },

  recentFavorite: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },

  noImage: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },

  noImageText: {
    marginTop: 6,
    fontSize: 11,
    color: "#64748B",
  },

  placeholderLogo: {
    width: 65,
    height: 65,
  },

  smallPlaceholderLogo: {
    width: 45,
    height: 45,
  },

  ownerCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#DBEAFE",
  borderRadius: 18,
  padding: 16,
  marginBottom: 27,
},

ownerCardIcon: {
  width: 54,
  height: 54,
  borderRadius: 17,
  backgroundColor: "#EFF6FF",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 13,
},

ownerCardContent: {
  flex: 1,
},

ownerCardLabel: {
  color: "#2563EB",
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 0.8,
  marginBottom: 3,
},

ownerCardTitle: {
  color: "#0F172A",
  fontSize: 15,
  fontWeight: "700",
},

ownerCardDescription: {
  color: "#64748B",
  fontSize: 12,
  lineHeight: 17,
  marginTop: 3,
},
});
