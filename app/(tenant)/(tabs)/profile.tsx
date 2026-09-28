import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../src/auth/useAuth";
import { AuthButton, AuthNotice } from "../../../src/components/auth/AuthForm";
import { useAuthAction } from "../../../src/hooks/use-auth-action";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const action = useAuthAction();
  const fullName: unknown =
    user?.user_metadata.full_name ?? user?.user_metadata.name;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text>{typeof fullName === "string" ? fullName : "iStay member"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text>{user?.email}</Text>
      </View>

      <Text style={styles.placeholder}>
        Profile settings will be added later.
      </Text>
      <AuthNotice error={action.error} />
      <AuthButton
        title="Logout"
        busy={action.busy}
        onPress={() => void action.run(signOut)}
      />
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
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
  placeholder: {
    color: "#777",
    marginTop: 20,
  },
});
