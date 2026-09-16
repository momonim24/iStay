import { StyleSheet, Text, View } from "react-native";

export default function ApplicationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Applications</Text>

      <Text style={styles.placeholder}>
        Your accommodation applications will appear here.
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
  },
  placeholder: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
  },
});