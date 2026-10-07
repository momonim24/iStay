import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRequireAuth } from "../../auth/use-require-auth";
import { colors, spacing, type } from "../../constants/ui";
import { Button, type IconName } from "../ui";

// Shown in place of an account-only tab while browsing as a guest.
export function AuthGate({
  title,
  icon,
  heading,
  reason,
}: {
  title: string;
  icon: IconName;
  heading: string;
  reason: string;
}) {
  // Signing in re-renders the tab with its real content; nothing to resume.
  const { requireAuth } = useRequireAuth();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={30} color={colors.brand} />
        </View>
        <Text style={[type.heading, styles.center]}>{heading}</Text>
        <Text style={[type.body, styles.center]}>{reason}</Text>
        <Button
          title="Log in"
          style={styles.action}
          onPress={() => requireAuth(reason)}
        />
        <Button
          title="Create an account"
          variant="secondary"
          style={styles.action}
          onPress={() => requireAuth(reason, undefined, "register")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: {
    ...type.title,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xxl,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
  center: { textAlign: "center" },
  action: { alignSelf: "stretch" },
});
