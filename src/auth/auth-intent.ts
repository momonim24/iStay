// Where a guest was heading when sign-in was required. Kept in memory only and
// limited to an allow-list of tenant routes, so it can never become an open
// redirect or carry anything across accounts or app restarts.
export type AuthIntent =
  | {
      pathname: "/(tenant)/property/apply";
      params: { propertyId: string; roomId?: string };
    }
  | { pathname: "/(tenant)/become-owner" };

const LIFETIME = 15 * 60 * 1000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let pending: { intent: AuthIntent; expires: number } | null = null;
let favorite: { propertyId: string; expires: number } | null = null;

export function validIntent(intent: unknown): intent is AuthIntent {
  if (!intent || typeof intent !== "object") return false;
  const value = intent as { pathname?: unknown; params?: unknown };
  if (value.pathname === "/(tenant)/become-owner")
    return value.params === undefined;
  if (value.pathname !== "/(tenant)/property/apply") return false;
  const params = value.params as Record<string, unknown> | undefined;
  return (
    !!params &&
    Object.keys(params).every((key) =>
      ["propertyId", "roomId"].includes(key),
    ) &&
    typeof params.propertyId === "string" &&
    uuid.test(params.propertyId) &&
    (params.roomId === undefined ||
      (typeof params.roomId === "string" && uuid.test(params.roomId)))
  );
}
export function rememberIntent(intent: AuthIntent | null, now = Date.now()) {
  pending =
    intent && validIntent(intent) ? { intent, expires: now + LIFETIME } : null;
}
export function clearIntent() {
  pending = null;
  favorite = null;
}
// A property the guest tried to save. Only ever replayed as an idempotent
// "add", so it cannot remove a favorite or create a duplicate.
export function rememberFavorite(propertyId: string, now = Date.now()) {
  favorite = uuid.test(propertyId)
    ? { propertyId, expires: now + LIFETIME }
    : null;
}
export function takeFavorite(now = Date.now()): string | null {
  const current = favorite;
  favorite = null;
  return current && now <= current.expires ? current.propertyId : null;
}
// Single use: reading the intent always forgets it.
export function takeIntent(now = Date.now()): AuthIntent | null {
  const current = pending;
  pending = null;
  return current && now <= current.expires ? current.intent : null;
}
