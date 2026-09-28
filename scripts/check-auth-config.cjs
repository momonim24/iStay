// Read-only check. Never print keys, tokens, URLs, or raw backend responses.
const fs = require("node:fs");
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Add the public Supabase URL and publishable/anon key to .env.local.",
    );
  let safe = key.startsWith("sb_publishable_");
  if (!safe) {
    try {
      safe =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch {
      /* fail closed */
    }
  }
  if (!safe)
    throw new Error(
      "Only a frontend-safe publishable or anon key is accepted.",
    );
  const response = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Supabase Auth settings returned HTTP " + response.status + ".",
    );
  const settings = await response.json();
  console.log(
    JSON.stringify(
      {
        reachable: true,
        emailProvider: settings.external?.email === true,
        googleProvider: settings.external?.google === true,
        emailConfirmationRequired: settings.mailer_autoconfirm === false,
        signupDisabled: settings.disable_signup === true,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(
    error.cause
      ? "Unable to reach Supabase Auth. Check the network and project configuration."
      : error.message,
  );
  process.exitCode = 1;
});
