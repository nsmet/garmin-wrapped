import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url),
  source = readFileSync(new URL("vendor/public/favicon.svg", root), "utf8")
    .replace(/<metadata>[\s\S]*?<\/metadata>/, "")
    .replace(/ xmlns:c2pa="[^"]*"/, "");
// Rasterize the existing product's vector logo; no new visual mark or remote assets.
writeFileSync(new URL("assets/brand-source.svg", root), source);
await sharp(Buffer.from(source))
  .resize(1024, 1024)
  .flatten({ background: "#0B1222" })
  .png()
  .toFile(new URL("assets/icon.png", root).pathname);
const foreground = source.replace(/<rect[^>]*\/>/, "");
await sharp(Buffer.from(foreground))
  .resize(1024, 1024)
  .png()
  .toFile(new URL("assets/android-icon-foreground.png", root).pathname);
const monochrome = foreground.replace(
  /fill="#[0-9a-fA-F]+"/g,
  'fill="#ffffff"',
);
await sharp(Buffer.from(monochrome))
  .resize(1024, 1024)
  .png()
  .toFile(new URL("assets/android-icon-monochrome.png", root).pathname);
await sharp(Buffer.from(source))
  .resize(512, 512)
  .png()
  .toFile(new URL("assets/splash-icon.png", root).pathname);
await sharp(Buffer.from(source))
  .resize(64, 64)
  .png()
  .toFile(new URL("assets/favicon.png", root).pathname);
await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: "#0B1222" },
})
  .png()
  .toFile(new URL("assets/android-icon-background.png", root).pathname);
console.log(
  "Native icon and splash assets prepared from the pinned website brand mark.",
);

const fonts = readFileSync(
  new URL("vendor/public/fonts.css", root),
  "utf8",
).replace(
  /url\('([^']+)'\)/g,
  (_, path) =>
    `url('data:font/woff2;base64,${readFileSync(new URL("vendor/public/" + path, root)).toString("base64")}')`,
);
writeFileSync(new URL("src/viewer/fonts.css", root), fonts);
const rider = readFileSync(
  new URL("vendor/public/assets/miniwatt-rider.webp", root),
).toString("base64");
writeFileSync(
  new URL("src/viewer/assets.css", root),
  `.promotion .rider{background-image:url('data:image/webp;base64,${rider}')}\n`,
);
