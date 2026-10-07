import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function AddPricingScreen() {
  const params = useLocalSearchParams();

  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  const [electricityIncluded, setElectricityIncluded] = useState(false);
  const [waterIncluded, setWaterIncluded] = useState(false);
  const [internetIncluded, setInternetIncluded] = useState(false);

  const canContinue = Number(monthlyRent) > 0;

  const handleContinue = () => {
  if (!canContinue) return;

  router.push({
    pathname: "/(owner)/property/add-rooms",
    params: {
      ...params,
      monthlyRent,
      securityDeposit: securityDeposit || "0",
      electricityIncluded: String(electricityIncluded),
      waterIncluded: String(waterIncluded),
      internetIncluded: String(internetIncluded),
    },
  });
};

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>

          <Text style={styles.headerTitle}>Add Property</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepText}>STEP 2 OF 5</Text>

          <Text style={styles.title}>
            Pricing & Availability
          </Text>

          <Text style={styles.subtitle}>
            Set the rental cost and current availability.
          </Text>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          {/* Pricing */}

          <Text style={styles.sectionTitle}>Pricing</Text>

          <Text style={styles.label}>
            Monthly Rent <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.moneyInput}>
            <Text style={styles.currency}>₱</Text>

            <TextInput
              style={styles.moneyTextInput}
              value={monthlyRent}
              onChangeText={setMonthlyRent}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.label}>Security Deposit</Text>

          <View style={styles.moneyInput}>
            <Text style={styles.currency}>₱</Text>

            <TextInput
              style={styles.moneyTextInput}
              value={securityDeposit}
              onChangeText={setSecurityDeposit}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          {/* Utilities */}

          <Text style={styles.sectionTitle}>Utilities Included</Text>

          <Text style={styles.sectionDescription}>
            Select which utilities are already included in the monthly rent.
          </Text>

          <UtilityRow
            icon="flash-outline"
            title="Electricity"
            value={electricityIncluded}
            onChange={setElectricityIncluded}
          />

          <UtilityRow
            icon="water-outline"
            title="Water"
            value={waterIncluded}
            onChange={setWaterIncluded}
          />

          <UtilityRow
            icon="wifi-outline"
            title="Internet / Wi-Fi"
            value={internetIncluded}
            onChange={setInternetIncluded}
          />

          <Text style={styles.helperText}>
            Maximum number of renters this accommodation can hold.
          </Text>

          <Text style={styles.label}>
            Available Slots <Text style={styles.required}>*</Text>
          </Text>

          <Text style={styles.helperText}>
            Number of spaces currently available for renters.
          </Text>

          <Pressable
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
            ]}
            disabled={!canContinue}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>
              Continue
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type UtilityRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function UtilityRow({
  icon,
  title,
  value,
  onChange,
}: UtilityRowProps) {
  return (
    <View style={styles.utilityRow}>
      <View style={styles.utilityLeft}>
        <View style={styles.utilityIcon}>
          <Ionicons
            name={icon}
            size={20}
            color="#2563EB"
          />
        </View>

        <Text style={styles.utilityTitle}>{title}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: "#CBD5E1",
          true: "#93C5FD",
        }}
        thumbColor={value ? "#2563EB" : "#F8FAFC"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
  },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 60,
  },

  stepText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 8,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 5,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
  },

  progressBackground: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 28,
    overflow: "hidden",
  },

  progressFill: {
    width: "40%",
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 4,
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginBottom: 10,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 16,
  },

  required: {
    color: "#DC2626",
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  moneyInput: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },

  currency: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginRight: 8,
  },

  moneyTextInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 15,
    color: "#0F172A",
  },

  utilityRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  utilityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  utilityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  utilityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  helperText: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },

  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 12,
  },

  continueButton: {
    minHeight: 52,
    marginTop: 34,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  continueButtonDisabled: {
    opacity: 0.45,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
