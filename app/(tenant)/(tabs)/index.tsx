import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequireAuth } from "../../../src/auth/use-require-auth";
import { useAuth } from "../../../src/auth/useAuth";
import {
  DiscoveryState,
  ListingCard,
} from "../../../src/components/tenant-listings";
import {
  Chip,
  IconButton,
  SectionHeader,
  type IconName,
} from "../../../src/components/ui";
import { card, colors, radius, spacing, type } from "../../../src/constants/ui";
import { useTenantDiscovery } from "../../../src/hooks/use-tenant-discovery";
import { useTenantFavorites } from "../../../src/hooks/use-tenant-favorites";
import { requireSupabase } from "../../../src/lib/supabase";

const shortcuts: { label: string; icon: IconName }[] = [
  { label: "Apartment", icon: "business-outline" },
  { label: "Boarding House", icon: "people-outline" },
  { label: "Dormitory", icon: "school-outline" },
  { label: "Bedspace", icon: "bed-outline" },
  { label: "House", icon: "home-outline" },
  { label: "Room for Rent", icon: "key-outline" },
];

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const saved = useTenantFavorites();
  const { user } = useAuth();
  const { signedIn, requireAuth } = useRequireAuth();
  const [fullName, setFullName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const { properties, loading, error, retry } = useTenantDiscovery();

  useEffect(() => {
    setFullName("");
    setIsOwner(false);
    if (!user || !signedIn) return;
    let active = true;
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
      if (!active) return;
      setFullName(data.full_name ?? "");
      setIsOwner(data.is_owner ?? false);
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [user, signedIn]);

  const openSearch = (params: { q?: string; type?: string } = {}) =>
    router.push({ pathname: "/(tenant)/(tabs)/search", params });
  const cardProps = (id: string) => ({
    favorite: saved.ids.includes(id),
    busy: !saved.ready || saved.busy.includes(id),
    onFavorite: () => void saved.toggle(id),
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.logo}>iStay</Text>
            <Text style={type.caption}>
              {fullName
                ? `Welcome back, ${fullName.split(" ")[0]}`
                : "Find a place that feels like home"}
            </Text>
          </View>
          {signedIn ? (
            <IconButton
              icon="notifications-outline"
              accessibilityLabel="Notifications"
              onPress={() => router.push("/(tenant)/notifications")}
            />
          ) : (
            <Chip
              label="Log in"
              icon="person-outline"
              onPress={() =>
                requireAuth("Log in or create your iStay account.")
              }
            />
          )}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Search properties or locations"
            style={styles.searchInput}
            placeholder="Search properties or locations"
            placeholderTextColor={colors.textSubtle}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => openSearch({ q: search })}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            hitSlop={8}
            onPress={() => openSearch({ q: search })}
          >
            <Ionicons
              name="arrow-forward-circle"
              size={28}
              color={colors.brand}
            />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcuts}
        >
          {shortcuts.map((shortcut) => (
            <Chip
              key={shortcut.label}
              label={shortcut.label}
              icon={shortcut.icon}
              onPress={() => openSearch({ type: shortcut.label })}
            />
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          style={styles.promo}
          onPress={() => router.push("/(tenant)/smart-match")}
        >
          <View style={styles.promoIcon}>
            <Ionicons name="sparkles" size={22} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>Smart Match</Text>
            <Text style={styles.promoText}>
              Tell iStay what you need and get listings that fit.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#BFDBFE" />
        </Pressable>

        {!!saved.error && (
          <DiscoveryState
            loading={false}
            error={saved.error}
            empty={false}
            onRetry={saved.retry}
          />
        )}

        <SectionHeader
          title="Recently added"
          action="See all"
          onAction={() => openSearch()}
        />
        <DiscoveryState
          loading={loading}
          error={error}
          empty={!properties.length}
          onRetry={retry}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {properties.slice(0, 8).map((property) => (
            <ListingCard
              key={property.id}
              compact
              property={property}
              {...cardProps(property.id)}
            />
          ))}
        </ScrollView>

        {properties.length > 0 && (
          <>
            <SectionHeader
              title="Explore listings"
              action="Search"
              onAction={() => openSearch()}
            />
            {properties.slice(0, 6).map((property) => (
              <ListingCard
                key={property.id}
                property={property}
                {...cardProps(property.id)}
              />
            ))}
          </>
        )}

        <Pressable
          accessibilityRole="button"
          style={styles.ownerCard}
          onPress={() => {
            if (isOwner) router.push("/(owner)/(tabs)");
            else if (
              requireAuth("Log in to list your property.", {
                pathname: "/(tenant)/become-owner",
              })
            )
              router.push("/(tenant)/become-owner");
          }}
        >
          <View style={styles.ownerIcon}>
            <Ionicons
              name={isOwner ? "business-outline" : "add-circle-outline"}
              size={24}
              color={colors.brand}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.subheading}>
              {isOwner ? "Manage your properties" : "Have a property to rent?"}
            </Text>
            <Text style={type.caption}>
              {isOwner
                ? "Open Landlord Mode to manage listings and applications."
                : "List it on iStay and reach renters across Cavite."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  logo: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: -0.8,
  },
  searchBox: {
    ...card,
    borderRadius: radius.md,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 14 },
  shortcuts: { gap: spacing.sm, paddingVertical: spacing.lg },
  promo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brandDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
  promoTitle: { color: colors.surface, fontSize: 16, fontWeight: "800" },
  promoText: { color: "#CBD5E1", fontSize: 12, lineHeight: 17, marginTop: 2 },
  carousel: { paddingRight: spacing.sm },
  ownerCard: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  ownerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
});
