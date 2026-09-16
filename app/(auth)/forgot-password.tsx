import { Link } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function ForgotPasswordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password?</Text>

      <Text style={styles.description}>
        Enter your email address and we'll help you recover your account.
      </Text>

      <TextInput
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <View style={styles.button}>
        <Text style={styles.buttonText}>Send Reset Link</Text>
      </View>

      <Link href="../(auth)/login" style={styles.link}>
        Back to Login
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
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 12,
  },
  description: {
    color: "#666",
    lineHeight: 22,
    marginBottom: 24,
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