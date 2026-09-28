import { Redirect } from "expo-router";
import { authDestination } from "../src/auth/auth-guards";
import { useAuth } from "../src/auth/useAuth";
export default function Index() {
  const { session, recovering } = useAuth();
  return <Redirect href={authDestination(session, recovering)} />;
}
