import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { signInWithGoogle } from "../../src/services/auth.service";

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) Alert.alert("Google sign-in failed", error.message);
    else router.replace("/(tenant)/(tabs)");
  };

  return (
    <View style={styles.container}>
      

      <Text style={styles.logo}>iStay</Text>

      <Text style={styles.title}>Find a place that feels like home.</Text>

      <Text style={styles.subtitle}>
        Discover accommodations that match your needs, budget, and lifestyle.
      </Text>

      <Link href="../(auth)/login" style={styles.button}>
        Login
      </Link>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        )}
      </TouchableOpacity>

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
  googleButton: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  googleButtonText: {
    fontWeight: "600",
  },
});
