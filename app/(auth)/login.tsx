import { useRouter } from "expo-router";
import { useAuthPrompt } from "../../src/auth/use-require-auth";
import { AuthScreen } from "../../src/components/auth/AuthForm";
import { LoginForm } from "../../src/components/auth/AuthForms";

export default function LoginScreen() {
  const router = useRouter();
  const prompt = useAuthPrompt();
  return (
    <AuthScreen
      title="Welcome back"
      subtitle={prompt.reason ? undefined : "Log in to find your next home."}
      reason={prompt.reason}
      onClose={prompt.close}
    >
      <LoginForm
        onRegister={() =>
          router.push({
            pathname: "/(auth)/register",
            params: { reason: prompt.reason },
          })
        }
        onForgotPassword={() => router.push("/(auth)/forgot-password")}
        onVerifyEmail={(email) =>
          router.push({ pathname: "/(auth)/verify-email", params: { email } })
        }
      />
    </AuthScreen>
  );
}
