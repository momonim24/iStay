const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const ID = "550e8400-e29b-41d4-a716-446655440000";
const USER = "650e8400-e29b-41d4-a716-446655440000";
const property = (extra = {}) => ({
  id: ID,
  name: "Rental",
  status: "active",
  verified: true,
  monthly_rent: "5000",
  security_deposit: null,
  created_at: "2026-10-01",
  rooms: [],
  property_images: [],
  property_amenities: [],
  ...extra,
});
function fixture({
  rows = [property()],
  fail,
  authenticated = true,
  duplicate = false,
  silentDelete = false,
  requestError,
  rejectRequest = false,
} = {}) {
  const calls = [],
    favorites = [],
    logs = [];
  let inserts = 0;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: USER } : null },
        error: null,
      }),
    },
    from(table) {
      const call = { table, action: "read", filters: {}, orders: [] };
      const q = {
        range(start, end) {
          call.range = [start, end];
          return q;
        },
        select(fields) {
          call.fields = fields;
          return q;
        },
        eq(k, v) {
          call.filters[k] = v;
          return q;
        },
        ilike(k, v) {
          call.filters[k] = v;
          call.ilike = { ...call.ilike, [k]: v };
          return q;
        },
        in(k, v) {
          call.filters[k] = v;
          return q;
        },
        gte(k, v) {
          call.filters["min:" + k] = v;
          return q;
        },
        lte(k, v) {
          call.filters["max:" + k] = v;
          return q;
        },
        or(v) {
          call.or = v;
          return q;
        },
        order(k, v) {
          call.orders.push([k, v]);
          return q;
        },
        abortSignal(signal) {
          call.signal = signal;
          return q;
        },
        maybeSingle() {
          call.single = true;
          return q;
        },
        insert(payload) {
          call.action = "insert";
          call.payload = payload;
          return q;
        },
        delete() {
          call.action = "delete";
          return q;
        },
        then(resolve, reject) {
          calls.push(call);
          if (rejectRequest)
            return Promise.reject(requestError).then(resolve, reject);
          let error =
            requestError ??
            (fail?.(call) ? { message: "private database details" } : null);
          let data;
          if (table === "properties")
            data = call.single
              ? rows.find((p) => p.id === call.filters.id) || null
              : rows;
          else {
            if (!error && call.action === "insert") {
              inserts++;
              favorites.push(call.payload);
              if (duplicate) error = { code: "23505" };
            }
            if (!error && call.action === "delete" && !silentDelete) {
              for (let i = favorites.length - 1; i >= 0; i--)
                if (
                  favorites[i].user_id === call.filters.user_id &&
                  favorites[i].property_id === call.filters.property_id
                )
                  favorites.splice(i, 1);
            }
            data = favorites.filter(
              (f) =>
                f.user_id === call.filters.user_id &&
                (!call.filters.property_id ||
                  f.property_id === call.filters.property_id),
            );
          }
          if (table === "properties" && Array.isArray(data)) {
            // Model the emitted PostgREST ilike predicates, not a client-side search.
            const matches = (value, pattern) => {
              const source = pattern
                .replace(/\\([\\%_])/g, "$1")
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                .replace(/%/g, ".*")
                .replace(/_/g, ".");
              return new RegExp(`^${source}$`, "i").test(value ?? "");
            };
            if (call.or) {
              const predicates = [
                ...call.or.matchAll(
                  /(name|address|barangay|city)\.ilike\."((?:\\.|[^"\\])*)"/g,
                ),
              ];
              data = data.filter((p) =>
                predicates.some(([, field, pattern]) =>
                  matches(p[field], pattern),
                ),
              );
            }
            for (const [field, pattern] of Object.entries(call.ilike ?? {}))
              data = data.filter((p) => matches(p[field], pattern));
          }
          if (Array.isArray(data) && call.range)
            data = data.slice(call.range[0], call.range[1] + 1);
          return Promise.resolve({ data, error }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  const source = ts.transpileModule(
    fs.readFileSync("src/services/tenant-discovery.service.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const module = { exports: {} };
  vm.runInThisContext(
    `(function(require,module,exports,console){${source}\n})`,
  )(
    (name) => {
      assert.equal(name, "../lib/supabase");
      return { requireSupabase: () => client };
    },
    module,
    module.exports,
    { error: (...args) => logs.push(args) },
  );
  return {
    service: module.exports,
    calls,
    favorites,
    logs,
    get inserts() {
      return inserts;
    },
  };
}
test("only explicitly active and verified rows are tenant-visible", async () => {
  const f = fixture({
    rows: ["draft", "pending", "rejected", "inactive", "active"].flatMap(
      (status) => [
        property({ status, verified: true }),
        property({ status, verified: false }),
      ],
    ),
  });
  assert.equal((await f.service.fetchTenantProperties()).length, 1);
  for (const call of f.calls) {
    assert.equal(call.filters.status, "active");
    assert.equal(call.filters.verified, true);
  }
});
test("direct detail lookup rejects unavailable and ineligible rows", async () => {
  for (const rows of [
    [],
    [property({ verified: false })],
    [property({ status: "pending" })],
    [property({ status: "inactive" })],
  ]) {
    const f = fixture({ rows });
    assert.equal(await f.service.fetchTenantProperty(ID), null);
    assert.deepEqual(f.calls[0].filters, {
      status: "active",
      verified: true,
      id: ID,
    });
  }
});
test("invalid and missing UUIDs do not query the database", async () => {
  const f = fixture();
  for (const id of ["", "demo-1", "abc", ID + ",id.eq.other"])
    assert.equal(await f.service.fetchTenantProperty(id), null);
  assert.equal(f.calls.length, 0);
  assert.equal(await f.service.isFavorite("bad"), false);
  await assert.rejects(f.service.addFavorite("bad"), /invalid/);
  await assert.rejects(f.service.removeFavorite("bad"), /invalid/);
});
test("filter validation accepts blanks and rejects invalid or inverted prices", () => {
  const { service: s } = fixture();
  assert.deepEqual(
    s.normalizeFilters({ text: "  house  ", minRent: "0", maxRent: "5000.50" }),
    { text: "house", city: "", propertyType: "", min: 0, max: 5000.5 },
  );
  assert.equal(s.normalizeFilters({ minRent: "  " }).min, undefined);
  for (const minRent of ["NaN", "-1", "Infinity", "1e4", "1.123", "abc"])
    assert.throws(() => s.normalizeFilters({ minRent }), /rent/);
  assert.throws(
    () => s.normalizeFilters({ minRent: "2000", maxRent: "1000" }),
    /Minimum/,
  );
});
test("search filters stay on public properties and quote user input", async () => {
  const f = fixture();
  await f.service.fetchTenantProperties({
    text: 'a,b"%_',
    city: "Imus",
    propertyType: "apartment",
    minRent: "1000",
    maxRent: "6000",
  });
  const c = f.calls[0];
  assert.equal(c.filters.status, "active");
  assert.equal(c.filters.verified, true);
  assert.equal(c.filters.city, "Imus");
  assert.equal(c.filters.property_type, "apartment");
  assert.equal(c.filters["min:monthly_rent"], 1000);
  assert.equal(c.filters["max:monthly_rent"], 6000);
  assert.ok(c.or.startsWith('name.ilike."%'));
  assert.ok(c.or.includes("address.ilike."));
  assert.ok(c.or.includes("barangay.ilike."));
  assert.ok(c.or.includes("city.ilike."));
  assert.ok(c.or.includes('\\"'));
  assert.ok(c.or.includes("\\%\\_"));
});
test("cover photos precede sort order with deterministic tie breaking", () => {
  const { service: s } = fixture();
  const photos = [
    { id: "z", is_cover: false, sort_order: 0 },
    { id: "b", is_cover: true, sort_order: 5 },
    { id: "a", is_cover: true, sort_order: 5 },
    { id: "c", is_cover: true, sort_order: 1 },
  ];
  assert.deepEqual(
    s.orderPhotos(photos).map((p) => p.id),
    ["c", "a", "b", "z"],
  );
  assert.equal(photos[0].id, "z");
});
test("available rooms require both a true flag and positive slots; preserve rent", async () => {
  const f = fixture({
    rows: [
      property({
        rooms: [
          {
            id: "a",
            available: true,
            available_slots: 1,
            monthly_rent: "3200",
          },
          { id: "b", available: false, available_slots: 2 },
          { id: "c", available: true, available_slots: 0 },
        ],
      }),
    ],
  });
  const p = await f.service.fetchTenantProperty(ID);
  assert.equal(p.monthly_rent, 5000);
  assert.equal(p.rooms.length, 1);
  assert.equal(p.rooms[0].monthly_rent, 3200);
  assert.equal(p.image, null);
  assert.equal(p.security_deposit, null);
});
test("empty listings, rooms, photos, amenities and favorites return empty arrays", async () => {
  const { service: s } = fixture({ rows: [] });
  for (const fn of [
    "fetchTenantProperties",
    "fetchTenantFavorites",
    "fetchFavoriteIds",
  ])
    assert.deepEqual(await s[fn](), []);
  for (const fn of [
    "fetchAvailableRooms",
    "fetchPropertyPhotos",
    "fetchPropertyAmenities",
  ])
    assert.deepEqual(await s[fn](ID), []);
});
test("favorite insert, state, list and removal use the authenticated user", async () => {
  const f = fixture();
  await f.service.addFavorite(ID);
  assert.equal(await f.service.isFavorite(ID), true);
  assert.equal((await f.service.fetchTenantFavorites()).length, 1);
  await f.service.removeFavorite(ID);
  assert.equal(await f.service.isFavorite(ID), false);
  assert.deepEqual(f.calls.find((c) => c.action === "insert").payload, {
    user_id: USER,
    property_id: ID,
  });
  assert.ok(
    f.calls
      .filter((c) => c.table === "favorites" && c.action !== "insert")
      .every((c) => c.filters.user_id === USER),
  );
  assert.ok(
    f.calls
      .filter((c) => c.table === "properties")
      .every(
        (c) => c.filters.status === "active" && c.filters.verified === true,
      ),
  );
});
test("repeated/concurrent saves are idempotent and unique-conflict saves are confirmed", async () => {
  const f = fixture();
  await Promise.all([f.service.addFavorite(ID), f.service.addFavorite(ID)]);
  assert.equal(f.inserts, 1);
  const other = fixture({ duplicate: true });
  await other.service.addFavorite(ID);
  assert.equal(await other.service.isFavorite(ID), true);
});
test("ineligible properties cannot be saved and saved ineligible rows stay hidden", async () => {
  const f = fixture();
  await f.service.addFavorite(ID);
  const row = property({ verified: false });
  const denied = fixture({ rows: [row] });
  await assert.rejects(denied.service.addFavorite(ID), /no longer available/);
  assert.equal(denied.inserts, 0);
  denied.favorites.push({ user_id: USER, property_id: ID });
  assert.deepEqual(await denied.service.fetchTenantFavorites(), []);
});
test("failed mutations and silently blocked deletes reject; no raw errors escape", async () => {
  const f = fixture({ fail: (c) => c.action === "insert" });
  await assert.rejects(
    f.service.addFavorite(ID),
    (e) =>
      e.message.includes("Please try again") &&
      !e.message.includes("private database"),
  );
  const blocked = fixture({ silentDelete: true });
  await blocked.service.addFavorite(ID);
  await assert.rejects(blocked.service.removeFavorite(ID), /Please try again/);
  const read = fixture({ fail: () => true });
  await assert.rejects(
    read.service.fetchTenantProperties(),
    /Unable to load properties/,
  );
});
test("unauthenticated callers cannot mutate or read favorites", async () => {
  const f = fixture({ authenticated: false });
  for (const fn of ["addFavorite", "removeFavorite", "fetchFavoriteIds"])
    await assert.rejects(f.service[fn](ID), /sign in again/);
  assert.equal(f.calls.length, 0);
});
test("discovery and favorite IDs page through results beyond one response", async () => {
  const rows = Array.from({ length: 205 }, (_, i) =>
    property({
      id: `${String(i).padStart(8, "0")}-e29b-41d4-a716-446655440000`,
    }),
  );
  const f = fixture({ rows });
  assert.equal((await f.service.fetchTenantProperties()).length, 205);
  f.favorites.push(...rows.map((p) => ({ user_id: USER, property_id: p.id })));
  assert.equal((await f.service.fetchFavoriteIds()).length, 205);
  assert.equal(f.calls.filter((c) => c.table === "properties").length, 2);
});
test("photo and room helper lookups cannot expose hidden listings", async () => {
  const f = fixture({
    rows: [
      property({
        status: "draft",
        property_images: [
          {
            id: "a",
            image_url: "private-photo",
            is_cover: true,
            sort_order: 0,
          },
        ],
        rooms: [{ id: "room", available: true, available_slots: 1 }],
      }),
    ],
  });
  assert.deepEqual(await f.service.fetchAvailableRooms(ID), []);
  assert.deepEqual(await f.service.fetchPropertyPhotos(ID), []);
  assert.deepEqual(await f.service.fetchPropertyAmenities(ID), []);
});

for (const text of [
  "Test",
  "test",
  "TEST",
  "TeSt",
  "test residence",
  "TEST RESIDENCE",
]) {
  test(`server text search matches Test Residence for ${text}`, async () => {
    const f = fixture({
      rows: [property({ name: "Test Residence" }), property({ name: "Other" })],
    });
    assert.deepEqual(
      (await f.service.fetchTenantProperties({ text })).map((p) => p.name),
      ["Test Residence"],
    );
    assert.equal(f.calls[0].filters.status, "active");
    assert.equal(f.calls[0].filters.verified, true);
    assert.ok(f.calls[0].or.includes(`name.ilike."%${text}%"`));
  });
}
for (const field of ["address", "barangay", "city"]) {
  test(`server location search is case-insensitive for ${field}`, async () => {
    const f = fixture({ rows: [property({ [field]: "Test Location" })] });
    assert.equal(
      (await f.service.fetchTenantProperties({ text: "tEsT lOcAtIoN" })).length,
      1,
    );
  });
}
test("free-text exact city/type filters ignore case without adding substring wildcards", async () => {
  const f = fixture({
    rows: [
      property({ city: "Imus", property_type: "Apartment" }),
      property({ city: "New Imus", property_type: "Apartment" }),
    ],
  });
  assert.equal(
    (
      await f.service.fetchTenantProperties({
        city: "IMUS",
        propertyType: "aPaRtMeNt",
      })
    ).length,
    1,
  );
  assert.deepEqual(f.calls[0].ilike, {
    city: "IMUS",
    property_type: "aPaRtMeNt",
  });
});
test("cancellation helper recognizes native and Supabase-wrapped aborts but not real errors", () => {
  const { service } = fixture();
  for (const error of [
    Object.assign(new Error("cancelled"), { name: "AbortError" }),
    { code: "ABORT_ERR" },
    { message: "Error: fetch failed: The operation was aborted." },
  ])
    assert.equal(service.isCancellationError(error), true);
  for (const error of [
    null,
    { message: "fetch failed: Network request failed" },
    { message: "permission denied", code: "42501" },
    { message: "transaction aborted" },
  ])
    assert.equal(service.isCancellationError(error), false);
  const controller = new AbortController();
  controller.abort();
  assert.equal(service.isCancellationError({}, controller.signal), true);
});
test("returned and thrown cancellations bypass generic discovery logging", async () => {
  for (const rejectRequest of [false, true]) {
    const f = fixture({
      requestError: {
        message: "Error: fetch failed: The operation was aborted.",
      },
      rejectRequest,
    });
    await assert.rejects(
      f.service.fetchTenantProperties(),
      (e) =>
        f.service.isCancellationError(e) &&
        !e.message.includes("Unable to load"),
    );
    assert.deepEqual(f.logs, []);
  }
  const f = fixture();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    f.service.fetchTenantProperties({}, controller.signal),
    (e) => f.service.isCancellationError(e),
  );
  assert.equal(f.calls.length, 0);
});
test("genuine returned and thrown failures still log and expose the retry message", async () => {
  for (const rejectRequest of [false, true]) {
    const f = fixture({
      requestError: { message: "Network request failed" },
      rejectRequest,
    });
    await assert.rejects(
      f.service.fetchTenantProperties(),
      /Unable to load properties/,
    );
    assert.equal(f.logs.length, 1);
  }
});
test("signal cancellation wins over a late successful response without logging", async () => {
  const controller = new AbortController();
  const f = fixture({
    fail: () => {
      controller.abort();
      return false;
    },
  });
  await assert.rejects(
    f.service.fetchTenantProperties({}, controller.signal),
    (e) => f.service.isCancellationError(e),
  );
  assert.deepEqual(f.logs, []);
});

function hookFixture() {
  const state = [],
    requests = [],
    timers = new Map();
  let index = 0,
    effect,
    timerId = 0;
  const service = fixture().service;
  const module = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync("src/hooks/use-tenant-discovery.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    AbortController,
    setTimeout: (callback, delay) => {
      assert.equal(delay, 300);
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
  })(
    (name) => {
      if (name === "react")
        return {
          useCallback: (callback) => callback,
          useState: (initial) => {
            const slot = index++;
            if (!(slot in state)) state[slot] = initial;
            return [
              state[slot],
              (value) => {
                state[slot] =
                  typeof value === "function" ? value(state[slot]) : value;
              },
            ];
          },
        };
      if (name === "expo-router")
        return {
          useFocusEffect: (callback) => {
            effect = callback;
          },
        };
      if (name === "../auth/useAuth")
        return { useAuth: () => ({ user: { id: USER } }) };
      assert.equal(name, "../services/tenant-discovery.service");
      return {
        isCancellationError: service.isCancellationError,
        fetchTenantProperties: (filters, signal) =>
          new Promise((resolve, reject) =>
            requests.push({ filters, signal, resolve, reject }),
          ),
      };
    },
    module,
    module.exports,
  );
  return {
    state,
    requests,
    start(filters = {}) {
      index = 0;
      module.exports.useTenantDiscovery(filters);
      return effect();
    },
    runTimers() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((callback) => callback());
    },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
test("hook silently handles cancellation and genuine failures retain retry behavior", async () => {
  const h = hookFixture();
  h.start();
  h.runTimers();
  h.requests[0].reject({
    message: "Error: fetch failed: The operation was aborted.",
  });
  await flush();
  assert.equal(h.state[2], "");
  assert.equal(h.state[1], false);
  h.start();
  h.runTimers();
  h.requests[1].reject(
    new Error("Unable to load properties. Please try again."),
  );
  await flush();
  assert.match(h.state[2], /Unable to load properties/);
});
test("stale success, error and completion cannot overwrite a newer search", async () => {
  for (const outcome of ["success", "error", "abort"]) {
    const h = hookFixture();
    const cleanup = h.start({ text: "t" });
    h.runTimers();
    cleanup();
    h.start({ text: "test" });
    h.runTimers();
    assert.equal(h.requests[0].signal.aborted, true);
    if (outcome === "success")
      h.requests[0].resolve([property({ name: "Old" })]);
    else
      h.requests[0].reject(
        new Error(
          outcome === "abort" ? "The operation was aborted." : "Old failure",
        ),
      );
    await flush();
    assert.equal(h.state[1], true);
    h.requests[1].resolve([property({ name: "New" })]);
    await flush();
    assert.equal(h.state[0][0].name, "New");
    assert.equal(h.state[2], "");
    assert.equal(h.state[1], false);
  }
  const h = hookFixture();
  const cleanup = h.start({ text: "t" });
  h.runTimers();
  cleanup();
  h.start({ text: "test" });
  h.runTimers();
  h.requests[1].resolve([property({ name: "New" })]);
  await flush();
  h.requests[0].resolve([property({ name: "Old" })]);
  await flush();
  assert.equal(h.state[0][0].name, "New");
});
test("rapid typing debounces requests and focus cleanup prevents state updates", async () => {
  const h = hookFixture();
  for (const text of ["t", "te", "tes"]) h.start({ text })();
  const cleanup = h.start({ text: "test" });
  h.runTimers();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].filters.text, "test");
  cleanup();
  h.requests[0].resolve([property()]);
  await flush();
  assert.equal(h.state[0].length, 0);
});
