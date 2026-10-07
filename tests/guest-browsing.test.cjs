const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const PROPERTY = "40000000-0000-4000-8000-000000000001";
const ROOM = "50000000-0000-4000-8000-000000000001";
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, {
    filename: file,
  })(
    (name) => {
      assert.ok(name in mocks, `Unexpected import ${name}`);
      return mocks[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}
const session = (extra = {}) => ({
  user: {
    id: "user",
    is_anonymous: false,
    email_confirmed_at: "2026-10-01T00:00:00Z",
    ...extra,
  },
});
const guards = load("src/auth/auth-guards.ts");
const applyIntent = {
  pathname: "/(tenant)/property/apply",
  params: { propertyId: PROPERTY, roomId: ROOM },
};

test("signed-out visitors start in the tenant marketplace, not on an auth screen", () => {
  assert.equal(guards.authDestination(null, false), "/(tenant)/(tabs)");
  assert.equal(guards.authDestination(session(), false), "/(tenant)/(tabs)");
  assert.equal(
    guards.authDestination(session({ email_confirmed_at: null }), false),
    "/(auth)/verify-email",
  );
  assert.equal(
    guards.authDestination(session(), true),
    "/(auth)/reset-password",
  );
});

test("auth intent accepts only allow-listed tenant destinations", () => {
  const { validIntent } = load("src/auth/auth-intent.ts");
  assert.ok(validIntent(applyIntent));
  assert.ok(
    validIntent({
      pathname: "/(tenant)/property/apply",
      params: { propertyId: PROPERTY },
    }),
  );
  assert.ok(validIntent({ pathname: "/(tenant)/become-owner" }));
  for (const bad of [
    null,
    "https://evil.example",
    { pathname: "https://evil.example" },
    { pathname: "/(owner)/(tabs)" },
    { pathname: "/(tenant)/(tabs)/profile" },
    { pathname: "/(tenant)/property/apply" },
    { pathname: "/(tenant)/property/apply", params: { propertyId: "abc" } },
    {
      pathname: "/(tenant)/property/apply",
      params: { propertyId: PROPERTY, roomId: "x" },
    },
    {
      pathname: "/(tenant)/property/apply",
      params: { propertyId: PROPERTY, tenant_id: "other" },
    },
    { pathname: "/(tenant)/become-owner", params: { next: "//evil" } },
  ])
    assert.equal(validIntent(bad), false, JSON.stringify(bad));
});

test("auth intent is single-use, expires and can be cleared", () => {
  const intent = load("src/auth/auth-intent.ts");
  intent.rememberIntent(applyIntent, 1000);
  assert.deepEqual(intent.takeIntent(2000), applyIntent);
  assert.equal(intent.takeIntent(2000), null);
  intent.rememberIntent(applyIntent, 1000);
  assert.equal(intent.takeIntent(1000 + 16 * 60 * 1000), null);
  intent.rememberIntent(applyIntent, 1000);
  intent.clearIntent();
  assert.equal(intent.takeIntent(1000), null);
  intent.rememberIntent({ pathname: "/(owner)/(tabs)" }, 1000);
  assert.equal(intent.takeIntent(1000), null);
  // A later request without a destination replaces an earlier one.
  intent.rememberIntent(applyIntent, 1000);
  intent.rememberIntent(null, 1000);
  assert.equal(intent.takeIntent(1000), null);
});

const reactStore = { useSyncExternalStore: (subscribe, get) => get() };
function requireAuthHook(auth) {
  const pushed = [];
  const intent = load("src/auth/auth-intent.ts");
  const modal = load("src/auth/auth-modal-store.ts", { react: reactStore });
  const hook = load("src/auth/use-require-auth.ts", {
    "expo-router": {
      // Protected actions must not navigate away from the marketplace.
      router: { push: (value) => pushed.push(value) },
      useLocalSearchParams: () => ({}),
    },
    "./auth-guards": guards,
    "./auth-intent": intent,
    "./auth-modal-store": modal,
    "./useAuth": { useAuth: () => auth },
  });
  return { hook, pushed, intent, modal };
}

test("signed-in users proceed without a prompt", () => {
  const { hook, pushed, intent, modal } = requireAuthHook({
    session: session(),
    recovering: false,
  });
  const auth = hook.useRequireAuth();
  assert.equal(auth.signedIn, true);
  assert.equal(
    auth.requireAuth("Log in to apply for this room.", applyIntent),
    true,
  );
  assert.deepEqual(pushed, []);
  assert.equal(modal.getAuthModalState().open, false);
  assert.equal(intent.takeIntent(), null);
});

for (const [name, auth] of [
  ["guest", { session: null, recovering: false }],
  [
    "unverified session",
    { session: session({ email_confirmed_at: null }), recovering: false },
  ],
  [
    "anonymous session",
    { session: session({ is_anonymous: true }), recovering: false },
  ],
  ["password recovery", { session: session(), recovering: true }],
])
  test(`${name} gets the login pop-up over the current screen and the destination is remembered`, () => {
    const { hook, pushed, intent, modal } = requireAuthHook(auth);
    const state = hook.useRequireAuth();
    assert.equal(state.signedIn, false);
    assert.equal(
      state.requireAuth("Log in to apply for this room.", applyIntent),
      false,
    );
    // No navigation: the marketplace screen stays exactly where it was.
    assert.deepEqual(pushed, []);
    assert.deepEqual(modal.getAuthModalState(), {
      open: true,
      mode: "login",
      reason: "Log in to apply for this room.",
    });
    assert.deepEqual(intent.takeIntent(), applyIntent);
    state.requireAuth(
      "Log in to view your applications.",
      undefined,
      "register",
    );
    assert.equal(modal.getAuthModalState().mode, "register");
    // An action with no destination (e.g. saving a favorite) leaves none behind.
    intent.rememberIntent(applyIntent);
    state.requireAuth("Log in to save properties.");
    assert.equal(intent.takeIntent(), null);
  });

test("auth pop-up store switches between Log in and Sign up, closes, and notifies", () => {
  const modal = load("src/auth/auth-modal-store.ts", { react: reactStore });
  let notified = 0;
  const unsubscribe = modal.subscribeAuthModal(() => notified++);
  modal.setAuthModalMode("register");
  assert.equal(modal.getAuthModalState().open, false);
  modal.openAuthModal("Log in to list your property.");
  modal.setAuthModalMode("register");
  assert.deepEqual(modal.getAuthModalState(), {
    open: true,
    mode: "register",
    reason: "Log in to list your property.",
  });
  modal.setAuthModalMode("login");
  modal.closeAuthModal();
  modal.closeAuthModal();
  assert.equal(modal.getAuthModalState().open, false);
  assert.equal(notified, 4);
  unsubscribe();
  modal.openAuthModal("x".repeat(500));
  assert.equal(notified, 4);
  assert.equal(modal.getAuthModalState().reason.length, 120);
});

test("pending favorite is single-use, validated, expires and is dropped on cancel", () => {
  const intent = load("src/auth/auth-intent.ts");
  intent.rememberFavorite(PROPERTY, 1000);
  assert.equal(intent.takeFavorite(2000), PROPERTY);
  assert.equal(intent.takeFavorite(2000), null);
  intent.rememberFavorite("not-a-uuid", 1000);
  assert.equal(intent.takeFavorite(1000), null);
  intent.rememberFavorite(PROPERTY, 1000);
  assert.equal(intent.takeFavorite(1000 + 16 * 60 * 1000), null);
  intent.rememberFavorite(PROPERTY, 1000);
  intent.rememberIntent(applyIntent, 1000);
  intent.clearIntent();
  assert.equal(intent.takeFavorite(1000), null);
  assert.equal(intent.takeIntent(1000), null);
});

test("closing the login prompt forgets the destination and returns to browsing", () => {
  const navigations = [];
  const intent = load("src/auth/auth-intent.ts");
  let canGoBack = true;
  const hook = load("src/auth/use-require-auth.ts", {
    "expo-router": {
      router: {
        canGoBack: () => canGoBack,
        back: () => navigations.push("back"),
        replace: (value) => navigations.push(value),
      },
      useLocalSearchParams: () => ({ reason: "Log in to save properties." }),
    },
    "./auth-guards": guards,
    "./auth-intent": intent,
    "./auth-modal-store": load("src/auth/auth-modal-store.ts", {
      react: reactStore,
    }),
    "./useAuth": { useAuth: () => ({ session: null, recovering: false }) },
  });
  intent.rememberIntent(applyIntent);
  const prompt = hook.useAuthPrompt();
  assert.equal(prompt.reason, "Log in to save properties.");
  prompt.close();
  canGoBack = false;
  prompt.close();
  assert.deepEqual(navigations, ["back", "/(tenant)/(tabs)"]);
  assert.equal(intent.takeIntent(), null);
});

function favoritesHook(signedIn, options = {}) {
  const intent = options.intent ?? load("src/auth/auth-intent.ts");
  const calls = [],
    prompts = [],
    values = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in values)) values[slot] = initial;
      return [
        values[slot],
        (value) => {
          values[slot] =
            typeof value === "function" ? value(values[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      const slot = cursor++;
      if (!(slot in values)) values[slot] = { current: initial };
      return values[slot];
    },
    useCallback: (callback) => callback,
  };
  let focus;
  const { useTenantFavorites } = load("src/hooks/use-tenant-favorites.ts", {
    react,
    "expo-router": { useFocusEffect: (callback) => (focus = callback) },
    "../auth/useAuth": {
      useAuth: () => ({ user: signedIn ? { id: "user" } : null }),
    },
    "../auth/auth-intent": intent,
    "../auth/use-require-auth": {
      useRequireAuth: () => ({
        signedIn,
        requireAuth: (reason) => {
          if (!signedIn) prompts.push(reason);
          return signedIn;
        },
      }),
    },
    "../services/tenant-discovery.service": {
      fetchFavoriteIds: async () => (
        calls.push("fetch"),
        [...(options.saved ?? [])]
      ),
      addFavorite: async (id) => void calls.push(["add", id]),
      removeFavorite: async (id) => void calls.push(["remove", id]),
    },
  });
  const render = () => {
    cursor = 0;
    return useTenantFavorites();
  };
  render();
  focus();
  return { render, calls, prompts, intent };
}

test("guests never read or write favorites; tapping a heart asks them to log in", async () => {
  const guest = favoritesHook(false);
  const state = guest.render();
  assert.equal(state.ready, true);
  assert.deepEqual(state.ids, []);
  assert.equal(state.error, "");
  await state.toggle(PROPERTY);
  assert.deepEqual(guest.calls, []);
  assert.deepEqual(guest.prompts, ["Log in to save this property."]);

  const member = favoritesHook(true);
  await new Promise((resolve) => setImmediate(resolve));
  await member.render().toggle(PROPERTY);
  assert.deepEqual(member.calls, ["fetch", ["add", PROPERTY]]);
  assert.deepEqual(member.prompts, []);
});

test("a favorite tapped as a guest is saved once after login, never duplicated", async () => {
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const guest = favoritesHook(false);
  await guest.render().toggle(PROPERTY);
  assert.deepEqual(guest.calls, []);
  // The same user signs in: the next favorites load completes the save.
  const member = favoritesHook(true, { intent: guest.intent });
  await flush();
  assert.deepEqual(member.calls, ["fetch", ["add", PROPERTY]]);
  assert.deepEqual(member.render().ids, [PROPERTY]);
  assert.equal(guest.intent.takeFavorite(), null);
  // Another screen loading favorites afterwards does not save it again.
  const later = favoritesHook(true, { intent: guest.intent });
  await flush();
  assert.deepEqual(later.calls, ["fetch"]);

  // Already saved on the account: nothing is written.
  const again = favoritesHook(false);
  await again.render().toggle(PROPERTY);
  const existing = favoritesHook(true, {
    intent: again.intent,
    saved: [PROPERTY],
  });
  await flush();
  assert.deepEqual(existing.calls, ["fetch"]);
  assert.deepEqual(existing.render().ids, [PROPERTY]);

  // Cancelling the pop-up drops the pending save.
  const cancelled = favoritesHook(false);
  await cancelled.render().toggle(PROPERTY);
  cancelled.intent.clearIntent();
  const after = favoritesHook(true, { intent: cancelled.intent });
  await flush();
  assert.deepEqual(after.calls, ["fetch"]);
});

test("the pop-up reuses the shared auth forms and is mounted once at the root", () => {
  const modal = fs.readFileSync("src/components/auth/AuthModal.tsx", "utf8");
  assert.match(modal, /<LoginForm/);
  assert.match(modal, /<RegisterForm/);
  assert.match(modal, /onRequestClose=\{cancel\}/);
  // No sign-in calls of its own: all auth logic lives in the shared forms.
  assert.doesNotMatch(modal, /signInWithEmail|signUpWithEmail|requireSupabase/);
  for (const route of ["app/(auth)/login.tsx", "app/(auth)/register.tsx"]) {
    const source = fs.readFileSync(route, "utf8");
    assert.match(source, /components\/auth\/AuthForms/);
    assert.doesNotMatch(source, /signInWithEmail|signUpWithEmail/);
  }
  const root = fs.readFileSync("app/_layout.tsx", "utf8");
  assert.equal(root.match(/<AuthModal \/>/g).length, 1);
});

const jsx = (type, props) => ({ type, props });
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const Stack = { Screen: "Screen", Protected: "Protected" };
function guarded(tree) {
  const result = { public: [], protected: [] };
  const walk = (node, guards) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node))
      return node.forEach((child) => walk(child, guards));
    if (node.type === "Screen")
      result[guards.length ? "protected" : "public"].push({
        name: node.props.name,
        open: guards.every(Boolean),
      });
    walk(
      node.props?.children,
      node.type === "Protected" ? [...guards, node.props.guard] : guards,
    );
  };
  walk(tree, []);
  return result;
}

