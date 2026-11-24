import fs from "node:fs";
import { execFileSync } from "node:child_process";
const manifest = JSON.parse(fs.readFileSync("extension/manifest.json"));
if (manifest.manifest_version !== 3) throw Error("MV3 required");
for (const f of ["background.js", "content.js", "engine.js", "popup.js"])
  execFileSync(process.execPath, ["--check", "extension/" + f]);
for (const f of [
  ...manifest.content_scripts.flatMap((c) => c.js || []),
  ...manifest.content_scripts[0].css,
  manifest.action.default_popup,
  manifest.background.service_worker,
])
  if (!fs.existsSync("extension/" + f)) throw Error("Missing " + f);
if (manifest.permissions.join(",") !== "storage")
  throw Error("Unexpected permissions");
console.log(
  "Extension syntax, manifest assets, and least-privilege permissions passed.",
);
