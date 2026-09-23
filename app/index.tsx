import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useAuth } from "../src/auth/useAuth";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { loading, session, user } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  if (session && user && !user.email_confirmed_at) {
    return (
      <Redirect
        href={{
          pathname: "/(auth)/verify-email",
          params: { email: user.email ?? "" },
        }}
      />
    );
  }

  return <Redirect href={session ? "/(tenant)/(tabs)" : "/(auth)/welcome"} />;
}
