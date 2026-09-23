import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";

export const getAuthRedirectUrl = (path: string) => Linking.createURL(path);

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: getAuthRedirectUrl("verify-email"),
    },
  });
}

export async function resendSignupEmail(email: string) {
  return supabase.auth.resend({ type: "signup", email });
}

export async function verifySignupCode(email: string, token: string) {
  return supabase.auth.verifyOtp({ type: "signup", email, token });
}

export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl("reset-password"),
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function signInWithGoogle() {
  const redirectTo = getAuthRedirectUrl("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) return { error };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    return { error: new Error("Google sign-in was cancelled") };
  }

  const callbackUrl = new URL(result.url);
  const params = new URLSearchParams(
    callbackUrl.hash
      ? callbackUrl.hash.substring(1)
      : callbackUrl.search.substring(1),
  );
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return { error: new Error("Google sign-in did not return a session") };
  }

  return supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

export async function setSessionFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(
    parsedUrl.hash
      ? parsedUrl.hash.substring(1)
      : parsedUrl.search.substring(1),
  );
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return data.session;
}
