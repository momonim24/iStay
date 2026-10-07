import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function OwnerDashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>iStay</Text>
            <Text style={styles.mode}>Property Management</Text>
          </View>

          <Pressable style={styles.notification}>
            <Ionicons
              name="notifications-outline"
              size={23}
              color="#172554"
            />
          </Pressable>
        </View>

        <Text style={styles.title}>Owner Dashboard</Text>

        <Text style={styles.subtitle}>
          Manage your properties and rental activity.
        </Text>

        {/* OVERVIEW */}

        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.statsGrid}>
          <StatCard
            icon="business-outline"
            value="—"
            label="Properties"
          />

          <StatCard
            icon="document-text-outline"
            value="—"
            label="Applications"
          />

          <StatCard
            icon="people-outline"
            value="—"
            label="Tenants"
          />

          <StatCard
            icon="construct-outline"
            value="—"
            label="Maintenance"
          />
        </View>

        {/* QUICK ACTIONS */}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <Pressable
          style={styles.actionCard}
          onPress={() =>
            router.push("/(owner)/(tabs)/properties")
          }
        >
          <View style={styles.actionIcon}>
            <Ionicons
              name="business-outline"
              size={25}
              color="#1D4ED8"
            />
          </View>

          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Manage Properties
            </Text>

            <Text style={styles.actionDescription}>
              View and manage your rental listings.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color="#64748B"
          />
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() =>
            router.push("/(owner)/(tabs)/applications")
          }
        >
          <View style={styles.actionIcon}>
            <Ionicons
              name="document-text-outline"
              size={25}
              color="#1D4ED8"
            />
          </View>

          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Applications
            </Text>

            <Text style={styles.actionDescription}>
              Review rental applications from potential tenants.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color="#64748B"
          />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={22}
          color="#1D4ED8"
        />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 27,
  },

  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: "#172554",
  },

  mode: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 1,
  },

  notification: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 27,
  },

  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 13,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  statValue: {
    color: "#0F172A",
    fontSize: 23,
    fontWeight: "800",
  },

  statLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
  },

  actionIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },

  actionDescription: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
});