import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  lstatSync,
} from "node:fs";
import { resolve, relative, join, basename } from "node:path";
import { createHash } from "node:crypto";
const probe = process.argv.includes("--runtime-probe");
const root = new URL("../", import.meta.url).pathname,
  destination = resolve(
    root,
    probe ? ".build/runtime-probe" : ".build/eas-context",
  );
const allowed = [
  "App.tsx",
  "Viewer.tsx",
  "index.ts",
  "app.json",
  "app.config.ts",
  "eas.json",
  "babel.config.js",
  "jest.config.cjs",
  "playwright.config.mjs",
  "metro.config.js",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
  "assets",
  "src",
  "vendor",
  "scripts",
  "tests",
  "LICENSE",
];
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const entry of allowed)
  cpSync(resolve(root, entry), resolve(destination, entry), {
    recursive: true,
    filter: (source) => {
      if (lstatSync(source).isSymbolicLink())
        throw Error("Build input cannot be a symlink: " + source);
      if (
        /^(\.env|\.dev\.vars)(\.|$)/.test(basename(source)) ||
        /\.(p8|p12|pem|key|jks|mobileprovision)$/i.test(source)
      )
        throw Error(
          "Credentials cannot be build inputs: " + relative(root, source),
        );
      return true;
    },
  });
writeFileSync(
  join(destination, ".easignore"),
  "node_modules/\n.build/\ndist/\n.expo/\n.env*\n.dev.vars*\n*.p12\n*.p8\n*.jks\n",
);
if (probe) {
  const packagePath = join(destination, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  pkg.main = "tests/device/runtime-app.tsx";
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  // This diagnostic entry must never be submitted as the product binary.
  const easPath = join(destination, "eas.json");
  const eas = JSON.parse(readFileSync(easPath, "utf8"));
  delete eas.build.production;
  writeFileSync(easPath, JSON.stringify(eas, null, 2) + "\n");
}
const files = {};
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name),
      stat = lstatSync(path);
    if (stat.isDirectory()) walk(path);
    else
      files[relative(destination, path)] = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
  }
}
walk(destination);
writeFileSync(
  join(destination, "build-inputs.json"),
  JSON.stringify({ version: 1, files }, null, 2) + "\n",
);
console.log(
  `Prepared app-only ${probe ? "synthetic runtime probe" : "EAS context"}: ${destination} (${Object.keys(files).length} reviewed files). No sibling source is read.`,
);
