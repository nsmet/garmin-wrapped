import sharp from "sharp";
import { readFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const icon = await sharp(new URL("assets/icon.png", root).pathname).metadata();
if (icon.width !== 1024 || icon.height !== 1024 || icon.hasAlpha)
  throw Error("iOS icon must be an opaque 1024 × 1024 PNG.");
const fonts = readFileSync(new URL("src/viewer/fonts.css", root), "utf8");
const expected = (
  readFileSync(new URL("vendor/public/fonts.css", root), "utf8").match(
    /@font-face/g,
  ) || []
).length;
const urls = [...fonts.matchAll(/url\(([^)]+)\)/g)].map((match) =>
  match[1].trim().replace(/^['"]|['"]$/g, ""),
);
if (
  urls.length !== expected ||
  urls.some((url) => !url.startsWith("data:font/woff2;base64,"))
)
  throw Error(
    `All ${expected} original fonts must be embedded for offline native DOM rendering.`,
  );
const assets = readFileSync(new URL("src/viewer/assets.css", root), "utf8");
if (!assets.includes("data:image/webp;base64,"))
  throw Error("Bundled rider asset is missing.");
console.log(
  "Opaque iOS icon, licensed embedded fonts and rider asset verified.",
);
