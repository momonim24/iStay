const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the production TypeScript without adding a test framework/runtime.
function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, "..", relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("."))
      return load(
        path.relative(
          path.resolve(__dirname, ".."),
          path.resolve(path.dirname(filename), name + ".ts"),
        ),
        mocks,
        cache,
      );
    return require(name);
  };
  const run = vm.runInThisContext(
    "(function(require,module,exports){" + source + "\n})",
    { filename },
  );
  run(localRequire, module, module.exports);
  return module.exports;
}
const { parseAuthLink } = load("src/auth/auth-links.ts");
const { validateEmail, validatePassword, normalizeEmail } = load(
  "src/auth/auth-validation.ts",
);
const { isVerifiedSession, authDestination } = load("src/auth/auth-guards.ts");
const { authErrorMessage } = load("src/auth/auth-errors.ts");
const { chunkedStorage } = load("src/auth/auth-storage.ts");

test("installed Supabase SDK preserves S256 recovery state through code exchange", async () => {
  const { createClient } = require("@supabase/supabase-js");
  const requests = [];
  const events = [];
  const fixture = storageFixture();
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    email_confirmed_at: "2026-01-01",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01",
  };
  const client = createClient(
    "https://auth.example.test",
    "sb_publishable_test",
    {
      auth: {
        flowType: "pkce",
        storage: fixture.storage,
        storageKey: "sdk-recovery-test",
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (url, init) => {
          const body = JSON.parse(init.body);
          requests.push({ url: String(url), body });
          return new Response(
            JSON.stringify(
              String(url).includes("/token")
                ? {
                    access_token: "test-access-token",
                    refresh_token: "test-refresh-token",
                    token_type: "bearer",
                    expires_in: 3600,
                    user,
                  }
                : {},
            ),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        },
      },
    },
  );
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event) => {
    events.push(event);
  });
  try {
    const { service } = serviceFixture({ realAuth: client.auth });
    const sent = await service.requestPasswordReset("test@example.com");
    assert.equal(sent.error, null);
    assert.equal(requests[0].body.code_challenge_method, "s256");
    assert.ok(requests[0].body.code_challenge);
    const result = await service.exchangeAuthLink({
      code: "single-use-code",
      errorCode: null,
    });
    assert.equal(result.recovering, true);
    assert.equal(result.session.user.id, user.id);
    assert.ok(events.includes("PASSWORD_RECOVERY"));
    assert.ok(requests[1].body.code_verifier);
    const saved = await client.auth.getSession();
    assert.equal(saved.data.session.user.id, user.id);
  } finally {
    subscription.unsubscribe();
    client.auth.stopAutoRefresh();
  }
});

