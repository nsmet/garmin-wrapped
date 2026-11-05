import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
const root = new URL("../", import.meta.url).pathname,
  out = resolve(root, ".build/viewer-tests");
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [resolve(root, "tests/viewer/entry.tsx")],
  outdir: out,
  bundle: true,
  format: "esm",
  loader: { ".woff2": "file", ".webp": "file" },
  assetNames: "assets/[name]-[hash]",
  define: { "process.env.NODE_ENV": '"production"' },
});
writeFileSync(
  resolve(out, "index.html"),
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/entry.css"></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>',
);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
};
createServer((req, res) => {
  const url = new URL(req.url, "http://localhost"),
    bundle = url.pathname.match(/^\/release-(ios|android)\//),
    base = bundle ? resolve(root, ".build", bundle[1]) : out;
  const pathname = bundle
    ? url.pathname.replace(/^\/release-(ios|android)/, "")
    : url.pathname;
  const path = resolve(base, "." + pathname.replace(/\/$/, "/index.html"));
  if (!path.startsWith(base + "/") || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": types[extname(path)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(readFileSync(path));
}).listen(4176, "127.0.0.1");
