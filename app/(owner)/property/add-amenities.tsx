import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";

const AMENITIES = [
  { id: "wifi", name: "Wi-Fi", icon: "wifi-outline" },
  { id: "parking", name: "Parking", icon: "car-outline" },
  { id: "aircon", name: "Air Conditioning", icon: "snow-outline" },
  { id: "bathroom", name: "Private Bathroom", icon: "water-outline" },
  { id: "kitchen", name: "Kitchen", icon: "restaurant-outline" },
  { id: "laundry", name: "Laundry Area", icon: "shirt-outline" },
  { id: "security", name: "CCTV / Security", icon: "shield-checkmark-outline" },
  { id: "furnished", name: "Furnished", icon: "bed-outline" },
  { id: "pets", name: "Pet Friendly", icon: "paw-outline" },
] as const;

export default function AddAmenitiesScreen() {
  const params = useLocalSearchParams();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const handleContinue = () => {
  router.push({
    pathname: "/(owner)/property/add-review",
    params: {
      ...params,
      amenities: JSON.stringify(selectedAmenities),
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepText}>STEP 4 OF 5</Text>

          <Text style={styles.title}>Amenities</Text>

          <Text style={styles.subtitle}>
            Select the amenities available at your property.
          </Text>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          <Text style={styles.sectionTitle}>Property Amenities</Text>

          <Text style={styles.sectionDescription}>
            Choose all amenities that renters can use.
          </Text>

          <View style={styles.amenitiesGrid}>
            {AMENITIES.map((amenity) => {
              const selected = selectedAmenities.includes(amenity.id);

              return (
                <Pressable
                  key={amenity.id}
                  style={[
                    styles.amenityCard,
                    selected && styles.amenityCardSelected,
                  ]}
                  onPress={() => toggleAmenity(amenity.id)}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      selected && styles.iconContainerSelected,
                    ]}
                  >
                    <Ionicons
                      name={amenity.icon}
                      size={23}
                      color={selected ? "#FFFFFF" : "#2563EB"}
                    />
                  </View>

                  <Text
                    style={[
                      styles.amenityText,
                      selected && styles.amenityTextSelected,
                    ]}
                  >
                    {amenity.name}
                  </Text>

                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#2563EB"
                      style={styles.checkIcon}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.optionalText}>
            Amenities are optional. You can continue without selecting any.
          </Text>

          <Pressable
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>Continue</Text>

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
    lineHeight: 20,
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
    width: "80%",
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  sectionDescription: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 18,
  },

  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  amenityCard: {
    width: "48%",
    minHeight: 115,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },

  amenityCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  iconContainerSelected: {
    backgroundColor: "#2563EB",
  },

  amenityText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
    paddingRight: 20,
  },

  amenityTextSelected: {
    color: "#1D4ED8",
  },

  checkIcon: {
    position: "absolute",
    top: 10,
    right: 10,
  },

  optionalText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 18,
  },

  continueButton: {
    minHeight: 52,
    marginTop: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});