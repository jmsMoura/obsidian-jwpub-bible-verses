import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.argv[2];
const minAppVersion = process.argv[3];

// read minAppVersion from manifest.json if it's not provided
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion: currentMinAppVersion } = manifest;

// Check if manifest.json exists
if (!targetVersion) {
  console.error("Missing version argument - please provide a version number");
  process.exit(1);
}

// Update manifest.json
manifest.version = targetVersion;
if (minAppVersion) {
  manifest.minAppVersion = minAppVersion;
}
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2));

// Update versions.json - create if it doesn't exist
let versions = {};
try {
  versions = JSON.parse(readFileSync("versions.json", "utf8"));
} catch (error) {
  console.log("versions.json not found, creating it");
}

versions[targetVersion] = minAppVersion || currentMinAppVersion;

writeFileSync("versions.json", JSON.stringify(versions, null, 2));

console.log(`Version updated to ${targetVersion}`); 