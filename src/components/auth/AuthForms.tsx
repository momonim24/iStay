import { useState } from "react";
import { authErrorCode } from "../../auth/auth-errors";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "../../auth/auth-validation";
import { useAuth } from "../../auth/useAuth";
import { useAuthAction } from "../../hooks/use-auth-action";
import { useAuthCooldown } from "../../hooks/use-auth-cooldown";
import { authConfigured } from "../../lib/supabase";
import { signInWithEmail, signUpWithEmail } from "../../services/auth.service";
import {
  AuthButton,
  AuthDivider,
  AuthInput,
  AuthNotice,
  AuthTextLink,
} from "./AuthForm";
import { GoogleAuthButton } from "./GoogleAuthButton";

// The single implementation of email/Google sign-in and registration. The
// (auth) routes and the marketplace pop-up both render these forms and only
// differ in how they move between steps.
export function LoginForm({
  onRegister,
  onForgotPassword,
  onVerifyEmail,
}: {
  onRegister: () => void;
  onForgotPassword: () => void;
  onVerifyEmail: (email: string) => void;
}) {
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
        onVerifyEmail(normalizeEmail(email));
        return;
      }
      if (error) throw error;
      // The root navigator responds to Supabase's SIGNED_IN event: the auth UI
      // closes and the user continues where they left off.
    });
  };
  return (
    <>
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
        title="Log In"
        busy={action.busy}
        disabled={!authConfigured}
        onPress={login}
      />
      <AuthTextLink onPress={onForgotPassword}>Forgot password?</AuthTextLink>
      <AuthDivider />
      <GoogleAuthButton busy={action.busy} run={action.run} />
      <AuthTextLink onPress={onRegister}>
        Don't have an account? Sign up
      </AuthTextLink>
    </>
  );
}

export function RegisterForm({
  onLogin,
  onVerifyEmail,
}: {
  onLogin: () => void;
  onVerifyEmail: (email: string) => void;
}) {
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
        onVerifyEmail(normalizeEmail(email));
      }
    });
  };
  return (
    <>
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
      <AuthTextLink onPress={onLogin}>
        Already have an account? Log in
      </AuthTextLink>
    </>
  );
}
