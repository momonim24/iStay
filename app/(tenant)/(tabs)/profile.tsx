import { StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text>Guest User</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text>guest@example.com</Text>
      </View>

      <Text style={styles.placeholder}>
        Profile settings will be added later.
      </Text>
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
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
  placeholder: {
    color: "#777",
    marginTop: 20,
  },
});