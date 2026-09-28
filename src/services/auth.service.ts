import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { AuthFlowError } from "../auth/auth-errors";
import type { AuthLink, AuthPath } from "../auth/auth-links";
import { normalizeEmail } from "../auth/auth-validation";
import { requireSupabase } from "../lib/supabase";

export function getAuthRedirectUrl(path: AuthPath) {
  if (Platform.OS === "web") return Linking.createURL(path);
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    throw new AuthFlowError("native_build_required");
  return `istay://${path}`;
}
export function signInWithEmail(email: string, password: string) {
  return requireSupabase().auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
}
export function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
) {
  return requireSupabase().auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: getAuthRedirectUrl("verify-email"),
    },
  });
}
export function resendSignupEmail(email: string) {
  return requireSupabase().auth.resend({
    type: "signup",
    email: normalizeEmail(email),
    options: { emailRedirectTo: getAuthRedirectUrl("verify-email") },
  });
}
export function requestPasswordReset(email: string) {
  return requireSupabase().auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: getAuthRedirectUrl("reset-password"),
  });
}
export function updatePassword(password: string) {
  return requireSupabase().auth.updateUser({ password });
}

// The provider is the sole owner of callback processing and session routing.
export async function signInWithGoogle(): Promise<string | null> {
  const redirectTo = getAuthRedirectUrl("auth/callback");
  const { data, error } = await requireSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (Platform.OS === "web") {
    window.location.assign(data.url);
    return null;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "cancel" || result.type === "dismiss") return null;
  if (result.type !== "success") throw new AuthFlowError("access_denied");
  return result.url;
}
export async function exchangeAuthLink(link: AuthLink) {
  if (link.errorCode) throw new AuthFlowError(link.errorCode);
  if (!link.code) throw new AuthFlowError("invalid_link");
  const { data, error } = await requireSupabase().auth.exchangeCodeForSession(
    link.code,
    link.flowId ? { flowId: link.flowId } : undefined,
  );
  if (error) throw error;
  if (!data.session) throw new AuthFlowError("invalid_link");
  return {
    session: data.session,
    recovering: "redirectType" in data && data.redirectType === "recovery",
  };
}
