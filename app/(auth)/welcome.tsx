import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/useAuth";
import {
  AuthButton,
  AuthDivider,
  AuthNotice,
  AuthScreen,
} from "../../src/components/auth/AuthForm";
import { GoogleAuthButton } from "../../src/components/auth/GoogleAuthButton";
import { useAuthAction } from "../../src/hooks/use-auth-action";

export default function WelcomeScreen() {
  const router = useRouter();
  const action = useAuthAction();
  const { linkError } = useAuth();
  return (
    <AuthScreen
      title="Find a place that feels like home."
      subtitle="Discover accommodations that match your needs, budget, and lifestyle."
    >
      <AuthNotice error={action.error || linkError} />
      <AuthButton
        title="Login"
        disabled={action.busy}
        onPress={() => router.push("/(auth)/login")}
      />
      <AuthButton
        title="Create Account"
        secondary
        disabled={action.busy}
        onPress={() => router.push("/(auth)/register")}
      />
      <AuthDivider />
      <GoogleAuthButton busy={action.busy} run={action.run} />
    </AuthScreen>
  );
}
