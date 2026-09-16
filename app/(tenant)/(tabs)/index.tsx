import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to UNISTAY</Text>

      <Text style={styles.subtitle}>
        Find an accommodation that fits you.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🤖 Smart Match</Text>
        <Text>
          Let UNISTAY find accommodations based on your preferences.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏠 Recommended</Text>
        <Text>Your personalized accommodations will appear here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 40,
  },
  subtitle: {
    color: "#666",
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
});