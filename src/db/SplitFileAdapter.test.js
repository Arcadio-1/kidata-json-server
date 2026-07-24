const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SplitFileAdapter = require("./SplitFileAdapter");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "split-file-adapter-"));
  const collections = path.join(directory, "collections");
  const designs = path.join(directory, "designs");
  writeJson(path.join(collections, "array.json"), [{ id: 1 }]);
  writeJson(path.join(collections, "object.json"), { enabled: true });
  writeJson(path.join(collections, "primitive.json"), "value");
  writeJson(path.join(collections, "empty.json"), null);
  writeJson(path.join(designs, "index.json"), [2, 1]);
  writeJson(path.join(designs, "1.json"), { id: 1, title: "first" });
  writeJson(path.join(designs, "2.json"), { id: 2, title: "second" });
  return directory;
}

function withFixture(callback) {
  const directory = createFixture();
  try {
    callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("read reconstructs values and design index order", () => withFixture((directory) => {
  assert.deepStrictEqual(new SplitFileAdapter(directory).read(), {
    array: [{ id: 1 }],
    empty: null,
    object: { enabled: true },
    primitive: "value",
    designs: [{ id: 2, title: "second" }, { id: 1, title: "first" }],
  });
}));

test("read reports malformed files and invalid design references", () => withFixture((directory) => {
  const collections = path.join(directory, "collections");
  fs.writeFileSync(path.join(collections, "array.json"), "{");
  assert.throws(() => new SplitFileAdapter(directory).read(), /Unable to parse collection array/);
  writeJson(path.join(collections, "array.json"), []);
  fs.writeFileSync(path.join(directory, "designs", "2.json"), "{");
  assert.throws(() => new SplitFileAdapter(directory).read(), /Unable to parse design 2/);
  writeJson(path.join(directory, "designs", "2.json"), { id: 2 });
  fs.unlinkSync(path.join(directory, "designs", "1.json"));
  assert.throws(() => new SplitFileAdapter(directory).read(), /Missing design file/);
}));

test("read rejects duplicate IDs and filename mismatches", () => withFixture((directory) => {
  writeJson(path.join(directory, "designs", "index.json"), [2, 2]);
  assert.throws(() => new SplitFileAdapter(directory).read(), /Duplicate design ID/);
  writeJson(path.join(directory, "designs", "index.json"), [2, 1]);
  writeJson(path.join(directory, "designs", "2.json"), { id: 1 });
  assert.throws(() => new SplitFileAdapter(directory).read(), /Design file ID mismatch/);
}));

test("write updates files, removes managed stale files, and preserves unrelated files", () => withFixture((directory) => {
  const collections = path.join(directory, "collections");
  const designs = path.join(directory, "designs");
  writeJson(path.join(collections, "stale.json"), { stale: true });
  writeJson(path.join(designs, "3.json"), { id: 3, title: "stale" });
  fs.writeFileSync(path.join(collections, "notes.txt"), "keep");
  fs.writeFileSync(path.join(designs, "notes.txt"), "keep");

  new SplitFileAdapter(directory).write({
    array: [{ id: 9 }],
    object: { updated: true },
    primitive: "changed",
    empty: null,
    designs: [{ id: 2, title: "updated" }, { id: 4, title: "new" }],
  });

  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(collections, "array.json"))), [{ id: 9 }]);
  assert.equal(fs.existsSync(path.join(collections, "stale.json")), false);
  assert.equal(fs.existsSync(path.join(designs, "1.json")), false);
  assert.equal(fs.existsSync(path.join(designs, "3.json")), false);
  assert.equal(fs.existsSync(path.join(designs, "4.json")), true);
  assert.equal(fs.readFileSync(path.join(collections, "notes.txt"), "utf8"), "keep");
  assert.equal(fs.readFileSync(path.join(designs, "notes.txt"), "utf8"), "keep");
  assert.match(fs.readFileSync(path.join(designs, "index.json"), "utf8"), /^\[\n  2,\n  4\n\]\n$/);
  assert.match(fs.readFileSync(path.join(designs, "4.json"), "utf8"), /^\{\n  "id": 4,/);
}));

test("write rejects unsafe values and propagates failures", () => withFixture((directory) => {
  const adapter = new SplitFileAdapter(directory);
  assert.throws(() => adapter.write({ "../unsafe": [], designs: [] }), /Unsafe resource name/);
  assert.throws(() => adapter.write({ designs: [{ id: "../unsafe" }] }), /Unsafe design ID/);
  const circular = {};
  circular.circular = circular;
  assert.throws(() => adapter.write({ value: circular, designs: [] }), /circular/i);

  const renameSync = fs.renameSync;
  fs.renameSync = () => {
    throw new Error("simulated rename failure");
  };
  try {
    assert.throws(() => adapter.write({ array: [], designs: [] }), /simulated rename failure/);
  } finally {
    fs.renameSync = renameSync;
  }
}));

test("migrated repository data equals the legacy fixture when it is available", () => {
  const root = path.join(__dirname, "..", "..");
  const legacyPath = path.join(root, "db.json");
  if (!fs.existsSync(legacyPath)) {
    return;
  }
  const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
  assert.deepStrictEqual(new SplitFileAdapter(path.join(root, "data")).read(), legacy);
});
