const fs = require("fs");
const path = require("path");
const Base = require("lowdb/adapters/Base");

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
let temporaryFileCounter = 0;

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

function assertDesignId(id) {
  if (id === null || id === undefined) {
    throw new Error("Design is missing an id");
  }
  return assertSafeName(id, "design ID");
}

function parseJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to parse ${label} at ${filePath}: ${error.message}`);
  }
}

function getJsonFiles(directory, label) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Unable to read ${label} directory at ${directory}: ${error.message}`);
  }

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === ".json")
    .map((entry) => entry.name)
    .sort();
}

function atomicWrite(filePath, content) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${temporaryFileCounter += 1}.tmp`
  );

  try {
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(temporaryPath)) {
        fs.unlinkSync(temporaryPath);
      }
    } catch (_) {
      // Preserve the original write error.
    }
    throw error;
  }
}

class SplitFileAdapter extends Base {
  constructor(dataDirectory) {
    super(dataDirectory);
    this.dataDirectory = dataDirectory;
    this.collectionsDirectory = path.join(dataDirectory, "collections");
    this.designsDirectory = path.join(dataDirectory, "designs");
  }

  read() {
    const data = {};
    const resourceNames = new Set();

    for (const filename of getJsonFiles(this.collectionsDirectory, "collections")) {
      const resourceName = filename.slice(0, -".json".length);
      assertSafeName(resourceName, "resource name");
      if (resourceNames.has(resourceName)) {
        throw new Error(`Duplicate collection resource name: ${resourceName}`);
      }
      resourceNames.add(resourceName);
      data[resourceName] = parseJson(
        path.join(this.collectionsDirectory, filename),
        `collection ${resourceName}`
      );
    }

    const indexPath = path.join(this.designsDirectory, "index.json");
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Missing design index at ${indexPath}`);
    }
    const designIds = parseJson(indexPath, "design index");
    if (!Array.isArray(designIds)) {
      throw new Error("Invalid design index: expected an array of design IDs");
    }

    const designNames = new Set();
    data.designs = designIds.map((id) => {
      const designName = assertDesignId(id);
      if (designNames.has(designName)) {
        throw new Error(`Duplicate design ID in index: ${String(id)}`);
      }
      designNames.add(designName);

      const designPath = path.join(this.designsDirectory, `${designName}.json`);
      if (!fs.existsSync(designPath)) {
        throw new Error(`Missing design file for ID ${String(id)} at ${designPath}`);
      }
      const design = parseJson(designPath, `design ${String(id)}`);
      if (!design || typeof design !== "object" || Array.isArray(design)) {
        throw new Error(`Invalid design record for ID ${String(id)}`);
      }
      if (assertDesignId(design.id) !== designName || design.id !== id) {
        throw new Error(`Design file ID mismatch for ${designName}`);
      }
      return design;
    });

    for (const filename of getJsonFiles(this.designsDirectory, "designs")) {
      if (filename === "index.json") {
        continue;
      }
      const designName = filename.slice(0, -".json".length);
      assertSafeName(designName, "design filename");
      if (!designNames.has(designName)) {
        const candidate = parseJson(path.join(this.designsDirectory, filename), `design ${designName}`);
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate) && assertDesignId(candidate.id) === designName) {
          throw new Error(`Managed design file ${filename} is missing from the design index`);
        }
        throw new Error(`Unexpected JSON file in designs directory: ${filename}`);
      }
    }

    return data;
  }

  write(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Split database root must be an object");
    }
    if (!Array.isArray(data.designs)) {
      throw new Error("Split database designs must be an array");
    }

    const collections = [];
    for (const [resourceName, value] of Object.entries(data)) {
      if (resourceName === "designs") {
        continue;
      }
      assertSafeName(resourceName, "resource name");
      collections.push({ resourceName, content: formatJson(value) });
    }

    const designNames = new Set();
    const designs = data.designs.map((design) => {
      if (!design || typeof design !== "object" || Array.isArray(design)) {
        throw new Error("Design records must be objects");
      }
      const designName = assertDesignId(design.id);
      if (designNames.has(designName)) {
        throw new Error(`Duplicate design ID: ${String(design.id)}`);
      }
      designNames.add(designName);
      return { designName, id: design.id, content: formatJson(design) };
    });
    const indexContent = formatJson(designs.map((design) => design.id));

    if (!fs.existsSync(this.collectionsDirectory) || !fs.existsSync(this.designsDirectory)) {
      throw new Error("Split database directories must exist before writing");
    }

    const staleCollections = getJsonFiles(this.collectionsDirectory, "collections")
      .filter((filename) => !collections.some((collection) => `${collection.resourceName}.json` === filename));
    for (const filename of staleCollections) {
      assertSafeName(filename.slice(0, -".json".length), "resource name");
    }

    const staleDesigns = getJsonFiles(this.designsDirectory, "designs").filter((filename) => {
      if (filename === "index.json" || designs.some((design) => `${design.designName}.json` === filename)) {
        return false;
      }
      const designName = filename.slice(0, -".json".length);
      assertSafeName(designName, "design filename");
      const candidate = parseJson(path.join(this.designsDirectory, filename), `design ${designName}`);
      return candidate && typeof candidate === "object" && !Array.isArray(candidate)
        && assertDesignId(candidate.id) === designName;
    });

    for (const collection of collections) {
      atomicWrite(path.join(this.collectionsDirectory, `${collection.resourceName}.json`), collection.content);
    }
    for (const design of designs) {
      atomicWrite(path.join(this.designsDirectory, `${design.designName}.json`), design.content);
    }
    atomicWrite(path.join(this.designsDirectory, "index.json"), indexContent);

    for (const filename of staleCollections) {
      fs.unlinkSync(path.join(this.collectionsDirectory, filename));
    }
    for (const filename of staleDesigns) {
      fs.unlinkSync(path.join(this.designsDirectory, filename));
    }
  }
}

module.exports = SplitFileAdapter;
