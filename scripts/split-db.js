const fs = require("fs");
const path = require("path");

const rootDirectory = path.join(__dirname, "..");
const sourcePath = path.join(rootDirectory, "db.json");
const dataDirectory = path.join(rootDirectory, "data");
const collectionsDirectory = path.join(dataDirectory, "collections");
const designsDirectory = path.join(dataDirectory, "designs");
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertSafeName(value, label) {
  const name = String(value);
  if (!SAFE_NAME.test(name) || name === "." || name === "..") {
    throw new Error(`Unsafe ${label}: ${String(value)}`);
  }
  return name;
}

function isSameJson(filePath, value) {
  try {
    return JSON.stringify(JSON.parse(fs.readFileSync(filePath, "utf8"))) === JSON.stringify(value);
  } catch (_) {
    return false;
  }
}

function ensureExpectedOrAbsent(filePath, value, label) {
  if (fs.existsSync(filePath) && !isSameJson(filePath, value)) {
    throw new Error(`Refusing to overwrite unrelated existing ${label}: ${filePath}`);
  }
}

function main() {
  const database = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (!database || typeof database !== "object" || Array.isArray(database)) {
    throw new Error("db.json must contain a root object");
  }
  if (!Array.isArray(database.designs)) {
    throw new Error("db.json designs must be an array");
  }

  const designNames = new Set();
  const outputs = [];
  for (const [resourceName, value] of Object.entries(database)) {
    if (resourceName === "designs") {
      continue;
    }
    const safeName = assertSafeName(resourceName, "resource name");
    outputs.push({ filePath: path.join(collectionsDirectory, `${safeName}.json`), value, label: `collection ${resourceName}` });
  }
  const index = database.designs.map((design) => {
    if (!design || typeof design !== "object" || Array.isArray(design) || design.id === null || design.id === undefined) {
      throw new Error("Each design must be an object with a non-null id");
    }
    const designName = assertSafeName(design.id, "design ID");
    if (designNames.has(designName)) {
      throw new Error(`Duplicate design ID: ${String(design.id)}`);
    }
    designNames.add(designName);
    outputs.push({ filePath: path.join(designsDirectory, `${designName}.json`), value: design, label: `design ${String(design.id)}` });
    return design.id;
  });
  outputs.push({ filePath: path.join(designsDirectory, "index.json"), value: index, label: "design index" });

  for (const output of outputs) {
    ensureExpectedOrAbsent(output.filePath, output.value, output.label);
  }

  fs.mkdirSync(collectionsDirectory, { recursive: true });
  fs.mkdirSync(designsDirectory, { recursive: true });
  for (const output of outputs) {
    fs.writeFileSync(output.filePath, formatJson(output.value), "utf8");
  }
  console.log(`Split ${Object.keys(database).length} root resources and ${index.length} designs.`);
}

main();
