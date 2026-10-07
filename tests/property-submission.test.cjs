const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function fixture(failAt) {
  const calls = [];
  let sequence = 0;
  const client = {
    from(table) {
      return {
        select() {
          const query = {
            eq() {
              return query;
            },
            single: async () => ({
              data: {
                id: "new-property",
                owner_id: "owner",
                status: "pending",
              },
              error: null,
            }),
          };
          return query;
        },
        insert(rows) {
          calls.push({ action: "insert", table, rows });
          const result = {
            data: { id: "new-property" },
            error: failAt === table ? new Error(table) : null,
          };
          return {
            ...Promise.resolve(result),
            then: Promise.resolve(result).then.bind(Promise.resolve(result)),
            select: () => ({ single: async () => result }),
          };
        },
        delete() {
          const filters = {};
          const query = {
            eq(key, value) {
              filters[key] = value;
              return query;
            },
            then(resolve, reject) {
              calls.push({ action: "delete", table, filters });
              return Promise.resolve({
                error: failAt === `delete:${table}` ? new Error(table) : null,
              }).then(resolve, reject);
            },
          };
          return query;
        },
      };
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "property-images");
        return {
          async upload(path, bytes, options) {
            calls.push({ action: "upload", path, bytes, options });
            return { error: failAt === "upload" ? new Error("upload") : null };
          },
          getPublicUrl: (path) => ({
            data: { publicUrl: `https://images.test/${path}` },
          }),
          async remove(paths) {
            calls.push({ action: "remove", paths });
            return { error: null };
          },
        };
      },
    },
  };
  class File {
    size = 3;
    type = "image/png";
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3]).buffer;
    }
  }
  const mocks = {
    "expo-crypto": { randomUUID: () => `photo-${++sequence}` },
    "expo-file-system": { File },
    "react-native": { Platform: { OS: "android" } },
    "../lib/supabase": { requireSupabase: () => client },
  };
  const output = ts.transpileModule(
    fs.readFileSync("src/services/property.service.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(
    (name) => mocks[name],
    module,
    module.exports,
  );
  return { ...module.exports, calls };
}

const params = {
  owner_id: "untrusted-owner",
  propertyName: [" My Property "],
  propertyType: "Apartment",
  address: "Street",
  barangay: "Barangay",
  city: "Bacoor",
  province: "Untrusted",
  monthlyRent: "1000",
  securityDeposit: "",
  electricityIncluded: "true",
  waterIncluded: "false",
  internetIncluded: "false",
  rooms: JSON.stringify([
    {
      id: 99,
      name: "Room A",
      monthlyRent: "1000",
      capacity: "2",
      availableSlots: "0",
    },
  ]),
  amenities: JSON.stringify(["security", "wifi", "wifi"]),
};
const photos = [
  { id: "a", uri: "file:///a.png" },
  { id: "b", uri: "file:///b.png" },
];

test("submission uses authenticated ownership, pending status, confirmed IDs and native bytes", async () => {
  const f = fixture();
  assert.equal(
    await f.submitProperty("authenticated-owner", params, photos, "b"),
    "new-property",
  );
  const inserts = f.calls.filter((call) => call.action === "insert");
  assert.equal(inserts[0].rows.owner_id, "authenticated-owner");
  assert.equal(inserts[0].rows.province, "Cavite");
  assert.equal(inserts[0].rows.status, "pending");
  assert.equal(inserts[0].rows.verified, false);
  assert.equal(inserts[0].rows.security_deposit, 0);
  assert.equal(inserts[1].rows[0].available, false);
  assert.equal(inserts[1].rows[0].id, undefined);
  assert.deepEqual(
    inserts[2].rows.map((row) => row.amenity_id),
    [8, 1],
  );
  assert.deepEqual(
    inserts[3].rows.map((row) => [row.is_cover, row.sort_order]),
    [
      [false, 0],
      [true, 1],
    ],
  );
  const uploads = f.calls.filter((call) => call.action === "upload");
  assert.ok(
    uploads.every(
      (call) =>
        call.path.startsWith("new-property/") &&
        call.bytes instanceof ArrayBuffer,
    ),
  );
  assert.notEqual(uploads[0].path, uploads[1].path);
});

test("malformed JSON, wrong shapes and invalid numbers fail before any writes", async () => {
  for (const changed of [
    { rooms: "{" },
    { rooms: "null" },
    { amenities: '["unknown"]' },
    { monthlyRent: "Infinity" },
    { electricityIncluded: "yes" },
    {
      rooms: JSON.stringify([
        {
          id: 1,
          name: "A",
          monthlyRent: "1",
          capacity: "1.5",
          availableSlots: "0",
        },
      ]),
    },
  ]) {
    const f = fixture();
    await assert.rejects(
      f.submitProperty("owner", { ...params, ...changed }, photos, "a"),
    );
    assert.equal(f.calls.length, 0);
  }
});

test("later failures remove Storage before child rows and the owned property", async () => {
  for (const step of [
    "rooms",
    "property_amenities",
    "upload",
    "property_images",
  ]) {
    const f = fixture(step);
    await assert.rejects(f.submitProperty("owner", params, photos, "a"));
    const deletions = f.calls.filter((call) => call.action === "delete");
    assert.deepEqual(
      deletions.map((call) => call.table),
      ["property_images", "property_amenities", "rooms", "properties"],
    );
    assert.ok(
      deletions
        .slice(0, 3)
        .every((call) => call.filters.property_id === "new-property"),
    );
    assert.deepEqual(deletions[3].filters, {
      id: "new-property",
      owner_id: "owner",
    });
    const removeIndex = f.calls.findIndex((call) => call.action === "remove");
    if (removeIndex >= 0)
      assert.ok(
        removeIndex < f.calls.findIndex((call) => call.action === "delete"),
      );
  }
});

test("missing cover falls back to exactly one cover; property insert failure has no cleanup", async () => {
  const f = fixture();
  await f.submitProperty("owner", params, photos, null);
  const images = f.calls.find((call) => call.table === "property_images").rows;
  assert.deepEqual(
    images.map((row) => row.is_cover),
    [true, false],
  );
  const failed = fixture("properties");
  await assert.rejects(failed.submitProperty("owner", params, photos, "a"));
  assert.equal(failed.calls.length, 1);
});
