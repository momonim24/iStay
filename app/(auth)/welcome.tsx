import { Link } from "expo-router";
import { StyleSheet, Text, View, Image } from "react-native";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/iStay_logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      
      <Text style={styles.logo}>iStay</Text>

      <Text style={styles.title}>Find a place that feels like home.</Text>

      <Text style={styles.subtitle}>
        Discover accommodations that match your needs, budget, and lifestyle.
      </Text>

      <Link href="../(auth)/login" style={styles.button}>
        Login
      </Link>

      <Link href="../(auth)/register" style={styles.secondaryButton}>
        Create Account
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#000",
    color: "#fff",
    textAlign: "center",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#000",
    color: "#000",
    textAlign: "center",
    padding: 16,
    borderRadius: 10,
    fontWeight: "600",
  },
});