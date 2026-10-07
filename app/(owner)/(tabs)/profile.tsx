import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/auth/useAuth";
import { Button } from "../../../src/components/ui";
import { card, colors, spacing, type } from "../../../src/constants/ui";

export default function OwnerProfileScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <Text style={type.title}>Profile</Text>
        <View style={styles.account}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.subheading}>Landlord account</Text>
            <Text style={type.caption}>{user?.email ?? ""}</Text>
          </View>
        </View>
        <Text style={type.body}>
          Your account details and log out are in Tenant Mode under Profile.
        </Text>
        <Button
          title="Switch to Tenant Mode"
          icon="swap-horizontal"
          onPress={() => router.replace("/(tenant)/(tabs)")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  account: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
});
