import { StyleSheet, Text, View } from "react-native";

export default function FavoritesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favorites</Text>

      <Text style={styles.placeholder}>
        Your saved accommodations will appear here.
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