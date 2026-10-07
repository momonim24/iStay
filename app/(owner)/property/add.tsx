import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const PROPERTY_TYPES = [
  "Apartment",
  "Boarding House",
  "Dormitory",
  "Bedspace",
  "House",
  "Room for Rent",
];

export default function AddPropertyScreen() {
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");

  const canContinue =
    propertyName.trim() &&
    propertyType &&
    address.trim() &&
    barangay.trim() &&
    city.trim();

  const handleContinue = () => {
  if (!canContinue) return;

  router.push({
    pathname: "/(owner)/property/add-pricing",
    params: {
      propertyName: propertyName.trim(),
      propertyType,
      description: description.trim(),
      address: address.trim(),
      barangay: barangay.trim(),
      city: city.trim(),
      province: "Cavite",
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
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
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
          {/* Progress */}
          <Text style={styles.stepText}>STEP 1 OF 5</Text>
          <Text style={styles.title}>Property Information</Text>
          <Text style={styles.subtitle}>Tell renters about your property.</Text>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          {/* Property Name */}
          <Text style={styles.label}>
            Property Name <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={propertyName}
            onChangeText={setPropertyName}
            placeholder="e.g. iStay Residences"
            placeholderTextColor="#94A3B8"
          />

          {/* Property Type */}
          <Text style={styles.label}>
            Property Type <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.typeContainer}>
            {PROPERTY_TYPES.map((type) => {
              const selected = propertyType === type;

              return (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    selected && styles.typeButtonSelected,
                  ]}
                  onPress={() => setPropertyType(type)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      selected && styles.typeTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Description */}
          <Text style={styles.label}>Description</Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your property..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text style={styles.characterCount}>{description.length}/1000</Text>

          {/* Address */}
          <Text style={styles.sectionTitle}>Location</Text>

          <Text style={styles.label}>
            Street / Address <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="House number, street, subdivision"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>
            Barangay <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={barangay}
            onChangeText={setBarangay}
            placeholder="Enter barangay"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>
            City / Municipality <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Bacoor"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Province</Text>

          <View style={styles.disabledInput}>
            <Text style={styles.disabledText}>Cavite</Text>
          </View>

          {/* Continue */}
          <Pressable
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
            ]}
            disabled={!canContinue}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>Continue</Text>

            <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    width: "20%",
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
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

  textArea: {
    height: 130,
    paddingTop: 14,
  },

  characterCount: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "right",
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 28,
    marginBottom: 2,
  },

  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  typeButton: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  typeButtonSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },

  typeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },

  typeTextSelected: {
    color: "#1D4ED8",
  },

  disabledInput: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  disabledText: {
    fontSize: 15,
    color: "#64748B",
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
