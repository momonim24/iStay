import { useLocalSearchParams } from "expo-router";
import { useRequireAuth } from "../../../src/auth/use-require-auth";
import { ApplicationList } from "../../../src/components/application-list";
import { AuthGate } from "../../../src/components/auth/AuthGate";

export default function ApplicationsScreen() {
  const { submitted } = useLocalSearchParams<{ submitted?: string }>();
  const { signedIn } = useRequireAuth();
  if (!signedIn)
    return (
      <AuthGate
        title="My Applications"
        icon="document-text-outline"
        heading="Track your applications"
        reason="Log in to view your applications."
      />
    );
  return <ApplicationList mode="tenant" submitted={submitted === "1"} />;
}
