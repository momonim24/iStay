import { useRouter } from "expo-router";
import { useState } from "react";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "../../src/auth/auth-validation";
import { useAuth } from "../../src/auth/useAuth";
import {
  AuthButton,
  AuthDivider,
  AuthInput,
  AuthLink,
  AuthNotice,
  AuthScreen,
} from "../../src/components/auth/AuthForm";
import { GoogleAuthButton } from "../../src/components/auth/GoogleAuthButton";
import { useAuthAction } from "../../src/hooks/use-auth-action";
import { useAuthCooldown } from "../../src/hooks/use-auth-cooldown";
import { authConfigured } from "../../src/lib/supabase";
import { signUpWithEmail } from "../../src/services/auth.service";

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const action = useAuthAction();
  const cooldown = useAuthCooldown("verify:" + normalizeEmail(email));
  const { clearLinkError } = useAuth();
  const register = () => {
    const invalid = !fullName.trim()
      ? "Enter your full name."
      : validateEmail(email) || validatePassword(password, confirmation);
    if (invalid) {
      action.setError(invalid);
      return;
    }
    void action.run(async () => {
      clearLinkError();
      const { data, error } = await signUpWithEmail(email, password, fullName);
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      if (!data.session) {
        cooldown.start();
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: normalizeEmail(email), sent: "1" },
        });
      }
    });
  };
  return (
    <AuthScreen
      title="Create your iStay account"
      subtitle="A place that fits your life starts here."
    >
      <AuthInput
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        editable={!action.busy}
      />
      <AuthInput
        label="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!action.busy}
      />
      <AuthInput
        label="Password"
        password
        placeholder="At least 8 characters, letters and numbers"
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!action.busy}
      />
      <AuthInput
        label="Confirm password"
        password
        value={confirmation}
        onChangeText={setConfirmation}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!action.busy}
        returnKeyType="go"
        onSubmitEditing={register}
      />
      <AuthNotice error={action.error} />
      <AuthButton
        title="Create Account"
        busy={action.busy}
        disabled={!authConfigured}
        onPress={register}
      />
      <AuthDivider />
      <GoogleAuthButton busy={action.busy} run={action.run} />
      <AuthLink href="/(auth)/login">Already have an account? Login</AuthLink>
    </AuthScreen>
  );
}
