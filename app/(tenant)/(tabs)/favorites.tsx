import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DiscoveryState,
  ListingCard,
} from "../../../src/components/tenant-listings";
import {
  fetchTenantFavorites,
  TenantProperty,
} from "../../../src/services/tenant-discovery.service";
import { useTenantFavorites } from "../../../src/hooks/use-tenant-favorites";
import { useAuth } from "../../../src/auth/useAuth";
import { useRequireAuth } from "../../../src/auth/use-require-auth";
import { AuthGate } from "../../../src/components/auth/AuthGate";
import { colors, spacing, type } from "../../../src/constants/ui";

export default function FavoritesScreen() {
  const { signedIn } = useRequireAuth();
  if (!signedIn)
    return (
      <AuthGate
        title="Favorites"
        icon="heart-outline"
        heading="Keep the places you like"
        reason="Log in to see your saved properties."
      />
    );
  return <Favorites />;
}
function Favorites() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<TenantProperty[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const retry = () => setRevision((r) => r + 1);
  const saved = useTenantFavorites(retry);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setProperties([]);
      setLoading(true);
      setError("");
      void fetchTenantFavorites(controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) setProperties(rows);
        })
        .catch((e: unknown) => {
          if (!controller.signal.aborted)
            setError(
              e instanceof Error ? e.message : "Unable to load favorites.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }, [user?.id, revision]),
  );
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Favorites</Text>

        <DiscoveryState
          loading={loading}
          error={error}
          empty={!properties.length}
          onRetry={retry}
          emptyTitle="No favorites yet"
          emptyMessage="Tap the heart on a listing to save it here."
        />
        {!!saved.error && (
          <DiscoveryState
            loading={false}
            error={saved.error}
            empty={false}
            onRetry={saved.retry}
          />
        )}
        {properties.map((property) => (
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
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...type.title, marginBottom: spacing.lg },
});
