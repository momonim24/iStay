const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const TENANT = "10000000-0000-4000-8000-000000000001";
const OWNER = "20000000-0000-4000-8000-000000000001";
const OTHER = "30000000-0000-4000-8000-000000000001";
const PROPERTY = "40000000-0000-4000-8000-000000000001";
const FOREIGN = "40000000-0000-4000-8000-000000000002";
const ROOM = "50000000-0000-4000-8000-000000000001";
const APPLICATION = "60000000-0000-4000-8000-000000000001";
const property = (extra) => ({
  id: PROPERTY,
  owner_id: OWNER,
  name: "Test Residence",
  status: "active",
  verified: true,
  address: "Test Road",
  city: "Imus",
  province: "Cavite",
  property_type: "apartment",
  monthly_rent: "5000",
  property_images: [],
  ...extra,
});
const room = (extra) => ({
  id: ROOM,
  property_id: PROPERTY,
  name: "Room One",
  monthly_rent: "4000",
  available: true,
  capacity: 2,
  available_slots: 1,
  ...extra,
});
const application = (extra) => ({
  id: APPLICATION,
  tenant_id: TENANT,
  property_id: PROPERTY,
  room_id: ROOM,
  message: null,
  status: "pending",
  created_at: "2026-10-06T00:00:00Z",
  updated_at: "2026-10-06T00:00:00Z",
  ...extra,
});
function load(file, mocks, extras = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(
    `(function(require,module,exports,__DEV__,console){${source}\n})`,
    { filename: file },
  )(
    (name) => {
      assert.ok(name in mocks, `Unexpected import ${name}`);
      return mocks[name];
    },
    module,
    module.exports,
    extras.dev ?? false,
    extras.console ?? console,
  );
  return module.exports;
}
function fixture(options = {}) {
  const properties = options.properties ?? [property()];
  const rooms = options.rooms ?? [room()];
  const applications = options.applications ?? [];
  const calls = [],
    logs = [];
  const authId = options.authId === undefined ? TENANT : options.authId;
  let inserts = 0;
  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user: authId
            ? { id: authId, is_anonymous: options.anonymous ?? false }
            : null,
        },
        error: options.authError ?? null,
      }),
    },
    from(table) {
      const call = {
        table,
        action: "read",
        eq: {},
        in: {},
        is: {},
        orders: [],
      };
      const query = {
        select(fields) {
          call.fields = fields;
          return query;
        },
        eq(key, value) {
          call.eq[key] = value;
          return query;
        },
        in(key, value) {
          call.in[key] = value;
          return query;
        },
        is(key, value) {
          call.is[key] = value;
          return query;
        },
        order(key, options) {
          call.orders.push([key, options]);
          return query;
        },
        limit(count) {
          call.limit = count;
          return query;
        },
        range(start, end) {
          call.range = [start, end];
          return query;
        },
        maybeSingle() {
          call.single = true;
          return query;
        },
        single() {
          call.single = true;
          return query;
        },
        insert(payload) {
          call.action = "insert";
          call.payload = payload;
          return query;
        },
        update(payload) {
          call.action = "update";
          call.payload = payload;
          return query;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(async () => {
              calls.push(call);
              await options.before?.(call, { applications, properties, rooms });
              const failure = options.fail?.(call);
              if (failure)
                return {
                  data: null,
                  error:
                    typeof failure === "object"
                      ? failure
                      : { message: "private SQL details", code: "42501" },
                };
              if (options.throw?.(call))
                throw new Error("private network details");
              const source =
                table === "applications"
                  ? applications
                  : table === "properties"
                    ? properties
                    : table === "rooms"
                      ? rooms
                      : (options.profiles ?? []);
              let rows = source.filter(
                (row) =>
                  Object.entries(call.eq).every(
                    ([key, value]) => row[key] === value,
                  ) &&
                  Object.entries(call.in).every(([key, values]) =>
                    values.includes(row[key]),
                  ) &&
                  Object.entries(call.is).every(
                    ([key, value]) => row[key] === value,
                  ),
              );
              if (call.action === "insert") {
                inserts++;
                const row = application({
                  ...call.payload,
                  id: `60000000-0000-4000-8000-${String(inserts).padStart(12, "0")}`,
                });
                applications.push(row);
                rows = [row];
              }
              if (call.action === "update") {
                if (options.silentUpdate) rows = [];
                else for (const row of rows) Object.assign(row, call.payload);
              }
              for (const [key, order] of [...call.orders].reverse())
                rows.sort(
                  (a, b) =>
                    String(a[key]).localeCompare(String(b[key])) *
                    (order?.ascending === false ? -1 : 1),
                );
              if (call.limit) rows = rows.slice(0, call.limit);
              if (call.range)
                rows = rows.slice(call.range[0], call.range[1] + 1);
              if (
                table === "applications" &&
                call.fields?.includes("property:properties")
              )
                rows = rows.map((row) => ({
                  ...row,
                  property: options.hideProperty
                    ? null
                    : (properties.find((p) => p.id === row.property_id) ??
                      null),
                  room: rooms.find((r) => r.id === row.room_id) ?? null,
                }));
              return {
                data: call.single ? (rows[0] ?? null) : rows,
                error: null,
              };
            })
            .then(resolve, reject);
        },
      };
      return query;
    },
  };
  const discovery = {
    validPropertyId: (id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ),
    tenantVisible: (p) => p.status === "active" && p.verified === true,
    orderPhotos: (photos) =>
      [...photos].sort(
        (a, b) =>
          Number(b.is_cover) - Number(a.is_cover) ||
          a.sort_order - b.sort_order ||
          a.id.localeCompare(b.id),
      ),
    fetchTenantProperty: async (id) => {
      if (options.propertyError) throw new Error("private property error");
      return properties.find((p) => p.id === id) ?? null;
    },
  };
  const service = load(
    "src/services/application.service.ts",
    {
      "../lib/supabase": { requireSupabase: () => client },
      "./tenant-discovery.service": discovery,
    },
    { dev: options.dev, console: { warn: (...args) => logs.push(args) } },
  );
  return {
    service,
    calls,
    applications,
    properties,
    rooms,
    logs,
    get inserts() {
      return inserts;
    },
  };
}
test("valid pending submission derives identity and whitelists payload", async () => {
  const f = fixture();
  const result = await f.service.submitApplication({
    propertyId: PROPERTY,
    roomId: ROOM,
    message: "  Hello landlord  ",
    tenant_id: OTHER,
    status: "approved",
    created_at: "forged",
  });
  assert.equal(result.status, "pending");
  assert.deepEqual(f.calls.find((c) => c.action === "insert").payload, {
    tenant_id: TENANT,
    property_id: PROPERTY,
    room_id: ROOM,
    message: "Hello landlord",
    status: "pending",
  });
  assert.equal(f.rooms[0].available_slots, 1);
  assert.ok(!f.calls.some((c) => c.table === "rooms" && c.action !== "read"));
});
test("blank optional message and property-level inquiry use NULL", async () => {
  const f = fixture();
  await f.service.submitApplication({ propertyId: PROPERTY, message: "   " });
  assert.equal(f.applications[0].room_id, null);
  assert.equal(f.applications[0].message, null);
  const check = f.calls.find(
    (c) => c.table === "applications" && c.action === "read",
  );
  assert.deepEqual(check.is, { room_id: null });
  assert.ok(!("room_id" in check.eq));
});
for (const extra of [
  { status: "inactive" },
  { status: "pending" },
  { verified: false },
]) {
  test(`ineligible property rejects ${JSON.stringify(extra)}`, async () => {
    const f = fixture({ properties: [property(extra)] });
    await assert.rejects(
      f.service.submitApplication({ propertyId: PROPERTY }),
      /no longer available/,
    );
    assert.equal(f.inserts, 0);
  });
}
for (const extra of [
  { property_id: FOREIGN },
  { available: false },
  { available_slots: 0 },
]) {
  test(`invalid room rejects ${JSON.stringify(extra)}`, async () => {
    const f = fixture({ rooms: [room(extra)] });
    await assert.rejects(
      f.service.submitApplication({ propertyId: PROPERTY, roomId: ROOM }),
      /room|slots/,
    );
    assert.equal(f.inserts, 0);
    assert.equal(
      f.calls.find((c) => c.table === "rooms").eq.property_id,
      PROPERTY,
    );
  });
}
test("deleted room rejects submission but a property inquiry remains possible", async () => {
  const f = fixture({ rooms: [] });
  await assert.rejects(
    f.service.submitApplication({ propertyId: PROPERTY, roomId: ROOM }),
    /room/,
  );
  await f.service.submitApplication({ propertyId: PROPERTY });
  assert.equal(f.inserts, 1);
});
for (const status of ["pending", "approved"]) {
  for (const roomId of [null, ROOM]) {
    test(`${status} conflict is rejected for ${roomId ? "room" : "NULL room"}`, async () => {
      const f = fixture({
        applications: [application({ status, room_id: roomId })],
      });
      await assert.rejects(
        f.service.submitApplication({ propertyId: PROPERTY, roomId }),
        /already have/,
      );
      assert.equal(f.inserts, 0);
      assert.equal(
        (await f.service.findRelevantApplication(PROPERTY, roomId)).status,
        status,
      );
    });
  }
}
test("rejected applications can be resubmitted without changing history", async () => {
  const f = fixture({ applications: [application({ status: "rejected" })] });
  await f.service.submitApplication({ propertyId: PROPERTY, roomId: ROOM });
  assert.deepEqual(
    f.applications.map((a) => a.status),
    ["rejected", "pending"],
  );
});
test("duplicate check does not block a different tenant or combination", async () => {
  const f = fixture({
    applications: [
      application({ tenant_id: OTHER }),
      application({ property_id: FOREIGN }),
      application({ room_id: null }),
    ],
  });
  await f.service.submitApplication({ propertyId: PROPERTY, roomId: ROOM });
  assert.equal(f.inserts, 1);
});
test("simultaneous submits in this client cannot insert twice; lock releases after failure", async () => {
  const f = fixture();
  const results = await Promise.allSettled([
    f.service.submitApplication({ propertyId: PROPERTY, roomId: ROOM }),
    f.service.submitApplication({ propertyId: PROPERTY, roomId: ROOM }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(f.inserts, 1);
  const failed = fixture({ properties: [] });
  await assert.rejects(
    failed.service.submitApplication({ propertyId: PROPERTY }),
    /no longer available/,
  );
  failed.properties.push(property());
  await failed.service.submitApplication({ propertyId: PROPERTY });
  assert.equal(failed.inserts, 1);
});
test("tenant list and detail queries are scoped and ordered newest first", async () => {
  const f = fixture({
    applications: [
      application({ created_at: "2026-10-01T00:00:00Z" }),
      application({ id: OTHER, tenant_id: OTHER }),
      application({ id: ROOM, created_at: "2026-10-07T00:00:00Z" }),
    ],
  });
  const rows = await f.service.fetchTenantApplications();
  assert.deepEqual(
    rows.map((row) => row.id),
    [ROOM, APPLICATION],
  );
  assert.equal(rows[0].room.name, "Room One");
  assert.equal(rows[0].property.name, "Test Residence");
  assert.equal(await f.service.fetchTenantApplication(OTHER), null);
  assert.equal(
    (await f.service.fetchTenantApplication(APPLICATION)).tenant_id,
    TENANT,
  );
  assert.ok(
    f.calls
      .filter((c) => c.table === "applications")
      .every((c) => c.eq.tenant_id === TENANT),
  );
});
test("landlord list only queries owned property IDs and respects profile privacy", async () => {
  const f = fixture({
    authId: OWNER,
    properties: [property(), property({ id: FOREIGN, owner_id: OTHER })],
    applications: [
      application(),
      application({ id: OTHER, property_id: FOREIGN }),
    ],
    fail: (c) => c.table === "profiles",
  });
  const rows = await f.service.fetchLandlordApplications();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].tenantName, null);
  assert.equal(
    f.calls.find((c) => c.table === "properties").eq.owner_id,
    OWNER,
  );
  assert.deepEqual(
    f.calls.find((c) => c.table === "applications").in.property_id,
    [PROPERTY],
  );
  assert.equal(
    f.calls.find((c) => c.table === "profiles").fields,
    "id,full_name",
  );
});
test("accessible applicant names are shown; no owned properties avoids application reads", async () => {
  const f = fixture({
    authId: OWNER,
    applications: [application()],
    profiles: [{ id: TENANT, full_name: "Tenant Name" }],
  });
  assert.equal(
    (await f.service.fetchLandlordApplications())[0].tenantName,
    "Tenant Name",
  );
  const empty = fixture({ authId: OTHER });
  assert.deepEqual(await empty.service.fetchLandlordApplications(), []);
  assert.ok(!empty.calls.some((c) => c.table === "applications"));
});
for (const status of ["approved", "rejected"]) {
  test(`owner can conditionally change pending to ${status}`, async () => {
    const f = fixture({ authId: OWNER, applications: [application()] });
    const result =
      await f.service[
        status === "approved" ? "approveApplication" : "rejectApplication"
      ](APPLICATION);
    assert.equal(result.status, status);
    const update = f.calls.find((c) => c.action === "update");
    assert.deepEqual(update.eq, {
      id: APPLICATION,
      property_id: PROPERTY,
      status: "pending",
    });
    assert.deepEqual(Object.keys(update.payload).sort(), [
      "status",
      "updated_at",
    ]);
    assert.equal(
      f.calls.find((c) => c.table === "properties").eq.owner_id,
      OWNER,
    );
    assert.equal(f.rooms[0].available_slots, 1);
  });
}
test("another landlord cannot update an application", async () => {
  const f = fixture({ authId: OTHER, applications: [application()] });
  await assert.rejects(
    f.service.approveApplication(APPLICATION),
    /own properties/,
  );
  assert.ok(!f.calls.some((c) => c.action === "update"));
});
test("decided applications cannot be changed again", async () => {
  for (const status of ["approved", "rejected"]) {
    const f = fixture({
      authId: OWNER,
      applications: [application({ status })],
    });
    await assert.rejects(
      f.service.approveApplication(APPLICATION),
      /already been decided/,
    );
    await assert.rejects(
      f.service.rejectApplication(APPLICATION),
      /already been decided/,
    );
    assert.ok(!f.calls.some((c) => c.action === "update"));
  }
});
test("a decision made after the initial read cannot be overwritten", async () => {
  const f = fixture({
    authId: OWNER,
    applications: [application()],
    before: (call, data) => {
      if (call.action === "update") data.applications[0].status = "rejected";
    },
  });
  await assert.rejects(
    f.service.approveApplication(APPLICATION),
    /already been decided/,
  );
  assert.equal(f.applications[0].status, "rejected");
});
test("silent RLS rejection is not reported as success", async () => {
  const f = fixture({
    authId: OWNER,
    applications: [application()],
    silentUpdate: true,
  });
  await assert.rejects(
    f.service.approveApplication(APPLICATION),
    /already been decided/,
  );
  assert.equal(f.applications[0].status, "pending");
});
test("deleted/hidden room and hidden property preserve application history", async () => {
  const f = fixture({
    rooms: [],
    applications: [application({ room_id: null })],
    hideProperty: true,
  });
  const rows = await f.service.fetchTenantApplications();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].room, null);
  assert.equal(rows[0].property, null);
});
test("invalid UUIDs and messages fail before any writes", async () => {
  const f = fixture();
  for (const propertyId of ["", "not-a-uuid", PROPERTY + ",status.eq.active"])
    await assert.rejects(
      f.service.submitApplication({ propertyId }),
      /invalid/,
    );
  await assert.rejects(
    f.service.submitApplication({ propertyId: PROPERTY, roomId: "bad" }),
    /invalid/,
  );
  await assert.rejects(f.service.fetchTenantApplication("bad"), /invalid/);
  await assert.rejects(f.service.approveApplication("bad"), /invalid/);
  await assert.rejects(
    f.service.submitApplication({
      propertyId: PROPERTY,
      message: "x".repeat(2001),
    }),
    /2,000/,
  );
  assert.throws(() => f.service.applicationMessage(1), /valid message/);
  assert.equal(f.calls.length, 0);
});
test("unauthenticated and anonymous callers cannot read or mutate", async () => {
  for (const options of [
    { authId: null },
    { anonymous: true },
    { authError: new Error("expired") },
  ]) {
    const f = fixture(options);
    for (const action of [
      () => f.service.submitApplication({ propertyId: PROPERTY }),
      () => f.service.fetchTenantApplications(),
      () => f.service.fetchLandlordApplications(),
      () => f.service.approveApplication(APPLICATION),
    ])
      await assert.rejects(action(), /sign in again/);
    assert.equal(f.calls.length, 0);
  }
});
test("real query/network errors stay friendly and development diagnostics are logged", async () => {
  for (const options of [{ fail: () => true }, { throw: () => true }]) {
    const f = fixture({ ...options, dev: true });
    await assert.rejects(
      f.service.fetchTenantApplications(),
      (e) =>
        /Unable to load applications/.test(e.message) &&
        !/private/.test(e.message),
    );
    assert.equal(f.logs.length, 1);
  }
  const propertyFailure = fixture({ propertyError: true });
  await assert.rejects(
    propertyFailure.service.submitApplication({ propertyId: PROPERTY }),
    /Unable to check this property/,
  );
  const insertFailure = fixture({ fail: (c) => c.action === "insert" });
  await assert.rejects(
    insertFailure.service.submitApplication({ propertyId: PROPERTY }),
    /check My Applications/,
  );
});
test("unique-constraint conflict is friendly if the recommended index is installed", async () => {
  const f = fixture({
    fail: (c) =>
      c.action === "insert"
        ? { code: "23505", message: "private index" }
        : false,
  });
  await assert.rejects(
    f.service.submitApplication({ propertyId: PROPERTY }),
    /already have/,
  );
});
test("tenant and landlord application history page beyond one response", async () => {
  const applications = Array.from({ length: 205 }, (_, index) =>
    application({
      id: `60000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    }),
  );
  for (const mode of ["tenant", "landlord"]) {
    const f = fixture({
      applications,
      authId: mode === "tenant" ? TENANT : OWNER,
    });
    assert.equal(
      (
        await f.service[
          mode === "tenant"
            ? "fetchTenantApplications"
            : "fetchLandlordApplications"
        ]()
      ).length,
      205,
    );
    assert.equal(f.calls.filter((c) => c.table === "applications").length, 2);
  }
});
test("simultaneous landlord decisions cannot both succeed", async () => {
  const f = fixture({ authId: OWNER, applications: [application()] });
  const results = await Promise.allSettled([
    f.service.approveApplication(APPLICATION),
    f.service.rejectApplication(APPLICATION),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(f.calls.filter((c) => c.action === "update").length, 1);
});

const flush = () => new Promise((resolve) => setImmediate(resolve));
function hookRuntime() {
  const values = [],
    effects = [],
    focusEffects = [];
  let cursor = 0;
  const register = (callback, deps, queue) => {
    const slot = cursor++;
    const previous = values[slot];
    if (
      !previous ||
      !deps ||
      deps.some((value, index) => !Object.is(value, previous.deps?.[index]))
    ) {
      values[slot] = { deps, cleanup: previous?.cleanup };
      queue.push(() => {
        values[slot].cleanup?.();
        values[slot].cleanup = callback();
      });
    }
  };
  return {
    react: {
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
      useCallback(callback, deps) {
        const slot = cursor++;
        const previous = values[slot];
        if (
          !previous ||
          deps.some((value, index) => !Object.is(value, previous.deps[index]))
        )
          values[slot] = { deps, callback };
        return values[slot].callback;
      },
      useEffect(callback, deps) {
        register(callback, deps, effects);
      },
    },
    useFocusEffect(callback) {
      register(callback, [callback], focusEffects);
    },
    render(component) {
      cursor = 0;
      const output = component();
      effects.splice(0).forEach((run) => run());
      focusEffects.splice(0).forEach((run) => run());
      return output;
    },
    blur() {
      for (const value of values)
        if (value?.cleanup) {
          value.cleanup();
          value.cleanup = undefined;
        }
    },
  };
}
const jsx = (type, props) => ({ type, props });
const native = {
  ActivityIndicator: "ActivityIndicator",
  Image: "Image",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
  StyleSheet: { create: (styles) => styles },
};
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join("");
  return textOf(tree.props?.children);
}
function button(tree, text) {
  const element = nodes(tree).find(
    (node) => node.type === "Pressable" && textOf(node) === text,
  );
  assert.ok(element, `Missing button: ${text}`);
  return element;
}
test("focus application hook ignores stale reads and exposes errors/retry", async () => {
  const runtime = hookRuntime(),
    requests = [];
  let user = { id: TENANT };
  const read = () =>
    new Promise((resolve, reject) => requests.push({ resolve, reject }));
  const { useApplications } = load("src/hooks/use-applications.ts", {
    react: runtime.react,
    "expo-router": { useFocusEffect: runtime.useFocusEffect },
    "../auth/useAuth": { useAuth: () => ({ user }) },
    "../services/application.service": {
      fetchTenantApplications: read,
      fetchLandlordApplications: read,
    },
  });
  let result = runtime.render(() => useApplications("tenant"));
  result.refresh();
  runtime.render(() => useApplications("tenant"));
  requests[1].resolve([application({ id: ROOM })]);
  await flush();
  requests[0].resolve([application()]);
  await flush();
  result = runtime.render(() => useApplications("tenant"));
  assert.equal(result.applications[0].id, ROOM);
  assert.equal(result.loading, false);
  result.refresh();
  runtime.render(() => useApplications("tenant"));
  requests[2].reject(
    new Error("Unable to load applications. Please try again."),
  );
  await flush();
  result = runtime.render(() => useApplications("tenant"));
  assert.match(result.error, /Unable to load/);
  result.refresh();
  runtime.render(() => useApplications("tenant"));
  requests[3].resolve([]);
  await flush();
  result = runtime.render(() => useApplications("tenant"));
  assert.equal(result.error, "");
  assert.deepEqual(result.applications, []);
  user = null;
  runtime.render(() => useApplications("tenant"));
  result = runtime.render(() => useApplications("tenant"));
  assert.match(result.error, /sign in again/);
  assert.equal(requests.length, 4);
});
test("owner screen requires confirmation, suppresses double taps and hides decided actions", async () => {
  const runtime = hookRuntime();
  const f = fixture({ authId: OWNER, applications: [application()] });
  let rows = await f.service.fetchLandlordApplications();
  const decisions = [],
    navigations = [];
  let refreshes = 0,
    resolveDecision;
  const { ApplicationList, ApplicationCard } = load(
    "src/components/application-list.tsx",
    {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      react: runtime.react,
      "react-native": native,
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "expo-router": {
        useFocusEffect: runtime.useFocusEffect,
        router: { canGoBack: () => true, back: () => navigations.push("back") },
      },
      "../auth/useAuth": { useAuth: () => ({ user: { id: OWNER } }) },
      "../hooks/use-applications": {
        useApplications: () => ({
          applications: rows,
          loading: false,
          error: "",
          refresh: () => refreshes++,
        }),
      },
      "../services/application.service": {
        approveApplication: (id) => {
          decisions.push([id, "approved"]);
          return new Promise((resolve) => {
            resolveDecision = resolve;
          });
        },
        rejectApplication: (id) => {
          decisions.push([id, "rejected"]);
          return Promise.resolve();
        },
      },
    },
  );
  const render = () =>
    runtime.render(() => ApplicationList({ mode: "landlord" }));
  render();
  let tree = render();
  button(tree, "Approve").props.onPress();
  tree = render();
  assert.equal(decisions.length, 0);
  button(tree, "Cancel").props.onPress();
  tree = render();
  assert.equal(decisions.length, 0);
  button(tree, "Approve").props.onPress();
  tree = render();
  button(tree, "Confirm").props.onPress();
  button(tree, "Confirm").props.onPress();
  assert.equal(decisions.length, 1);
  resolveDecision();
  await flush();
  tree = render();
  assert.equal(refreshes, 1);
  assert.match(textOf(tree), /Application approved/);
  rows = rows.map((row) => ({ ...row, status: "approved" }));
  tree = render();
  assert.ok(
    !nodes(tree).some(
      (node) =>
        node.type === "Pressable" &&
        ["Approve", "Reject"].includes(textOf(node)),
    ),
  );
  rows = rows.map((row) => ({ ...row, status: "pending" }));
  tree = render();
  button(tree, "Reject").props.onPress();
  tree = render();
  assert.equal(decisions.length, 1);
  button(tree, "Confirm").props.onPress();
  await flush();
  assert.deepEqual(decisions[1], [APPLICATION, "rejected"]);
  assert.doesNotThrow(() =>
    ApplicationCard({
      application: { ...rows[0], property: null, room: null, room_id: null },
      landlord: true,
    }),
  );
});
test("Apply screen selects a room, trims through the service, guards double taps and navigates on success", async () => {
  const runtime = hookRuntime(),
    f = fixture();
  const fetched = { ...property(), image: null, rooms: [room()] };
  const navigations = [];
  const { default: ApplyScreen } = load("app/(tenant)/property/apply.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: runtime.react,
    "react-native": native,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": {
      useFocusEffect: runtime.useFocusEffect,
      useLocalSearchParams: () => ({ propertyId: PROPERTY }),
      router: {
        replace: (value) => navigations.push(value),
        push: (value) => navigations.push(value),
        canGoBack: () => true,
        back() {},
      },
    },
    "../../../src/auth/useAuth": { useAuth: () => ({ user: { id: TENANT } }) },
    "../../../src/components/application-list": { applicationStyles: {} },
    "../../../src/services/application.service": f.service,
    "../../../src/services/tenant-discovery.service": {
      fetchTenantProperty: async () => fetched,
      validPropertyId: (id) => id === PROPERTY,
      rentLabel: (value) => String(value),
    },
  });
  runtime.render(ApplyScreen);
  await flush();
  runtime.render(ApplyScreen);
  await flush();
  let tree = runtime.render(ApplyScreen);
  const roomOption = nodes(tree).find(
    (node) => node.type === "Pressable" && textOf(node).includes("Room One"),
  );
  roomOption.props.onPress();
  runtime.render(ApplyScreen);
  await flush();
  tree = runtime.render(ApplyScreen);
  nodes(tree)
    .find((node) => node.type === "TextInput")
    .props.onChangeText("  Hello  ");
  tree = runtime.render(ApplyScreen);
  assert.equal(button(tree, "Submit Application").props.disabled, false);
  button(tree, "Submit Application").props.onPress();
  button(tree, "Submit Application").props.onPress();
  await flush();
  await flush();
  assert.equal(f.inserts, 1);
  assert.equal(f.applications[0].room_id, ROOM);
  assert.equal(f.applications[0].message, "Hello");
  assert.equal(navigations.length, 1);
  assert.equal(navigations[0].pathname, "/(tenant)/(tabs)/applications");
  assert.equal(navigations[0].params.submitted, "1");
});
