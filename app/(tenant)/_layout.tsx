import { Stack } from "expo-router";
import { useRequireAuth } from "../../src/auth/use-require-auth";

export default function TenantLayout() {
  const { signedIn } = useRequireAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Public: guests can browse and inspect listings. */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="property/compare" />
      <Stack.Screen name="smart-match" />
      {/* Account-only: unreachable by URL while signed out. */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="property/apply" />
        <Stack.Screen name="application/[id]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="messages/index" />
        <Stack.Screen name="messages/[id]" />
        <Stack.Screen name="become-owner" />
        <Stack.Screen name="properties" />
      </Stack.Protected>
    </Stack>
  );
}
