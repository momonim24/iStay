import { Redirect } from "expo-router";
import { authDestination } from "../../src/auth/auth-guards";
import { useAuth } from "../../src/auth/useAuth";
import {
  AuthLink,
  AuthNotice,
  AuthScreen,
} from "../../src/components/auth/AuthForm";
export default function AuthCallbackScreen() {
  const { session, recovering, linkError } = useAuth();
  if (!linkError && session)
    return <Redirect href={authDestination(session, recovering)} />;
  return (
    <AuthScreen title="Sign-in link">
      <AuthNotice
        error={
          linkError ??
          "This sign-in link is incomplete. Please return to Login and try again."
        }
      />
      <AuthLink href="/(auth)/login">Back to Login</AuthLink>
      <AuthLink href="/(auth)/forgot-password">
        Request a password reset
      </AuthLink>
    </AuthScreen>
  );
}
