import * as Linking from "expo-linking";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    resendSignupEmail,
    setSessionFromUrl,
    verifySignupCode,
} from "../../src/services/auth.service";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? "");
  const [token, setToken] = useState("");

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url)
        setSessionFromUrl(url)
          .then(() => router.replace("/(tenant)/(tabs)"))
          .catch(() => undefined);
    });
  }, [router]);

  const handleVerify = async () => {
    const { error } = await verifySignupCode(email.trim(), token.trim());
    if (error) Alert.alert("Verification failed", error.message);
    else router.replace("/(tenant)/(tabs)");
  };

  const handleResend = async () => {
    const { error } = await resendSignupEmail(email.trim());
    if (error) Alert.alert("Unable to resend code", error.message);
    else
      Alert.alert("Code sent", "Check your email for a new verification code.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.description}>
        Enter the 6-digit code sent to your email address.
      </Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Verification code"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify Email</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResend}>
        <Text style={styles.link}>Resend code</Text>
      </TouchableOpacity>
      <Link href="/(auth)/login" style={styles.link}>
        Back to Login
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 30, fontWeight: "700", marginBottom: 12 },
  description: { color: "#666", lineHeight: 22, marginBottom: 24 },
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
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", marginTop: 20 },
});
