import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { authConfigured, requireSupabase } from "../../../src/lib/supabase";

export default function OwnerProfileScreen() {
  const switchToTenant = () => {
    router.replace("/(tenant)/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Owner Profile</Text>

        <Text style={styles.subtitle}>Manage your property owner account.</Text>

        <Text style={styles.sectionTitle}>Mode</Text>

        <Pressable
          style={styles.modeSwitchButton}
          onPress={() => router.replace("/(tenant)/(tabs)")}
        >
          <Ionicons name="swap-horizontal" size={19} color="#FFFFFF" />

          <Text style={styles.modeSwitchText}>Switch to Tenant</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    flex: 1,
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 20,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 30,
  },

  sectionTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },

  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 18,
    padding: 16,
  },

  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  content: {
    flex: 1,
  },

  switchTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },

  description: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  modeSwitchText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  modeSwitchButton: {
    position: "absolute",
    bottom: authConfigured ? 20 : 40,
    alignSelf: "center",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,

    backgroundColor: "#1D4ED8",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
});
