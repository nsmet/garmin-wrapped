import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
// Run each file explicitly: some runners suppress node:test child-test output.
let failed = false;
for (const file of readdirSync(new URL("../tests/", import.meta.url))
  .filter((f) => f.endsWith(".test.mjs"))
  .sort()) {
  const result = spawnSync(
    process.execPath,
    [new URL("../tests/" + file, import.meta.url).pathname],
    { stdio: "inherit" },
  );
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
