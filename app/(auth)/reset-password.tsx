import { useState } from "react";
import { validatePassword } from "../../src/auth/auth-validation";
import { useAuth } from "../../src/auth/useAuth";
import {
  AuthButton,
  AuthInput,
  AuthLink,
  AuthNotice,
  AuthScreen,
} from "../../src/components/auth/AuthForm";
import { useAuthAction } from "../../src/hooks/use-auth-action";
import { updatePassword } from "../../src/services/auth.service";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const { session, recovering, linkError, completeRecovery, signOut } =
    useAuth();
  const action = useAuthAction();
  const ready = Boolean(session && recovering && !linkError);
  const update = () => {
    if (!ready) return;
    const invalid = validatePassword(password, confirmation);
    if (invalid) {
      action.setError(invalid);
      return;
    }
    void action.run(async () => {
      const { error } = await updatePassword(password);
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      await completeRecovery();
    });
  };
  return (
    <AuthScreen
      title="Create a new password"
      subtitle="Use at least 8 characters, including letters and numbers."
    >
      {!ready ? (
        <>
          <AuthNotice
            error={
              linkError ||
              "Open a valid password-reset link from your email to continue. If it expired, request a new one on this device."
            }
          />
          {session && recovering ? (
            <AuthButton
              title="Cancel and return to Login"
              onPress={() => void action.run(signOut)}
              busy={action.busy}
            />
          ) : (
            <AuthLink href="/(auth)/forgot-password">
              Request a new reset link
            </AuthLink>
          )}
        </>
      ) : (
        <>
          <AuthInput
            label="New password"
            password
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!action.busy}
          />
          <AuthInput
            label="Confirm new password"
            password
            value={confirmation}
            onChangeText={setConfirmation}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!action.busy}
            returnKeyType="go"
            onSubmitEditing={update}
          />
          <AuthNotice error={action.error} />
          <AuthButton
            title="Update password and continue"
            busy={action.busy}
            onPress={update}
          />
          <AuthButton
            title="Cancel and sign out"
            secondary
            disabled={action.busy}
            onPress={() => void action.run(signOut)}
          />
        </>
      )}
      {!session ? (
        <AuthLink href="/(auth)/login">Back to Login</AuthLink>
      ) : null}
    </AuthScreen>
  );
}
