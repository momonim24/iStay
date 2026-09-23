import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
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
    setSessionFromUrl,
    updatePassword,
} from "../../src/services/auth.service";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const acceptUrl = (url: string) =>
      setSessionFromUrl(url)
        .then(() => setReady(true))
        .catch(() => setReady(false));
    Linking.getInitialURL().then((url) => {
      if (url) acceptUrl(url);
      else setReady(true);
    });
    const subscription = Linking.addEventListener("url", ({ url }) =>
      acceptUrl(url),
    );
    return () => subscription.remove();
  }, []);

  const handleUpdate = async () => {
    if (!ready) return;
    if (password.length < 6 || password !== confirmPassword) {
      Alert.alert(
        "Check your password",
        "Use at least 6 characters and enter matching passwords.",
      );
      return;
    }
    const { error } = await updatePassword(password);
    if (error) Alert.alert("Unable to update password", error.message);
    else {
      Alert.alert("Password updated", "You can now continue to iStay.", [
        { text: "Continue", onPress: () => router.replace("/(tenant)/(tabs)") },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a new password</Text>
      <TextInput
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="Confirm password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleUpdate}
        disabled={!ready}
      >
        <Text style={styles.buttonText}>Update Password</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 30, fontWeight: "700", marginBottom: 24 },
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
});
