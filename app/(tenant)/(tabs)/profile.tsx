import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../../src/auth/useAuth";
import { AuthButton, AuthNotice } from "../../../src/components/auth/AuthForm";
import { useAuthAction } from "../../../src/hooks/use-auth-action";
import { requireSupabase } from "../../../src/lib/supabase";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const action = useAuthAction();

  const [fullName, setFullName] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useFocusEffect(
  useCallback(() => {
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
  }, [user]),
);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        {/* USER INFORMATION */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color="#1D4ED8" />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {fullName || "iStay Member"}
            </Text>

            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* PROPERTY MANAGEMENT */}
        <Text style={styles.sectionTitle}>Property Management</Text>

        <Pressable
          style={styles.ownerCard}
          onPress={() =>
            isOwner
              ? router.push("/(owner)/properties")
              : router.push("/(tenant)/become-owner")
          }
        >
          <View style={styles.ownerIcon}>
            <Ionicons
              name={isOwner ? "business-outline" : "home-outline"}
              size={27}
              color="#1D4ED8"
            />
          </View>

          <View style={styles.ownerContent}>
            <Text style={styles.ownerTitle}>
              {isOwner ? "Your Listings" : "List Your Property"}
            </Text>

            <Text style={styles.ownerDescription}>
              {isOwner
                ? "View and manage your rental properties."
                : "Become a property owner on iStay and start listing your rentals."}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#64748B"
          />
        </Pressable>

        {/* ACCOUNT */}
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="person-outline"
              size={21}
              color="#64748B"
            />

            <View>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {fullName || "iStay Member"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons
              name="mail-outline"
              size={21}
              color="#64748B"
            />

            <View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {user?.email ?? ""}
              </Text>
            </View>
          </View>
        </View>

        <AuthNotice error={action.error} />

        <View style={styles.logout}>
          <AuthButton
            title="Logout"
            busy={action.busy}
            onPress={() => void action.run(signOut)}
          />
        </View>
      </ScrollView>
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
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 15,
    marginBottom: 22,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  email: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },

  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 26,
  },

  ownerIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  ownerContent: {
    flex: 1,
  },

  ownerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  ownerDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 3,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 15,
  },

  infoLabel: {
    fontSize: 11,
    color: "#64748B",
  },

  infoValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  logout: {
    marginTop: 10,
  },
});