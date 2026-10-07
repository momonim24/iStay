import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SmartMatchScreen() {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#172554" />
        </Pressable>

        <Text style={styles.headerTitle}>Smart Match</Text>

        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={42} color="#2563EB" />
        </View>

        <Text style={styles.title}>Find Your Perfect Stay</Text>

        <Text style={styles.description}>
          Tell iStay what you're looking for and we'll help you find
          accommodations that match your preferences.
        </Text>

        <Pressable style={styles.button}>
          <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Start Smart Match</Text>
        </Pressable>

        <Text style={styles.note}>
          Smart Match will only recommend properties available in the iStay
          database.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  placeholder: {
    width: 42,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  description: {
    fontSize: 15,
    lineHeight: 23,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 30,
  },

  button: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    backgroundColor: "#172554",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  note: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 18,
    color: "#94A3B8",
    textAlign: "center",
  },
});