test("tenant layout keeps discovery public and account screens guarded", () => {
  for (const signedIn of [false, true]) {
    const { default: TenantLayout } = load("app/(tenant)/_layout.tsx", {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "expo-router": { Stack },
      "../../src/auth/use-require-auth": {
        useRequireAuth: () => ({ signedIn }),
      },
    });
    const screens = guarded(TenantLayout());
    assert.deepEqual(
      screens.public.map((s) => s.name),
      ["(tabs)", "property/[id]", "property/compare", "smart-match"],
    );
    assert.deepEqual(
      screens.protected.map((s) => s.name),
      [
        "property/apply",
        "application/[id]",
        "notifications",
        "messages/index",
        "messages/[id]",
        "become-owner",
        "properties",
      ],
    );
    assert.ok(screens.protected.every((s) => s.open === signedIn));
  }
});

test("every tenant route file is explicitly classified as public or protected", () => {
  const routes = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "(tabs)") routes.push("(tabs)");
      else if (entry.isDirectory())
        walk(`${dir}/${entry.name}`, `${prefix}${entry.name}/`);
      else if (entry.name !== "_layout.tsx")
        routes.push(prefix + entry.name.replace(/\.tsx$/, ""));
    }
  };
  walk("app/(tenant)", "");
  const layout = fs.readFileSync("app/(tenant)/_layout.tsx", "utf8");
  // An unlisted route would be auto-registered as public by Expo Router.
  for (const route of routes)
    assert.ok(
      layout.includes(`name="${route}"`),
      `unclassified route ${route}`,
    );
});

test("root layout guards landlord mode behind a verified session", () => {
  const layout = fs.readFileSync("app/_layout.tsx", "utf8");
  assert.match(
    layout,
    /<Stack\.Protected guard=\{signedIn\}>\s*<Stack\.Screen name="\(owner\)" \/>/,
  );
  assert.match(
    layout,
    /const signedIn = isVerifiedSession\(session\) && !recovering;/,
  );
  assert.match(
    layout,
    /<Stack\.Protected guard=\{!recovering\}>\s*<Stack\.Screen name="\(tenant\)" \/>/,
  );
});

test("public discovery reads only active and verified listings", () => {
  const source = fs.readFileSync(
    "src/services/tenant-discovery.service.ts",
    "utf8",
  );
  assert.match(
    source,
    /function publicQuery\(\) \{[\s\S]*?\.eq\("status", "active"\)\s*\.eq\("verified", true\);/,
  );
  // Discovery never selects landlord profile or application data.
  const fields = source.match(/const fields = `([^`]*)`/)[1];
  assert.doesNotMatch(fields, /profiles|applications|email|phone/);
});
