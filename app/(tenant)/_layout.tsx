import { Stack } from "expo-router";

export default function TenantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="property/compare" />
      <Stack.Screen name="property/apply" />
      <Stack.Screen name="smart-match" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="become-owner" />
    </Stack>
  );
}