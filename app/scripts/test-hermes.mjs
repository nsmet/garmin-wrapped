import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const runtime = process.env.HERMES_BIN;
if (!runtime)
  throw Error(
    "Set HERMES_BIN to a matching Hermes v1 runtime with Intl enabled. The bundled hermesc compiler alone cannot execute these checks.",
  );
const root = new URL("../", import.meta.url).pathname;
mkdirSync(root + ".build/hermes", { recursive: true });
const file = root + ".build/hermes/domain.js";
await build({
  entryPoints: [
    root +
      (process.argv.includes("--portable")
        ? "tests/hermes/portable-entry.mjs"
        : "tests/hermes/domain-entry.mjs"),
  ],
  bundle: true,
  outfile: file,
  platform: "neutral",
  format: "iife",
  target: "es2020",
});
const result = spawnSync(runtime, [file], { stdio: "inherit" });
process.exitCode = result.status || 0;
if (result.error) throw result.error;
