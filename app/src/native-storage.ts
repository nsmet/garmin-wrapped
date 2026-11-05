import * as SecureStore from "expo-secure-store";
import { Directory, File, Paths } from "expo-file-system";
const KEY = "miniwatt.personal-key.v1";
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation, operation);
  queue = next.catch(() => {});
  return next;
}
export const rememberedKey = {
  read: () => enqueue(() => SecureStore.getItemAsync(KEY, options)),
  forget: () => enqueue(() => SecureStore.deleteItemAsync(KEY, options)),
  save: (value: string, current: () => boolean) =>
    enqueue(async () => {
      if (!current()) return;
      await SecureStore.setItemAsync(KEY, value, options);
      if (!current()) await SecureStore.deleteItemAsync(KEY, options);
    }),
};
const exportsDirectory = () =>
  new Directory(Paths.cache, "miniwatt-exports-v1");
export async function writeExport(bytes: Uint8Array, requestId: string) {
  if (!/^share-[a-z0-9-]+$/.test(requestId))
    throw Error("Invalid export identifier.");
  const directory = exportsDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${requestId}.png`);
  try {
    file.create();
    await file.write(bytes);
    return file.uri;
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
}
export function removeExport(uri: string) {
  const directory = exportsDirectory();
  if (
    uri.startsWith(directory.uri.replace(/\/+$/, "") + "/") &&
    uri.endsWith(".png")
  ) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
export function sweepExports(all = false) {
  const directory = exportsDirectory();
  if (!directory.exists) return;
  // A receiving Android app may consume the content URI after the chooser returns.
  // Retain handed-off files for 24h; sweep on later launch/resume or explicit clear.
  for (const entry of directory.list())
    if (
      entry instanceof File &&
      /^share-[a-z0-9-]+\.png$/.test(entry.name) &&
      (all || Date.now() - (entry.modificationTime || 0) > 86400000)
    )
      entry.delete();
}
