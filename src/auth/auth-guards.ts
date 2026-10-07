import type { Session } from "@supabase/supabase-js";
// Supabase's confirmed timestamp is authoritative; user_metadata is editable.
export function isVerifiedSession(session: Session | null): boolean {
  return Boolean(
    session && !session.user.is_anonymous && session.user.email_confirmed_at,
  );
}
export function authDestination(session: Session | null, recovering: boolean) {
  if (session && recovering) return "/(auth)/reset-password" as const;
  if (isVerifiedSession(session)) return "/(tenant)/(tabs)" as const;
  if (session) return "/(auth)/verify-email" as const;
  // Signed-out visitors browse the tenant marketplace as guests.
  return "/(tenant)/(tabs)" as const;
}
