import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notice } from "../../../src/components/ui";
import { colors, spacing, type } from "../../../src/constants/ui";

export default function OwnerMaintenanceScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <Text style={type.title}>Maintenance</Text>
        <Notice
          icon="construct-outline"
          title="Maintenance requests are coming soon"
          message="Requests from your tenants will appear here."
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
});
