import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { normalizeEmail, validateEmail } from "../../src/auth/auth-validation";
import { useAuth } from "../../src/auth/useAuth";
import {
  AuthButton,
  AuthInput,
  AuthLink,
  AuthNotice,
  AuthScreen,
} from "../../src/components/auth/AuthForm";
import { useAuthAction } from "../../src/hooks/use-auth-action";
import { useAuthCooldown } from "../../src/hooks/use-auth-cooldown";
import { authConfigured } from "../../src/lib/supabase";
import { resendSignupEmail } from "../../src/services/auth.service";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; sent?: string }>();
  const { user, session, signOut, linkError, clearLinkError } = useAuth();
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : (user?.email ?? ""),
  );
  const action = useAuthAction();
  const cooldown = useAuthCooldown("verify:" + normalizeEmail(email));
  const resend = () => {
    const invalid = validateEmail(email);
    if (invalid) {
      action.setError(invalid);
      return;
    }
    if (cooldown.seconds) return;
    void action.run(async () => {
      cooldown.start(); // Throttle failures too; the server is the final limit.
      clearLinkError();
      const { error } = await resendSignupEmail(email);
      if (error) throw error;
      action.setMessage(
        "If this address has an unverified account, a new verification link is on its way. Check your inbox and spam folder.",
      );
    });
  };
  return (
    <AuthScreen
      title="Check your email"
      subtitle={
        params.sent === "1"
          ? "Check the address below for your iStay verification link."
          : "Verify your email to finish signing in. You can request a new link below."
      }
    >
      <AuthInput
        label="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!action.busy && !session}
      />
      <AuthNotice error={action.error || linkError} message={action.message} />
      <AuthButton
        title={
          cooldown.seconds
            ? `Resend in ${cooldown.seconds}s`
            : "Resend verification email"
        }
        busy={action.busy}
        disabled={!authConfigured || cooldown.seconds > 0}
        onPress={resend}
      />
      <AuthNotice message="Open the latest link on the same device where you requested it. Check spam or junk if it hasn't arrived. Already verified elsewhere? Return to Login." />
      {session ? (
        <AuthButton
          title="Use another account"
          secondary
          busy={action.busy}
          onPress={() => void action.run(signOut)}
        />
      ) : (
        <>
          <AuthLink href="/(auth)/login">Back to Login</AuthLink>
          <AuthLink href="/(auth)/register">
            Use a different email to register
          </AuthLink>
        </>
      )}
    </AuthScreen>
  );
}
