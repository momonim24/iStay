import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider } from "../src/auth/AuthProvider";
import { isVerifiedSession } from "../src/auth/auth-guards";
import { takeIntent } from "../src/auth/auth-intent";
import { useAuth } from "../src/auth/useAuth";
import { AuthModal } from "../src/components/auth/AuthModal";
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
  const router = useRouter();
  const signedIn = isVerifiedSession(session) && !recovering;
  const ready = !loading && !handlingLink && !initializationError;
  // Continue what a guest was doing when sign-in was required (e.g. Apply).
  useEffect(() => {
    if (!signedIn || !ready) return;
    const next = takeIntent();
    if (!next) return;
    const timer = setTimeout(() => router.push(next), 0);
    return () => clearTimeout(timer);
  }, [signedIn, ready, router]);
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
      {/* Guests may browse the tenant marketplace; its account-only screens
          are guarded again inside the (tenant) layout. */}
      <Stack.Protected guard={!recovering}>
        <Stack.Screen name="(tenant)" />
      </Stack.Protected>
      <Stack.Protected guard={!verified || recovering}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(owner)" />
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
        {/* Log in / Sign up pop-up for protected actions while browsing. */}
        <AuthModal />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
