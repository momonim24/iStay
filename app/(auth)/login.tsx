import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    signInWithEmail,
    signInWithGoogle,
} from "../../src/services/auth.service";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }

    setLoading(true);
    const { data, error } = await signInWithEmail(email.trim(), password);
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("confirm")) {
        router.push({
          pathname: "/(auth)/verify-email",
          params: { email: email.trim() },
        });
        return;
      }
      Alert.alert("Unable to log in", error.message);
      return;
    }

    if (data.user && !data.user.email_confirmed_at) {
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim() },
      });
      return;
    }

    router.replace("/(tenant)/(tabs)");
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) Alert.alert("Google sign-in failed", error.message);
    else router.replace("/(tenant)/(tabs)");
  };

  return (
    <View style={styles.container}>
      {/* 1. Logo / Hero Image */}
      <Image
        // Option A: Local asset (adjust path relative to your file)
        source={require("../../assets/images/iStay_logo.png")}

        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {/* TouchableOpacity gives standard press feedback */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Since you're inside (auth), relative paths don't need ../(auth) */}
      <Link href="/(auth)/forgot-password" style={styles.link}>
        Forgot Password?
      </Link>

      <Link href="/(auth)/register" style={styles.link}>
        Don't have an account? Register
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  logo: {
    width: 90,
    height: 90,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  googleButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  googleButtonText: {
    color: "#111",
    fontWeight: "600",
  },
  link: {
    textAlign: "center",
    marginTop: 20,
  },
});
