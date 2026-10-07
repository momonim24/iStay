import { router, useLocalSearchParams } from "expo-router";
import { isVerifiedSession } from "./auth-guards";
import { clearIntent, rememberIntent, type AuthIntent } from "./auth-intent";
import { openAuthModal } from "./auth-modal-store";
import { useAuth } from "./useAuth";

// Guests may browse; account actions call requireAuth() first.
export function useRequireAuth() {
  const { session, recovering } = useAuth();
  const signedIn = isVerifiedSession(session) && !recovering;
  return {
    signedIn,
    // Returns true when the action may proceed. Otherwise opens the Log in
    // pop-up over the current screen with the reason shown, and remembers
    // where to continue afterwards.
    requireAuth(
      reason: string,
      next?: AuthIntent,
      mode: "login" | "register" = "login",
    ): boolean {
      if (signedIn) return true;
      rememberIntent(next ?? null);
      openAuthModal(reason, mode);
      return false;
    },
  };
}

// For the Log in / Sign up screens: why the user was asked, and a way back.
export function useAuthPrompt() {
  const params = useLocalSearchParams<{ reason?: string | string[] }>();
  const reason =
    typeof params.reason === "string" ? params.reason.slice(0, 120) : "";
  return {
    reason,
    close() {
      clearIntent();
      if (router.canGoBack()) router.back();
      else router.replace("/(tenant)/(tabs)");
    },
  };
}
