const assert = require("assert");
const fs = require("fs");
const path = require("path");
const SplitFileAdapter = require("../src/db/SplitFileAdapter");

const rootDirectory = path.join(__dirname, "..");
const original = JSON.parse(fs.readFileSync(path.join(rootDirectory, "db.json"), "utf8"));
const reconstructed = new SplitFileAdapter(path.join(rootDirectory, "data")).read();

assert.deepStrictEqual(reconstructed, original);
console.log(`Split database verified: ${Object.keys(original).length} root resources, ${original.designs.length} designs.`);
