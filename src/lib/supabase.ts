import "./auth-crypto";
import { createClient, processLock } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { AuthFlowError } from "../auth/auth-errors";
import { secureStorage } from "./storage";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)?.trim();
function validConfiguration(): boolean {
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      )
    )
      return false;
    if (key.startsWith("sb_publishable_")) return true;
    // Reject secret/service-role keys even if accidentally supplied as public env.
    const payload = key.split(".")[1];
    return Boolean(
      payload &&
      JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role ===
        "anon",
    );
  } catch {
    return false;
  }
}
export const authConfigured = validConfiguration();
export const supabase =
  authConfigured && url && key
    ? createClient(url, key, {
        auth: {
          storage: secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "pkce",
          ...(Platform.OS !== "web" ? { lock: processLock } : {}),
        },
      })
    : null;
export function requireSupabase() {
  if (!supabase) throw new AuthFlowError("configuration_missing");
  return supabase;
}