function session(confirmed = true) {
  return {
    user: {
      id: "test-user",
      email_confirmed_at: confirmed ? "2026-01-01" : null,
      app_metadata: { provider: "email" },
    },
  };
}
test("route gates deny missing, anonymous and unconfirmed sessions", () => {
  assert.equal(isVerifiedSession(null), false);
  assert.equal(isVerifiedSession(session(false)), false);
  assert.equal(
    isVerifiedSession({ user: { ...session().user, is_anonymous: true } }),
    false,
  );
  assert.equal(authDestination(null, false), "/(tenant)/(tabs)");
  assert.equal(authDestination(session(false), false), "/(auth)/verify-email");
});
test("confirmed email and Google sessions reach Home; recovery takes priority", () => {
  assert.equal(authDestination(session(), false), "/(tenant)/(tabs)");
  assert.equal(
    isVerifiedSession({
      user: { ...session().user, app_metadata: { provider: "google" } },
    }),
    true,
  );
  assert.equal(authDestination(session(), true), "/(auth)/reset-password");
  assert.equal(authDestination(null, true), "/(tenant)/(tabs)");
});
test("editable metadata cannot bypass email verification", () => {
  assert.equal(
    isVerifiedSession({
      user: { ...session(false).user, user_metadata: { email_verified: true } },
    }),
    false,
  );
});
test("native and web callback parsing accepts only exact routes and origins", () => {
  assert.equal(parseAuthLink("istay://auth/callback?code=abc").code, "abc");
  assert.equal(
    parseAuthLink("istay:///reset-password?code=abc").path,
    "reset-password",
  );
  assert.equal(
    parseAuthLink("https://app.test/verify-email?code=abc", "https://app.test")
      .code,
    "abc",
  );
  assert.equal(
    parseAuthLink(
      "https://evil.test/verify-email?code=abc",
      "https://app.test",
    ),
    null,
  );
  assert.equal(parseAuthLink("wrong://reset-password?code=abc"), null);
  assert.equal(parseAuthLink("istay://property/123?code=abc"), null);
  assert.equal(parseAuthLink("not a url"), null);
});
test("errors in hash override code exchange and PKCE flow id is preserved", () => {
  const link = parseAuthLink(
    "istay://reset-password?code=abc&sb_flow_id=flow# error=x".replace(
      "# ",
      "#",
    ),
  );
  assert.equal(link.flowId, "flow");
  assert.equal(link.errorCode, "x");
  assert.equal(
    parseAuthLink("istay://verify-email#error_code=otp_expired").errorCode,
    "otp_expired",
  );
  assert.equal(
    parseAuthLink("istay://verify-email#access_token=legacy").errorCode,
    "invalid_link",
  );
});
test("email and password validation does not trim passwords", () => {
  assert.equal(normalizeEmail("  Test@Example.COM "), "test@example.com");
  for (const email of ["", "x", "a@b", "a b@c.com"])
    assert.ok(validateEmail(email));
  assert.equal(validateEmail("test+tag@example.com"), null);
  assert.ok(validatePassword("short1", "short1"));
  assert.ok(validatePassword("password", "password"));
  assert.ok(validatePassword("password1", "password2"));
  assert.equal(validatePassword(" pass123 ", " pass123 "), null);
});
test("error messages do not expose arbitrary backend details", () => {
  assert.match(authErrorMessage({ code: "invalid_credentials" }), /incorrect/);
  assert.match(authErrorMessage({ code: "otp_expired" }), /new link/);
  assert.match(authErrorMessage(new TypeError("Failed to fetch")), /internet/);
  assert.doesNotMatch(
    authErrorMessage(new Error("private server details")),
    /private/,
  );
});
function storageFixture() {
  const values = new Map();
  let id = 0;
  let fail = false;
  const raw = {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      if (fail && key.endsWith(".1")) throw new Error("disk full");
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
  return {
    values,
    storage: chunkedStorage(raw, () => "generation-" + ++id),
    fail: () => {
      fail = true;
    },
  };
}
test("large Unicode sessions persist in small secure entries and are removed on logout", async () => {
  const fixture = storageFixture();
  const value = JSON.stringify({
    name: "🏠".repeat(1800),
    token: "x".repeat(3000),
  });
  await fixture.storage.setItem("session", value);
  assert.equal(await fixture.storage.getItem("session"), value);
  for (const entry of fixture.values.values())
    assert.ok(Buffer.byteLength(entry) < 2048);
  await fixture.storage.removeItem("session");
  assert.equal(fixture.values.size, 0);
});
test("storage reads legacy sessions and replaces old chunks", async () => {
  const fixture = storageFixture();
  fixture.values.set("session", '{"legacy":true}');
  assert.equal(await fixture.storage.getItem("session"), '{"legacy":true}');
  await fixture.storage.setItem("session", "a".repeat(1500));
  await fixture.storage.setItem("session", "new");
  assert.equal(await fixture.storage.getItem("session"), "new");
  assert.equal(fixture.values.size, 2);
});
test("failed storage write preserves the previous complete session", async () => {
  const fixture = storageFixture();
  await fixture.storage.setItem("session", "previous");
  fixture.fail();
  await assert.rejects(fixture.storage.setItem("session", "x".repeat(1500)));
  assert.equal(await fixture.storage.getItem("session"), "previous");
});
test("missing session chunks fail closed", async () => {
  const fixture = storageFixture();
  fixture.values.set("session", "chunks:missing:2");
  await assert.rejects(fixture.storage.getItem("session"));
});

function serviceFixture({
  browserResult = { type: "cancel" },
  exchangeError = null,
  realAuth = null,
} = {}) {
  const calls = [];
  const auth = new Proxy(
    {},
    {
      get:
        (_, method) =>
        async (...args) => {
          calls.push({ method, args });
          if (method === "signInWithOAuth")
            return {
              data: { url: "https://accounts.google.com/auth" },
              error: null,
            };
          if (method === "exchangeCodeForSession")
            return {
              data: { session: session(), redirectType: "recovery" },
              error: exchangeError,
            };
          return { data: {}, error: null };
        },
    },
  );
  const service = load("src/services/auth.service.ts", {
    "expo-constants": {
      __esModule: true,
      default: { executionEnvironment: "bare" },
      ExecutionEnvironment: { StoreClient: "storeClient" },
    },
    "expo-linking": { createURL: (p) => "https://app.test/" + p },
    "expo-web-browser": {
      openAuthSessionAsync: async (...args) => {
        calls.push({ method: "browser", args });
        return browserResult;
      },
    },
    "react-native": { Platform: { OS: "ios" } },
    "../lib/supabase": { requireSupabase: () => ({ auth: realAuth ?? auth }) },
  });
  return { service, calls };
}
test("signup passes safe full name metadata and the verification redirect", async () => {
  const { service, calls } = serviceFixture();
  await service.signUpWithEmail(" A@Example.com ", "pass1234 ", " Jane Doe ");
  assert.deepEqual(calls[0].args[0], {
    email: "a@example.com",
    password: "pass1234 ",
    options: {
      data: { full_name: "Jane Doe" },
      emailRedirectTo: "istay://verify-email",
    },
  });
});
test("resend and password reset always use the correct app redirects", async () => {
  const { service, calls } = serviceFixture();
  await service.resendSignupEmail("a@example.com");
  await service.requestPasswordReset("a@example.com");
  assert.equal(
    calls[0].args[0].options.emailRedirectTo,
    "istay://verify-email",
  );
  assert.equal(calls[1].args[1].redirectTo, "istay://reset-password");
});
test("OAuth cancellation does not manufacture a session or an error", async () => {
  const { service, calls } = serviceFixture();
  assert.equal(await service.signInWithGoogle(), null);
  assert.equal(
    calls.filter((call) => call.method === "exchangeCodeForSession").length,
    0,
  );
});
test("OAuth returns its callback for the centralized provider to consume", async () => {
  const url = "istay://auth/callback?code=abc";
  const { service } = serviceFixture({
    browserResult: { type: "success", url },
  });
  assert.equal(await service.signInWithGoogle(), url);
});
test("callback rejects absent or expired codes without making an auth call", async () => {
  const { service, calls } = serviceFixture();
  await assert.rejects(
    service.exchangeAuthLink({ code: null, errorCode: null }),
  );
  await assert.rejects(
    service.exchangeAuthLink({ code: "abc", errorCode: "otp_expired" }),
  );
  assert.equal(calls.length, 0);
});
test("callback uses the real exchange result and propagates failed exchanges", async () => {
  const { service, calls } = serviceFixture();
  const result = await service.exchangeAuthLink({
    code: "abc",
    flowId: "flow",
    errorCode: null,
  });
  assert.equal(result.recovering, true);
  assert.deepEqual(calls[0].args, ["abc", { flowId: "flow" }]);
  const failed = serviceFixture({ exchangeError: new Error("expired") });
  await assert.rejects(
    failed.service.exchangeAuthLink({ code: "abc", errorCode: null }),
    /expired/,
  );
});
