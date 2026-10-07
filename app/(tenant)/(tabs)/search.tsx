import { useLocalSearchParams } from "expo-router";
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
import {
  DiscoveryState,
  ListingCard,
} from "../../../src/components/tenant-listings";
import { useTenantDiscovery } from "../../../src/hooks/use-tenant-discovery";
import { DiscoveryFilters } from "../../../src/services/tenant-discovery.service";
import { useTenantFavorites } from "../../../src/hooks/use-tenant-favorites";

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [filters, setFilters] = useState<DiscoveryFilters>({
    text: typeof q === "string" ? q : "",
  });
  useEffect(() => {
    if (typeof q === "string") setFilters((f) => ({ ...f, text: q }));
  }, [q]);
  const discovery = useTenantDiscovery(filters);
  const saved = useTenantFavorites();
  const input = (
    field: keyof DiscoveryFilters,
    placeholder: string,
    numeric = false,
  ) => (
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      style={styles.search}
      value={filters[field] || ""}
      onChangeText={(value) => setFilters((f) => ({ ...f, [field]: value }))}
      keyboardType={numeric ? "decimal-pad" : "default"}
    />
  );
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Find Accommodation</Text>
        {input("text", "Search property or location")}
        {input("city", "City (exact name)")}
        {input("propertyType", "Property type (exact name)")}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            {input("minRent", "Minimum rent", true)}
          </View>
          <View style={{ flex: 1 }}>
            {input("maxRent", "Maximum rent", true)}
          </View>
        </View>
        <Pressable onPress={() => setFilters({})}>
          <Text style={{ color: "#1D4ED8", marginBottom: 16 }}>
            Clear filters
          </Text>
        </Pressable>
        <DiscoveryState
          loading={discovery.loading}
          error={discovery.error}
          empty={!discovery.properties.length}
          onRetry={discovery.retry}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 20,
  },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  placeholder: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
  },
});
