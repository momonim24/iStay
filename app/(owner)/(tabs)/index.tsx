import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/auth/useAuth";
import {
  Badge,
  Button,
  Notice,
  SectionHeader,
  statusStyles,
  type IconName,
} from "../../../src/components/ui";
import {
  card,
  colors,
  spacing,
  type,
} from "../../../src/constants/ui";
import { requireSupabase } from "../../../src/lib/supabase";
import { fetchLandlordApplications } from "../../../src/services/application.service";
import type { ApplicationDetails } from "../../../src/types/application";

type Listing = { id: string; status: string; verified: boolean };
const label = (status: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [applications, setApplications] = useState<ApplicationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      setError("");
      const load = async () => {
        const { data, error } = await requireSupabase()
          .from("properties")
          .select("id,status,verified")
          .eq("owner_id", user.id);
        if (error) throw error;
        const rows = await fetchLandlordApplications();
        if (!active) return;
        setListings((data ?? []) as Listing[]);
        setApplications(rows);
      };
      void load()
        .catch((cause: unknown) => {
          console.error("Failed to load dashboard:", cause);
          if (active)
            setError("Unable to load your dashboard. Please try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [user?.id, revision]),
  );

  // Every figure below is counted from the landlord's own rows.
  const live = listings.filter((l) => l.status === "active" && l.verified);
  const pending = applications.filter((a) => a.status === "pending");
  const byStatus = new Map<string, number>();
  for (const listing of listings)
    byStatus.set(listing.status, (byStatus.get(listing.status) ?? 0) + 1);
  const unverified = listings.filter((l) => !l.verified).length;
  const value = (count: number) => (loading || error ? "—" : String(count));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.logo}>iStay</Text>
            <Text style={type.caption}>Landlord Mode</Text>
          </View>
          <Button
            title="Add Property"
            icon="add"
            onPress={() => router.push("/(owner)/property/add")}
          />
        </View>

        {!!error && (
          <Notice icon="cloud-offline-outline" title={error} tone="danger">
            <Button
              title="Retry"
              variant="secondary"
              onPress={() => setRevision((r) => r + 1)}
            />
          </Notice>
        )}

        <View style={styles.stats}>
          <Stat
            icon="business-outline"
            value={value(listings.length)}
            label="Properties"
            onPress={() => router.push("/(owner)/(tabs)/properties")}
          />
          <Stat
            icon="eye-outline"
            value={value(live.length)}
            label="Live listings"
            onPress={() => router.push("/(owner)/(tabs)/properties")}
          />
          <Stat
            icon="time-outline"
            value={value(pending.length)}
            label="Pending applications"
            onPress={() => router.push("/(owner)/(tabs)/applications")}
          />
          <Stat
            icon="document-text-outline"
            value={value(applications.length)}
            label="All applications"
            onPress={() => router.push("/(owner)/(tabs)/applications")}
          />
        </View>

        <SectionHeader
          title="Pending applications"
          action="View all"
          onAction={() => router.push("/(owner)/(tabs)/applications")}
        />
        {!loading && !error && !pending.length && (
          <Notice
            icon="checkmark-done-outline"
            title="You're all caught up"
            message="New rental applications will appear here."
          />
        )}
        {pending.slice(0, 3).map((application) => (
          <Pressable
            key={application.id}
            accessibilityRole="button"
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: "/(owner)/application/[id]",
                params: { id: application.id },
              })
            }
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={type.subheading} numberOfLines={1}>
                {application.property?.name ?? "Property"}
              </Text>
              <Text style={type.caption} numberOfLines={1}>
                {application.tenantName ?? "Applicant"}
                {application.room ? ` · ${application.room.name}` : ""}
              </Text>
              <Badge {...statusStyles.pending} />
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ))}

        <SectionHeader
          title="Listing status"
          action="Manage"
          onAction={() => router.push("/(owner)/(tabs)/properties")}
        />
        {!loading && !error && !listings.length ? (
          <Notice
            icon="business-outline"
            title="No properties yet"
            message="Add your first property to start receiving applications."
            tone="brand"
          >
            <Button
              title="Add Property"
              icon="add"
              onPress={() => router.push("/(owner)/property/add")}
            />
          </Notice>
        ) : (
          <View style={styles.panel}>
            {[...byStatus].map(([status, count]) => (
              <View key={status} style={styles.line}>
                <Text style={[type.body, { flex: 1 }]}>{label(status)}</Text>
                <Text style={styles.count}>{count}</Text>
              </View>
            ))}
            <View style={styles.line}>
              <Text style={[type.body, { flex: 1 }]}>
                Awaiting verification
              </Text>
              <Text style={styles.count}>{value(unverified)}</Text>
            </View>
          </View>
        )}

        <SectionHeader title="Quick actions" />
        <Action
          icon="business-outline"
          title="Manage properties"
          description="Edit listings, rooms, photos and amenities."
          onPress={() => router.push("/(owner)/(tabs)/properties")}
        />
        <Action
          icon="document-text-outline"
          title="Review applications"
          description="Approve or reject rental applications."
          onPress={() => router.push("/(owner)/(tabs)/applications")}
        />
        <Action
          icon="swap-horizontal"
          title="Switch to Tenant Mode"
          description="Browse the marketplace as a renter."
          onPress={() => router.replace("/(tenant)/(tabs)")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  value,
  label,
  onPress,
}: {
  icon: IconName;
  value: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.stat} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </Pressable>
  );
}
function Action({
  icon,
  title,
  description,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.item} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.subheading}>{title}</Text>
        <Text style={type.caption}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
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
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: {
    ...card,
    flexGrow: 1,
    flexBasis: "45%",
    padding: spacing.lg,
    gap: 4,
  },
  statValue: { fontSize: 26, fontWeight: "800", color: colors.text },
  item: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
  panel: { ...card, paddingHorizontal: spacing.lg },
  line: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  count: { fontSize: 15, fontWeight: "700", color: colors.text },
});
