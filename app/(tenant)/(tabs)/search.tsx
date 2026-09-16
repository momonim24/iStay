import { StyleSheet, Text, TextInput, View } from "react-native";

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Accommodation</Text>

      <TextInput
        placeholder="Search location, property, or school..."
        style={styles.search}
      />

      <Text style={styles.placeholder}>
        Property listings will appear here.
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
    marginBottom: 20,
  },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
  },
  placeholder: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
  },
});