export const AUTH_PATHS = [
  "auth/callback",
  "verify-email",
  "reset-password",
] as const;
export type AuthPath = (typeof AUTH_PATHS)[number];
export type AuthLink = {
  path: AuthPath;
  code: string | null;
  flowId: string | null;
  errorCode: string | null;
};
// Only accept our scheme or the exact web origin, and only known auth paths.
export function parseAuthLink(
  value: string,
  webOrigin?: string,
): AuthLink | null {
  try {
    const url = new URL(value);
    const native = url.protocol === "istay:";
    if (!native && (!webOrigin || url.origin !== webOrigin)) return null;
    const path = (native ? url.host + url.pathname : url.pathname).replace(
      /^\/+|\/+$/g,
      "",
    );
    if (!AUTH_PATHS.some((candidate) => candidate === path)) return null;
    const hash = new URLSearchParams(url.hash.slice(1));
    const param = (key: string) => url.searchParams.get(key) ?? hash.get(key);
    return {
      path: path as AuthPath,
      code: param("code"),
      flowId: param("sb_flow_id"),
      errorCode:
        param("error_code") ??
        param("error") ??
        (param("access_token") ? "invalid_link" : null),
    };
  } catch {
    return null;
  }
}
