import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../src/auth/useAuth";
import { requireSupabase } from "../../src/lib/supabase";

export default function BecomeOwnerScreen() {
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data, error } = await requireSupabase()
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Failed to load profile:", error);
        return;
      }

      setDisplayName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setEmail(user.email ?? "");
    };

    void loadProfile();
  }, [user]);

  const handleContinue = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    if (!displayName.trim()) {
      Alert.alert("Missing information", "Please enter your name.");
      return;
    }

    if (!phone.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter your contact number.",
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter your contact email.",
      );
      return;
    }

    if (!agreed) {
      Alert.alert(
        "Confirmation required",
        "Please confirm that the information you provided is correct.",
      );
      return;
    }

    try {
      setLoading(true);

      const supabase = requireSupabase();

      // Create/update owner information.
      const { error: ownerError } = await supabase
        .from("owner_profiles")
        .upsert(
          {
            user_id: user.id,
            display_name: displayName.trim(),
            contact_phone: phone.trim(),
            contact_email: email.trim(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (ownerError) {
        throw ownerError;
      }

      // Mark the account as owner-enabled.
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_owner: true,
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      Alert.alert(
        "Owner profile created",
        "You can now list and manage properties on iStay.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tenant)/(tabs)/profile"),
          },
        ],
      );
    } catch (error) {
      console.error("Owner setup failed:", error);

      Alert.alert(
        "Setup failed",
        error instanceof Error
          ? error.message
          : "Unable to create your owner profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}

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

          <View style={styles.iconBox}>
            <Ionicons
              name="business-outline"
              size={31}
              color="#1D4ED8"
            />
          </View>

          <Text style={styles.title}>List your property</Text>

          <Text style={styles.subtitle}>
            Set up your property owner profile to start listing and
            managing rental properties on iStay.
          </Text>

          {/* FORM */}

          <Text style={styles.sectionTitle}>Owner Information</Text>

          <Text style={styles.label}>Display Name</Text>

          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name or business name"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Contact Number</Text>

          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="09XXXXXXXXX"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Contact Email</Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="owner@example.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* INFO */}

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#2563EB"
            />

            <Text style={styles.infoText}>
              Your contact information may be used for property
              management and communication with renters.
            </Text>
          </View>

          {/* CONFIRMATION */}

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setAgreed((current) => !current)}
          >
            <View
              style={[
                styles.checkbox,
                agreed && styles.checkboxSelected,
              ]}
            >
              {agreed && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="#FFFFFF"
                />
              )}
            </View>

            <Text style={styles.checkboxText}>
              I confirm that the information I provided is accurate.
            </Text>
          </Pressable>

          {/* BUTTON */}

          <Pressable
            style={[
              styles.continueButton,
              loading && styles.disabledButton,
            ]}
            disabled={loading}
            onPress={() => void handleContinue()}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.continueText}>
                  Continue as Property Owner
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 22,
    paddingBottom: 45,
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
    marginTop: 8,
    marginBottom: 28,
  },

  iconBox: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 7,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 17,
  },

  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 5,
    marginBottom: 22,
  },

  infoText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 26,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  checkboxSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  checkboxText: {
    flex: 1,
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
  },

  continueButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#1D4ED8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.65,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});