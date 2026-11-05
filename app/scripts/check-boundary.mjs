import { execFileSync } from "node:child_process";
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const baseline = process.argv[2] || "8bb1152cb22a0f8ab12feec09286bbc5a8d04657";
const changed = execFileSync(
  "git",
  ["-C", root, "diff", "--name-only", baseline],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
const untracked = execFileSync(
  "git",
  ["-C", root, "ls-files", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
const outside = [...changed, ...untracked].filter(
  (path) => path && !path.startsWith("app/"),
);
if (outside.length) throw Error("Changes outside app/: " + outside.join(", "));
console.log("All repository changes are inside app/.");
