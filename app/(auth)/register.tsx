import { useRouter } from "expo-router";
import { useAuthPrompt } from "../../src/auth/use-require-auth";
import { AuthScreen } from "../../src/components/auth/AuthForm";
import { RegisterForm } from "../../src/components/auth/AuthForms";

export default function RegisterScreen() {
  const router = useRouter();
  const prompt = useAuthPrompt();
  return (
    <AuthScreen
      title="Create your iStay account"
      subtitle={
        prompt.reason ? undefined : "A place that fits your life starts here."
      }
      reason={prompt.reason}
      onClose={prompt.close}
    >
      <RegisterForm
        onLogin={() =>
          router.push({
            pathname: "/(auth)/login",
            params: { reason: prompt.reason },
          })
        }
        onVerifyEmail={(email) =>
          router.replace({
            pathname: "/(auth)/verify-email",
            params: { email, sent: "1" },
          })
        }
      />
    </AuthScreen>
  );
}
