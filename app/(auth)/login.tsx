import { useRouter } from "expo-router";
import { useState } from "react";
import { authErrorCode } from "../../src/auth/auth-errors";
import { normalizeEmail, validateEmail } from "../../src/auth/auth-validation";
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
import { authConfigured } from "../../src/lib/supabase";
import { signInWithEmail } from "../../src/services/auth.service";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const action = useAuthAction();
  const { clearLinkError } = useAuth();
  const login = () => {
    const invalid =
      validateEmail(email) || (!password ? "Enter your password." : null);
    if (invalid) {
      action.setError(invalid);
      return;
    }
    void action.run(async () => {
      clearLinkError();
      const { data, error } = await signInWithEmail(email, password);
      if (
        authErrorCode(error) === "email_not_confirmed" ||
        (!error && data.user && !data.user.email_confirmed_at)
      ) {
        router.push({
          pathname: "/(auth)/verify-email",
          params: { email: normalizeEmail(email) },
        });
        return;
      }
      if (error) throw error;
      // The protected root navigator responds to Supabase's SIGNED_IN event.
    });
  };
  return (
    <AuthScreen title="Welcome back" subtitle="Log in to find your next home.">
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
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        editable={!action.busy}
        returnKeyType="go"
        onSubmitEditing={login}
      />
      <AuthNotice error={action.error} />
      <AuthButton
        title="Login"
        busy={action.busy}
        disabled={!authConfigured}
        onPress={login}
      />
      <AuthLink href="/(auth)/forgot-password">Forgot Password?</AuthLink>
      <AuthDivider />
      <GoogleAuthButton busy={action.busy} run={action.run} />
      <AuthLink href="/(auth)/register">
        Don't have an account? Create Account
      </AuthLink>
    </AuthScreen>
  );
}
