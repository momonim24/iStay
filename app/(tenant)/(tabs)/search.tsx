import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DiscoveryState,
  ListingCard,
} from "../../../src/components/tenant-listings";
import { Chip } from "../../../src/components/ui";
import {
  card,
  colors,
  radius,
  spacing,
  type,
} from "../../../src/constants/ui";
import { useTenantDiscovery } from "../../../src/hooks/use-tenant-discovery";
import { useTenantFavorites } from "../../../src/hooks/use-tenant-favorites";
import { DiscoveryFilters } from "../../../src/services/tenant-discovery.service";

const PROPERTY_TYPES = [
  "Apartment",
  "Boarding House",
  "Dormitory",
  "Bedspace",
  "House",
  "Room for Rent",
];
type Panel = "location" | "type" | "price" | null;
const peso = (value?: string) =>
  value?.trim() && Number.isFinite(Number(value))
    ? `₱${Number(value).toLocaleString("en-PH")}`
    : "";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; type?: string }>();
  const q = typeof params.q === "string" ? params.q : undefined;
  const preset = typeof params.type === "string" ? params.type : undefined;
  const [filters, setFilters] = useState<DiscoveryFilters>({
    text: q ?? "",
    propertyType: preset ?? "",
  });
  const [panel, setPanel] = useState<Panel>(null);
  useEffect(() => {
    if (q !== undefined) setFilters((f) => ({ ...f, text: q }));
  }, [q]);
  useEffect(() => {
    if (preset !== undefined) setFilters((f) => ({ ...f, propertyType: preset }));
  }, [preset]);
  const discovery = useTenantDiscovery(filters);
  const saved = useTenantFavorites();
  const set = (field: keyof DiscoveryFilters, value: string) =>
    setFilters((f) => ({ ...f, [field]: value }));
  const toggle = (next: Panel) => setPanel(panel === next ? null : next);

  const city = filters.city?.trim() ?? "";
  const propertyType = filters.propertyType?.trim() ?? "";
  const min = peso(filters.minRent),
    max = peso(filters.maxRent);
  const price =
    min && max ? `${min} – ${max}` : min ? `From ${min}` : max ? `Up to ${max}` : "";
  const filtered = !!(city || propertyType || price);
  const input = (
    field: keyof DiscoveryFilters,
    placeholder: string,
    numeric = false,
  ) => (
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      placeholderTextColor={colors.textSubtle}
      style={styles.input}
      value={filters[field] || ""}
      onChangeText={(value) => set(field, value)}
      keyboardType={numeric ? "decimal-pad" : "default"}
    />
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={type.title}>Search</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Search property or location"
            placeholder="Search property or location"
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
            value={filters.text || ""}
            onChangeText={(value) => set("text", value)}
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            icon="location-outline"
            label={city || "Location"}
            selected={!!city || panel === "location"}
            onPress={() => toggle("location")}
          />
          <Chip
            icon="business-outline"
            label={propertyType || "Property type"}
            selected={!!propertyType || panel === "type"}
            onPress={() => toggle("type")}
          />
          <Chip
            icon="cash-outline"
            label={price || "Price"}
            selected={!!price || panel === "price"}
            onPress={() => toggle("price")}
          />
          {filtered && (
            <Chip
              icon="close"
              label="Clear"
              onPress={() => {
                setFilters({ text: filters.text });
                setPanel(null);
              }}
            />
          )}
        </ScrollView>

        {panel === "location" && (
          <View style={styles.panel}>
            <Text style={type.caption}>City or municipality (exact name)</Text>
            {input("city", "e.g. Imus")}
          </View>
        )}
        {panel === "type" && (
          <View style={[styles.panel, styles.options]}>
            {PROPERTY_TYPES.map((value) => (
              <Chip
                key={value}
                label={value}
                selected={propertyType.toLowerCase() === value.toLowerCase()}
                onPress={() =>
                  set(
                    "propertyType",
                    propertyType.toLowerCase() === value.toLowerCase()
                      ? ""
                      : value,
                  )
                }
              />
            ))}
          </View>
        )}
        {panel === "price" && (
          <View style={styles.panel}>
            <Text style={type.caption}>Monthly rent in pesos</Text>
            <View style={styles.priceRow}>
              <View style={{ flex: 1 }}>{input("minRent", "Minimum", true)}</View>
              <View style={{ flex: 1 }}>{input("maxRent", "Maximum", true)}</View>
            </View>
          </View>
        )}

        {!discovery.loading && !discovery.error && (
          <Text style={[type.caption, styles.count]}>
            {discovery.properties.length}{" "}
            {discovery.properties.length === 1 ? "property" : "properties"} found
          </Text>
        )}
        <DiscoveryState
          loading={discovery.loading}
          error={discovery.error}
          empty={!discovery.properties.length}
          onRetry={discovery.retry}
          emptyTitle="No matching properties"
          emptyMessage="Try a different search or remove a filter."
        />
        {!!saved.error && (
          <DiscoveryState
            loading={false}
            error={saved.error}
            empty={false}
            onRetry={saved.retry}
          />
        )}
        {discovery.properties.map((property) => (
          <ListingCard
            key={property.id}
            property={property}
            favorite={saved.ids.includes(property.id)}
            busy={!saved.ready || saved.busy.includes(property.id)}
            onFavorite={() => {
              void saved.toggle(property.id);
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  searchBox: {
    ...card,
    borderRadius: radius.md,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 14 },
  chips: { gap: spacing.sm, paddingVertical: spacing.md },
  panel: { ...card, padding: spacing.md, gap: spacing.sm },
  options: { flexDirection: "row", flexWrap: "wrap" },
  priceRow: { flexDirection: "row", gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    color: colors.text,
  },
  count: { marginTop: spacing.md, marginBottom: spacing.md },
});
