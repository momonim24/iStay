import { Link } from "expo-router";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
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
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
      />

      {/* TouchableOpacity gives standard press feedback */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => {
          // Handle authentication logic here
        }}
      >
        <Text style={styles.buttonText}>Login</Text>
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
  link: {
    textAlign: "center",
    marginTop: 20,
  },
});