import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider } from "../src/auth/AuthProvider";
import { isVerifiedSession } from "../src/auth/auth-guards";
import { useAuth } from "../src/auth/useAuth";
import LoadingSplash from "../src/components/SplashScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  AuthButton,
  AuthNotice,
  AuthScreen,
} from "../src/components/auth/AuthForm";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthNavigator() {
  const {
    session,
    loading,
    handlingLink,
    recovering,
    initializationError,
    retryInitialization,
    linkError,
    clearLinkError,
  } = useAuth();
  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);
  if (loading || handlingLink) return <LoadingSplash />;
  if (initializationError)
    return (
      <AuthScreen title="Let's reconnect">
        <AuthNotice error={initializationError} />
        <AuthButton title="Try again" onPress={retryInitialization} />
      </AuthScreen>
    );
  const verified = isVerifiedSession(session);
  if (verified && !recovering && linkError) {
    return (
      <AuthScreen title="We couldn't open this link">
        <AuthNotice error={linkError} />
        <AuthButton title="Return to iStay" onPress={clearLinkError} />
      </AuthScreen>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/callback" />
      <Stack.Protected guard={!verified || recovering}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={verified && !recovering}>
        <Stack.Screen name="(tenant)" />
      </Stack.Protected>
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AuthNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}