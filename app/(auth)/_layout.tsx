import { Redirect, Stack, useSegments } from "expo-router";
import { useAuth } from "../../src/auth/useAuth";
export default function AuthLayout() {
  const { session, recovering } = useAuth();
  const segments = useSegments();
  const current = segments[segments.length - 1];
  if (session && recovering && current !== "reset-password")
    return <Redirect href="/(auth)/reset-password" />;
  if (
    session &&
    !recovering &&
    !session.user.email_confirmed_at &&
    current !== "verify-email"
  )
    return <Redirect href="/(auth)/verify-email" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
