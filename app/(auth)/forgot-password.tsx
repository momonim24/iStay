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
import { requestPasswordReset } from "../../src/services/auth.service";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const action = useAuthAction();
  const cooldown = useAuthCooldown("reset:" + normalizeEmail(email));
  const { clearLinkError } = useAuth();
  const send = () => {
    const invalid = validateEmail(email);
    if (invalid) {
      action.setError(invalid);
      return;
    }
    if (cooldown.seconds) return;
    void action.run(async () => {
      clearLinkError();
      cooldown.start();
      const { error } = await requestPasswordReset(email);
      if (error) throw error;
      action.setMessage(
        "If an account uses this email, you'll receive a reset link. Open the latest link on this device. Remember to check spam or junk.",
      );
    });
  };
  return (
    <AuthScreen
      title="Forgot your password?"
      subtitle="Enter your email and we'll help you recover your account."
    >
      <AuthInput
        label="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!action.busy}
        returnKeyType="send"
        onSubmitEditing={send}
      />
      <AuthNotice error={action.error} message={action.message} />
      <AuthButton
        title={
          cooldown.seconds
            ? `Send again in ${cooldown.seconds}s`
            : "Send reset link"
        }
        busy={action.busy}
        disabled={!authConfigured || cooldown.seconds > 0}
        onPress={send}
      />
      <AuthLink href="/(auth)/login">Back to Login</AuthLink>
    </AuthScreen>
  );
}
