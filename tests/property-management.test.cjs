const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "650e8400-e29b-41d4-a716-446655440000";

function loadFile(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(
    (name) => {
      if (!Object.hasOwn(mocks, name)) throw new Error(`Missing mock ${name}`);
      return mocks[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}
function fixture({
  property = {
    id: ID,
    owner_id: "owner",
    verified: true,
    status: "inactive",
    rooms: [],
    property_images: [],
    property_amenities: [],
  },
  fail,
} = {}) {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, filters: {}, action: "read" };
      const query = {
        select(fields) {
          call.fields = fields;
          return query;
        },
        update(payload) {
          call.action = "update";
          call.payload = payload;
          return query;
        },
        insert(payload) {
          call.action = "insert";
          call.payload = payload;
          return query;
        },
        delete() {
          call.action = "delete";
          return query;
        },
        eq(key, value) {
          call.filters[key] = value;
          return query;
        },
        in(key, value) {
          call.filters[key] = value;
          return query;
        },
        order() {
          return query;
        },
        then(resolve, reject) {
          calls.push(call);
          return Promise.resolve({
            data:
              table === "amenities"
                ? [{ id: 1 }, { id: 2 }, { id: 10 }]
                : [{ id: "changed" }],
            error: fail?.(call) ? new Error("policy blocked") : null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
    storage: {
      from() {
        return {
          getPublicUrl(path) {
            return {
              data: {
                publicUrl: `https://project.test/storage/v1/object/public/property-images/${path}`,
              },
            };
          },
          async remove(paths) {
            calls.push({ action: "storage-remove", paths });
            return { data: paths.map((name) => ({ name })), error: null };
          },
          async upload(path, bytes) {
            calls.push({ action: "storage-upload", path, bytes });
            return { error: null };
          },
        };
      },
    },
  };
  const core = loadFile("src/services/property.service.ts", {
    "expo-crypto": { randomUUID: () => "unique" },
    "expo-file-system": { File: class {} },
    "react-native": { Platform: { OS: "android" } },
    "../lib/supabase": { requireSupabase: () => client },
  });
  const service = loadFile("src/services/property-management.service.ts", {
    "expo-crypto": { randomUUID: () => "unique" },
    "../lib/supabase": { requireSupabase: () => client },
    "./property.service": {
      ...core,
      getManagedProperty: async (id, ownerId) =>
        property && property.id === id && property.owner_id === ownerId
          ? property
          : null,
      readPropertyPhoto: async () => ({
        bytes: new ArrayBuffer(3),
        extension: "png",
        contentType: "image/png",
      }),
    },
  });
  return { ...service, isPropertyId: core.isPropertyId, calls };
}
const room = {
  name: "Room A",
  description: "",
  monthly_rent: "1000",
  capacity: "2",
  available_slots: "0",
};
const edit = {
  name: " Property ",
  property_type: "Apartment",
  description: "",
  address: "Street",
  barangay: "Barangay",
  city: "Bacoor",
  monthly_rent: "1000",
  security_deposit: "0",
  electricity_included: false,
  water_included: true,
  internet_included: false,
};

test("UUID validation rejects missing, malformed and path-like IDs", () => {
  const f = fixture();
  assert.ok(f.isPropertyId(ID));
  for (const id of ["", "abc", `${ID}/file`, `${ID}'`, "../../properties"])
    assert.equal(f.isPropertyId(id), false);
});
test("room validation enforces whole-number capacity, slot range and derived availability", () => {
  const f = fixture();
  assert.equal(f.validateRoomEdit(room).available, false);
  assert.equal(
    f.validateRoomEdit({ ...room, available_slots: "1" }).available,
    true,
  );
  for (const change of [
    { capacity: "0" },
    { capacity: "1.5" },
    { available_slots: "3" },
    { available_slots: "-1" },
    { available_slots: "1.2" },
    { monthly_rent: "Infinity" },
    { monthly_rent: "0" },
    { name: " " },
  ])
    assert.throws(() => f.validateRoomEdit({ ...room, ...change }));
});
test("property edits whitelist fields and preserve Cavite", () => {
  const f = fixture();
  const result = f.validatePropertyEdit({
    ...edit,
    owner_id: "attacker",
    status: "active",
    verified: true,
    created_at: "fake",
    province: "Other",
  });
  assert.equal(result.name, "Property");
  assert.equal(result.province, "Cavite");
  for (const key of ["owner_id", "status", "verified", "created_at"])
    assert.equal(result[key], undefined);
  assert.throws(() => f.validatePropertyEdit({ ...edit, monthly_rent: "0" }));
  assert.throws(() =>
    f.validatePropertyEdit({ ...edit, security_deposit: "-1" }),
  );
});
test("amenity diff deduplicates additions and removals", () => {
  assert.deepEqual(fixture().amenityDiff([1, 2, 2], [2, 10, 10]), {
    additions: [10],
    removals: [1],
  });
});
test("status controls allow only active/inactive transitions", () => {
  const f = fixture();
  f.validateStatusTransition("active", "inactive");
  f.validateStatusTransition("inactive", "active");
  for (const from of ["draft", "pending", "rejected", "active"])
    assert.throws(() => f.validateStatusTransition(from, "active"));
});
test("Storage path extraction rejects other buckets, properties, hosts and traversal", () => {
  const f = fixture(),
    root = "https://project.test/storage/v1/object/public/property-images/";
  assert.equal(
    f.safePropertyImagePath(`${root}${ID}/photo.png`, ID, root),
    `${ID}/photo.png`,
  );
  for (const url of [
    `${root}${OTHER}/photo.png`,
    `${root}${ID}/sub/photo.png`,
    `${root}${ID}/%2e%2e`,
    `${root}${ID}/%2fother.png`,
    `${root}${ID}/bad%5cpath`,
    `${root}${ID}/bad%00.png`,
    `${root}${ID}/photo.png?path=other`,
    `${root}${ID}/photo.png#other`,
    `https://evil.test/storage/v1/object/public/property-images/${ID}/photo.png`,
    `https://project.test/storage/v1/object/public/avatars/${ID}/photo.png`,
  ])
    assert.throws(() => f.safePropertyImagePath(url, ID, root));
});
test("photo count accepts eight total and rejects overflowing or empty additions", () => {
  const f = fixture();
  f.validatePhotoCount(7, 1);
  f.validatePhotoCount(0, 8);
  for (const values of [
    [8, 1],
    [7, 2],
    [0, 0],
    [-1, 1],
    [1, 0.5],
  ])
    assert.throws(() => f.validatePhotoCount(...values));
});
test("management refuses non-owned properties before any mutation", async () => {
  const f = fixture();
  for (const operation of [
    () => f.updateOwnerProperty(ID, "other-owner", edit),
    () => f.savePropertyRoom(ID, "other-owner", null, room),
    () => f.deletePropertyRoom(ID, "other-owner", "room-id"),
    () => f.updatePropertyAmenities(ID, "other-owner", [1]),
    () => f.updateOwnerListingStatus(ID, "other-owner", "active"),
    () => f.setPropertyCoverImage(ID, "other-owner", "photo-id"),
    () => f.deletePropertyImage(ID, "other-owner", "photo-id"),
  ])
    await assert.rejects(operation());
  assert.equal(f.calls.length, 0);
});
test("status mutation includes owner, previous status and verification filters", async () => {
  const f = fixture();
  await f.updateOwnerListingStatus(ID, "owner", "active");
  assert.deepEqual(f.calls[0].filters, {
    id: ID,
    owner_id: "owner",
    status: "inactive",
    verified: true,
  });
  assert.deepEqual(f.calls[0].payload, { status: "active" });
  const unverified = fixture({
    property: {
      id: ID,
      owner_id: "owner",
      verified: false,
      status: "inactive",
    },
  });
  await assert.rejects(
    unverified.updateOwnerListingStatus(ID, "owner", "active"),
  );
  assert.equal(unverified.calls.length, 0);
});
test("room update checks membership and scopes both room ID and parent ID", async () => {
  const f = fixture({
    property: { id: ID, owner_id: "owner", rooms: [{ id: "room-id" }] },
  });
  await f.savePropertyRoom(ID, "owner", "room-id", room);
  assert.deepEqual(f.calls[0].filters, { id: "room-id", property_id: ID });
  await assert.rejects(f.deletePropertyRoom(ID, "owner", "unrelated-room"));
  assert.equal(f.calls.length, 1);
});
test("amenity save uses fetched IDs and modifies only selected differences", async () => {
  const f = fixture({
    property: {
      id: ID,
      owner_id: "owner",
      property_amenities: [{ amenity_id: 1 }, { amenity_id: 2 }],
    },
  });
  await f.updatePropertyAmenities(ID, "owner", [2, 10, 10]);
  assert.deepEqual(f.calls[1].payload, [{ property_id: ID, amenity_id: 10 }]);
  assert.deepEqual(f.calls[2].filters, { property_id: ID, amenity_id: [1] });
});
test("photo DB deletion failure after file removal reports partial failure", async () => {
  const f = fixture({
    property: {
      id: ID,
      owner_id: "owner",
      property_images: [
        {
          id: "photo-id",
          image_url: `https://project.test/storage/v1/object/public/property-images/${ID}/photo.png`,
          sort_order: 0,
          is_cover: true,
        },
      ],
    },
    fail: (call) => call.action === "delete",
  });
  await assert.rejects(
    f.deletePropertyImage(ID, "owner", "photo-id"),
    /file was removed/,
  );
  assert.equal(f.calls[0].action, "storage-remove");
  assert.deepEqual(f.calls[1].filters, { property_id: ID, id: "photo-id" });
});

test("cover update is property-scoped and attempts restoration after failure", async () => {
  const photos = [
    { id: "old-cover", is_cover: true, sort_order: 0 },
    { id: "new-cover", is_cover: false, sort_order: 1 },
  ];
  const f = fixture({
    property: { id: ID, owner_id: "owner", property_images: photos },
    fail: (call) => call.action === "update" && call.filters.id === "new-cover",
  });
  await assert.rejects(f.setPropertyCoverImage(ID, "owner", "new-cover"));
  assert.equal(f.calls.length, 4);
  assert.ok(f.calls.every((call) => call.filters.property_id === ID));
  assert.deepEqual(f.calls[3].filters, { property_id: ID, id: "old-cover" });
  assert.deepEqual(f.calls[3].payload, { is_cover: true });
});

test("deleting a cover promotes the lowest sorted remaining photo", async () => {
  const root = "https://project.test/storage/v1/object/public/property-images/";
  const f = fixture({
    property: {
      id: ID,
      owner_id: "owner",
      property_images: [
        {
          id: "first",
          is_cover: false,
          sort_order: 1,
          image_url: `${root}${ID}/first.png`,
        },
        {
          id: "cover",
          is_cover: true,
          sort_order: 2,
          image_url: `${root}${ID}/cover.png`,
        },
        {
          id: "last",
          is_cover: false,
          sort_order: 3,
          image_url: `${root}${ID}/last.png`,
        },
      ],
    },
  });
  await f.deletePropertyImage(ID, "owner", "cover");
  assert.equal(f.calls[0].action, "storage-remove");
  assert.equal(f.calls[1].action, "delete");
  assert.deepEqual(f.calls[3].filters, { property_id: ID, id: "first" });
  assert.deepEqual(f.calls[3].payload, { is_cover: true });
});

test("photo additions enforce total count before reading or uploading", async () => {
  const f = fixture({
    property: {
      id: ID,
      owner_id: "owner",
      property_images: Array.from({ length: 8 }, (_, index) => ({
        id: String(index),
      })),
    },
  });
  await assert.rejects(
    f.uploadPropertyImages(ID, "owner", [
      { id: "new", uri: "file:///new.png" },
    ]),
    /at most 8/,
  );
  assert.equal(f.calls.length, 0);
});

test("native photo reader rejects files over the bucket size before allocating upload bytes", async () => {
  let read = false;
  const core = loadFile("src/services/property.service.ts", {
    "expo-crypto": { randomUUID: () => "unused" },
    "expo-file-system": {
      File: class {
        size = 5_242_881;
        async arrayBuffer() {
          read = true;
          return new ArrayBuffer(1);
        }
      },
    },
    "react-native": { Platform: { OS: "android" } },
    "../lib/supabase": {
      requireSupabase: () => {
        throw new Error("must not access client");
      },
    },
  });
  await assert.rejects(
    core.readPropertyPhoto({ id: "a", uri: "file:///large.png" }),
    /5 MB/,
  );
  assert.equal(read, false);
});
