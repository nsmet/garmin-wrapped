export const CHUNK_SIZE = 49152,
  MAX_PNG_BYTES = 12000000;
const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// Portable small decoder; no dependency on Buffer/atob in native Hermes.
export function decodeBase64(text) {
  if (
    typeof text !== "string" ||
    text.length % 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(text)
  )
    throw Error("Invalid image transfer.");
  const bytes = new Uint8Array(
    (text.length / 4) * 3 -
      (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0),
  );
  let n = 0;
  for (let i = 0; i < text.length; i += 4) {
    const v =
      (alphabet.indexOf(text[i]) << 18) |
      (alphabet.indexOf(text[i + 1]) << 12) |
      ((text[i + 2] === "=" ? 0 : alphabet.indexOf(text[i + 2])) << 6) |
      (text[i + 3] === "=" ? 0 : alphabet.indexOf(text[i + 3]));
    if (n < bytes.length) bytes[n++] = (v >>> 16) & 255;
    if (n < bytes.length) bytes[n++] = (v >>> 8) & 255;
    if (n < bytes.length) bytes[n++] = v & 255;
  }
  return bytes;
}
export function validatePng(bytes) {
  const header = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 45 ||
    bytes.length > MAX_PNG_BYTES ||
    header.some((v, i) => bytes[i] !== v) ||
    String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
  )
    throw Error("Invalid PNG export.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(16) !== 1080 || view.getUint32(20) !== 1920)
    throw Error("The export must be 1080 × 1920.");
  // Canvas PNGs contain only structural/pixel chunks. Reject location/text/EXIF.
  let offset = 8,
    ended = false;
  while (offset + 12 <= bytes.length) {
    const len = view.getUint32(offset),
      kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (
      !["IHDR", "IDAT", "IEND", "sRGB", "gAMA", "cHRM", "pHYs"].includes(
        kind,
      ) ||
      len > MAX_PNG_BYTES ||
      offset + 12 + len > bytes.length
    )
      throw Error("Unexpected PNG metadata.");
    offset += 12 + len;
    if (kind === "IEND") {
      ended = true;
      break;
    }
  }
  if (!ended || offset !== bytes.length) throw Error("Incomplete PNG export.");
  return bytes;
}
export function createTransfer(accepts) {
  let chunks = [],
    size = 0,
    next = 0,
    complete = false;
  return {
    clear() {
      chunks = [];
      size = 0;
      next = 0;
      complete = true;
    },
    receive(packet) {
      if (
        complete ||
        !accepts(packet) ||
        !Number.isInteger(packet.index) ||
        packet.index !== next ||
        typeof packet.final !== "boolean" ||
        typeof packet.data !== "string" ||
        packet.data.length > CHUNK_SIZE ||
        packet.data.length === 0
      )
        throw Error("The image transfer expired. Please try again.");
      size += packet.data.length;
      if (size > Math.ceil(MAX_PNG_BYTES / 3) * 4)
        throw Error("The image is too large to share.");
      chunks.push(packet.data);
      next++;
      if (!packet.final) return null;
      complete = true;
      const encoded = chunks.join("");
      chunks = [];
      return validatePng(decodeBase64(encoded));
    },
  };
}
