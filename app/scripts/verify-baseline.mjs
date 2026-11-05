import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../vendor/", import.meta.url),
  manifest = JSON.parse(readFileSync(new URL("source-manifest.json", root)));
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual = createHash("sha256")
    .update(readFileSync(new URL("public/" + file, root)))
    .digest("hex");
  if (actual !== expected)
    throw Error("Pinned website baseline differs: " + file);
}
console.log(
  `Verified ${Object.keys(manifest.files).length} immutable baseline files from ${manifest.commit}.`,
);
