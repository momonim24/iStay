import { StyleSheet, Text, View } from "react-native";

export default function OwnerApplicationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Applications</Text>
      <Text style={styles.text}>
        Rental applications will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 20,
    paddingTop: 60,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },

  text: {
    color: "#64748B",
    marginTop: 8,
  },
});