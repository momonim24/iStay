import { Redirect } from "expo-router";
import { authDestination } from "../src/auth/auth-guards";
import { useAuth } from "../src/auth/useAuth";
export default function Index() {
  const { session, recovering, linkError } = useAuth();
  // A failed sign-in link still needs a screen that can explain it.
  if (!session && linkError) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href={authDestination(session, recovering)} />;
}
