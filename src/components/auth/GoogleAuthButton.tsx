import { useAuth } from "../../auth/useAuth";
import { signInWithGoogle } from "../../services/auth.service";
import { authConfigured } from "../../lib/supabase";
import { AuthButton } from "./AuthForm";
export function GoogleAuthButton({
  busy,
  run,
}: {
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
}) {
  const { handleAuthUrl, clearLinkError } = useAuth();
  return (
    <AuthButton
      title="Continue with Google"
      secondary
      busy={busy}
      disabled={!authConfigured}
      onPress={() =>
        void run(async () => {
          clearLinkError();
          const url = await signInWithGoogle();
          if (url) await handleAuthUrl(url);
        })
      }
    />
  );
}
