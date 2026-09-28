# iStay authentication implementation and setup

## 1. Inspection results

Inspected the repository before editing, including both layouts, all six existing auth pages, the tenant tab routes, Profile, Home, native splash configuration, assets, dependencies, strict TypeScript settings, environment variable names, hooks, stores, services and config placeholders.

The project already used Expo 57.0.20, Expo Router 57, React Native 0.86.3, React 19.2.3 and TypeScript 6. Supabase JS 2.117.2, SecureStore, Linking, WebBrowser and Safe Area Context were installed. There was an AuthProvider, Supabase client and basic service calls, but no protected routes, no OAuth callback route, incomplete session/link handling, minimal validation, no resend throttling and no logout. The existing reset form could become ready without a recovery session. Most domain services/stores/types and config/*.ts were empty placeholders.

The iStay logo, white native splash and `istay` scheme were already correct. They were retained, as were the tenant hierarchy and screens other than the small Profile update. No database schema, RLS policies, property functionality or AI features were added.

Pre-existing changes included package.json/package-lock.json and an unmerged Git index entry for welcome.tsx. The working Welcome file now combines the logo and Google button with the requested flow. No staging, commit or merge completion was performed.

Read the required [Expo v57 docs](https://docs.expo.dev/versions/v57.0.0/) and current Supabase guidance. Used the existing [Supabase skill](../.agents/skills/supabase/SKILL.md).

## 2. Files created

| Path                                     | Purpose                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| .env.example                             | Public configuration names without real values                    |
| app/auth/callback.tsx                    | OAuth callback result/error route                                 |
| src/auth/auth-errors.ts                  | Safe error codes and user-facing messages                         |
| src/auth/auth-links.ts                   | Strict callback scheme, origin and path parsing                   |
| src/auth/auth-validation.ts              | Email normalization and password checks                           |
| src/components/auth/AuthForm.tsx         | Shared responsive screen, input, button, notice and link controls |
| src/components/auth/GoogleAuthButton.tsx | Shared Google flow using the provider's callback handler          |
| src/hooks/use-auth-action.ts             | Loading, error/success state and immediate duplicate-submit lock  |
| src/hooks/use-auth-cooldown.ts           | Per-address 60-second resend/reset cooldown                       |
| src/lib/auth-crypto.ts                   | Native secure randomness and SHA-256 for Supabase PKCE            |
| scripts/check-auth-config.cjs            | Read-only live provider/confirmation check; prints no credentials |
| tests/auth.test.cjs                      | Auth regression tests using Node's built-in test runner           |
| docs/AUTHENTICATION.md                   | This implementation report, setup and acceptance tests            |

## 3. Files modified

| Path                            | Change                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| .gitignore                      | Ignore all actual environment files; retain .env.example                                                       |
| package.json                    | Add expo-crypto and typecheck/test:auth/auth:check scripts                                                     |
| package-lock.json               | Record the compatible crypto installation; preserve the existing Supabase update                               |
| app/_layout.tsx                 | Hold startup splash, handle restore errors, protect auth/tenant stacks                                         |
| app/index.tsx                   | Single state-based default destination                                                                         |
| app/(auth)/_layout.tsx          | Keep active recovery on Reset Password and unconfirmed sessions on Verification                                |
| app/(auth)/welcome.tsx          | Existing logo, tagline, Login, Create Account and Google                                                       |
| app/(auth)/login.tsx            | Validation, visibility control, unverified-email handling and Google                                           |
| app/(auth)/register.tsx         | Full name, matching passwords, signup metadata and Google                                                      |
| app/(auth)/verify-email.tsx     | Email links, editable recipient when logged out, resend cooldown and notices                                   |
| app/(auth)/forgot-password.tsx  | Reset request, validation, cooldown and neutral success message                                                |
| app/(auth)/reset-password.tsx   | Only allow updates during authenticated recovery; validate and finish recovery                                 |
| app/(tenant)/(tabs)/profile.tsx | Display authenticated identity and add Logout without redesign                                                 |
| src/auth/AuthProvider.tsx       | Restore/validate sessions, subscribe to Auth, process links, refresh in foreground, persist recovery, sign out |
| src/auth/auth-context.ts        | Minimal additional initialization/link/recovery operations                                                     |
| src/auth/auth-guards.ts         | Populate existing placeholder with session-based routing helpers                                               |
| src/auth/auth-storage.ts        | Populate placeholder with chunked secure session storage                                                       |
| src/lib/storage.ts              | Native SecureStore plus web localStorage adapter                                                               |
| src/lib/supabase.ts             | Graceful missing config, public-key checks, PKCE and native auth locking                                       |
| src/services/auth.service.ts    | Real Supabase email, Google, resend, recovery and code-exchange calls                                          |
| README.md                       | Point to the complete setup guide                                                                              |

.env.local and app.json were not changed.

## 4. Packages installed

Installed `expo-crypto ~57.0.3` with:

```powershell
npx expo install expo-crypto
```

It supplies native secure randomness and SHA-256 for S256 PKCE. The installed Expo runtime already supplies URL/URLSearchParams, so no URL polyfill was added. No state library, test framework, alternate auth provider or Google native SDK was installed. The existing @supabase/ssr dependency was left alone; the mobile client uses @supabase/supabase-js.

## 5. Authentication flow

- Startup: native splash → restore and validate saved Supabase session → Home for confirmed users, Welcome otherwise. A restore/network error offers Retry rather than briefly showing the wrong screen.
- Registration: validate full name/email/passwords → Supabase signup with full_name metadata → Verification when confirmation is required → open latest email link → exchange code → Home.
- Login: Supabase password sign-in → Home. The `email_not_confirmed` error opens Verification with only the email address.
- Google: browser OAuth through Supabase → app callback → PKCE exchange → Home. Supabase-confirmed Google users bypass the separate email verification screen. Closing the native browser leaves the user on the form.
- Password recovery: request email → reset callback → actual Supabase recovery session → new password → updateUser → clear recovery state → Home. Recovery intent persists across app restarts. Cancel signs out.
- Logout: Supabase local-scope sign-out clears this device's session and protected navigation returns to Welcome. Other devices remain signed in.

The provider handles initial and foreground links and deduplicates callbacks delivered by both Linking and WebBrowser. It never awaits another Auth call inside onAuthStateChange. A known callback with no code is not treated as authentication.

Native sessions stay in SecureStore, split into small entries with a manifest published last. Web preview uses localStorage. Supabase owns password storage. Passwords remain only in form memory during entry and are never put in routes, logs or persistent app storage. Full-name metadata is display data, never authorization data.

Route guards are navigation controls. Future database access must be protected by RLS independently.

## 6. Environment variables

Names only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — existing legacy fallback if the publishable variable is empty

Keep the existing .env.local. On a new checkout, copy .env.example to .env.local, then fill the public values from Supabase. The publishable value takes precedence. Never put a service_role/sb_secret_ key or Google client secret in these files. Expo embeds EXPO_PUBLIC variables in the app.

Restart Metro after changing environment values. A distributable build must be rebuilt with the correct public values.

## 7. Supabase setup — manual configuration

Observed with a read-only Auth settings request on September 28, 2026: project reachable; Email enabled; signups enabled; email confirmation required; **Google disabled**. This check cannot read your redirect allowlist, SMTP settings or Google credentials.

1. Open [Supabase Dashboard](https://supabase.com/dashboard). Use your existing project. Only create a new project if you intend to replace it; choose your organization, project name, region and a database password kept outside the mobile app.
2. Open the project's **Connect** dialog and copy **Project URL** into EXPO_PUBLIC_SUPABASE_URL.
3. In **Project Settings → API Keys**, copy the **publishable** key into EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. The existing legacy **anon** key also works through EXPO_PUBLIC_SUPABASE_ANON_KEY. Do not copy the secret or service_role key.
4. Open **Authentication → Sign In / Providers → Email**. Enable Email/password sign-in. Keep **Confirm email** enabled. Keep new-user signup enabled.
5. Set the server's minimum password length to at least 8. The app also requires letters and numbers; configure compatible password rules in Auth settings.
6. Open **Authentication → URL Configuration**. For a mobile-only test project you can use `istay://auth/callback` as the default Site URL. If you have a real web app, use its HTTPS origin instead. Explicit redirect values below are supplied by the code.
7. Add these exact **Redirect URLs**:
   - `istay://auth/callback`
   - `istay://verify-email`
   - `istay://reset-password`
8. For web preview on port 8081, also add:
   - `http://localhost:8081/auth/callback`
   - `http://localhost:8081/verify-email`
   - `http://localhost:8081/reset-password`
     Use that exact browser host/port throughout a flow. Add equivalent exact HTTPS URLs for a deployed web app. Do not add broad production wildcard redirects.
9. Keep the standard **Confirm signup** and **Reset password** email links using `{{ .ConfirmationURL }}`. No custom OTP template is required. If an older customized template hardcodes a website or uses SiteURL in place of the confirmation URL, restore the normal confirmation link so the requested redirect is honored.
10. Configure **Authentication → Email → SMTP Settings** with a verified sender for non-team test users. Supabase's default mail service restricts recipients and rate limits; it is not a general production email service. See [SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).
11. Enable Google and save the credentials using section 8.
12. Run `npm run auth:check` again. Expected flags: emailProvider=true, googleProvider=true, emailConfirmationRequired=true, signupDisabled=false.

The existing app.json scheme registers `istay://` in an installed native build. Rebuild after native configuration/dependency changes. Expo Go does not register your own custom scheme; the app gives a clear message for email-link and Google flows there.

## 8. Google OAuth setup — manual configuration

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select/create the project used for iStay.
2. Open **Google Auth Platform** (or **APIs & Services → OAuth consent screen**). Set the app name to iStay, support email and developer contact.
3. Choose **External** audience for ordinary Google accounts. While publishing status is **Testing**, add each tester under **Audience → Test users**. A school/workspace-only Internal app restricts who can sign in.
4. Use the basic identity scopes: openid, email and profile. No Gmail, Drive or other user-data scope is needed.
5. Open **Clients → Create client → Web application**. The implemented flow uses Supabase's browser OAuth, so this is a web OAuth client even for iOS/Android.
6. In Supabase's **Authentication → Sign In / Providers → Google**, copy the displayed callback URL. It normally has the form `https://<project-ref>.supabase.co/auth/v1/callback`; use the actual displayed value, especially with a custom Auth domain.
7. Add that HTTPS URL to the Google client's **Authorized redirect URIs**. Do not put an istay:// URL in Google's web-client redirect URI list.
8. Authorized JavaScript origins are not used by the native browser-redirect flow. If configuring the web preview as well, add `http://localhost:8081` and your production web origin as applicable.
9. Copy the **Client ID** and **Client Secret** into the Supabase Google provider settings. Enable the provider and Save. Neither belongs in mobile code; the secret stays in Supabase.
10. Keep nonce checks enabled. Recheck branding/publishing requirements before releasing beyond test accounts.
11. Test both a new Google user and a returning one. Do not assume a Google account will bypass Supabase confirmation unless Auth returns a confirmed session.

See [Supabase's Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 9. How to run

From C:\iStay, using Node 22.13+ (validated here with Node 24):

```powershell
npm install
npm run typecheck
npm run test:auth
npm run auth:check
npm run web -- --port 8081
```

For Android, install Android Studio/SDK, configure an emulator or connect a device, then:

```powershell
npx expo run:android
```

Expo may prompt for an Android application ID because none is configured yet. Choose a stable identifier you own and keep it for future builds.

For iOS on macOS with Xcode:

```sh
npx expo run:ios
```

Choose a stable iOS bundle identifier if prompted. Windows cannot build/run the iOS simulator locally; use a Mac or an EAS native build for an iPhone. After building, subsequent JS work can use `npm start`. If using an expo-dev-client build, use `npx expo start --dev-client`; this implementation does not add that optional package.

Bundle checks:

```powershell
npx expo export --platform web
npx expo export --platform android --platform ios --output-dir dist/native
```

## 10. How to test

Automated verification completed: strict TypeScript check, 18 auth regression tests, static web export, Android/iOS JS and Hermes bundle exports, and the live read-only Auth settings check. Tests cover route decisions, trusted confirmation state, callback allowlists, validation, friendly errors, secure-storage persistence/failure, redirects, cancellation, and the installed SDK's S256 recovery exchange. SDK/network fakes are confined to tests; application auth uses real Supabase.

No connected browser or native device was available. The following end-to-end and visual acceptance tests remain to be performed with real accounts.

1. **Registration:** logged out → Create Account → enter full name, unused email, matching password with letters/numbers → submit once → Verification. Check Auth → Users shows an unconfirmed user. Open the newest email link on the same device → app opens → Home; check confirmed status.
2. **Login:** logout → Login with the confirmed account → Home. Repeat with a wrong password and unknown email; both show the neutral credentials message.
3. **Unverified account:** register another address but do not confirm. Return to Login → enter its password → Verification. Resend, observe the cooldown, open the newest link → Home.
4. **Google:** after configuration, Continue with Google from Welcome, Login and Register → select a tester account → Home, without the separate verification page. Repeat with a returning Google user. Cancel once and confirm the form remains usable.
5. **Recovery:** logout → Forgot Password → send reset email → open latest link on the requesting device → set matching valid new password → Home. Logout and verify the new password works and the old one fails.
6. **Recovery restart:** open a valid reset link, close/reopen the app before submitting → Reset Password remains active. Cancel → Welcome. Manually opening Reset Password without a valid recovery session must not permit a password change.
7. **Persistence:** login → fully close app → reopen online → splash then Home, without Welcome flashing. Verify Profile shows the correct identity.
8. **Logout:** Profile → Logout → Welcome. Back navigation must not restore a tenant screen.
9. **Protection:** while logged out, open `istay://profile`, `istay://search` or `istay://property/test` → Welcome. On web, directly open /profile or /search while logged out. Opening /login with a confirmed session should return to Home.
10. **Validation:** blank full name, malformed email, empty password, short/no-number password and mismatched confirmation should show clear errors and make no request. Toggle both password controls and test autofill.
11. **Duplicate registration:** register an existing email. Supabase may deliberately return a neutral response to avoid account enumeration. The app should show its verification/login options or a friendly existing-account error, never fabricate a session.
12. **Network failure:** disable network before login/signup/reset/resend → friendly message; controls unlock. Restart offline with a saved session → Retry screen; reconnect and retry → Home. Failed sign-out should report an error rather than pretend to have logged out.
13. **Expired/reused link:** open an expired or already consumed confirmation/reset link → useful error or invalid-link screen. Request a fresh link from this device. Test cold start and foreground opening.
14. **Smaller screens:** verify safe areas, scroll to all fields/buttons with the keyboard open, screen-reader input labels, text scaling, and disabled/loading states on both platforms.
15. **Missing configuration:** in a separate local environment, unset the public variables and restart Metro → Welcome with a configuration message and disabled auth submissions, not a crash.

PKCE links are bound to the installation/browser that requested them. Open the latest link there. If email was confirmed elsewhere, return and log in; request a new password reset from the device on which you will finish it. See [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## 11. Known issues and remaining attention

- Google is disabled in the connected project; configuration in section 8 is required.
- Redirect allowlist, SMTP delivery, real-user auth and physical-device UI/deep links could not be verified here.
- Existing native build identifiers are not set. Choose identifiers when creating installed builds; do not use Expo Go for the full deep-link acceptance tests.
- PKCE requires the originating device/browser; starting a newer flow can supersede an older link. Use the latest email.
- Restore deliberately validates the user with Supabase. Offline startup with a saved session offers Retry; offline tenant access is not implemented.
- A pre-existing Git merge conflict remains recorded in the index for app/(auth)/welcome.tsx. Its working content is implemented and builds successfully. Review it and mark it resolved with `git add -- "app/(auth)/welcome.tsx"` when you are ready to finish your merge.
- npm installation reported 14 moderate dependency advisories. No unrelated or potentially breaking dependency upgrades were applied.
- Existing Home text still says UNISTAY; that unrelated tenant screen was intentionally left as requested.
- Frontend route guards are not database authorization; future tenant data needs RLS.

## 12. Next recommended task

Finish the real-device acceptance checks first. Then design the tenant profile and role/membership model, including server-enforced ownership and RLS, before connecting property browsing or other tenant data.
