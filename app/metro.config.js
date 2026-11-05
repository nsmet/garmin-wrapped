const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const config = getDefaultConfig(__dirname);
config.watchFolders = [];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.projectRoot = __dirname;
// Expo's DOM transform contains absolute proxy paths. Never share it between
// this checkout and a standalone EAS context with the same source/package name.
config.cacheVersion =
  "miniwatt-" +
  require("node:crypto").createHash("sha256").update(__dirname).digest("hex");
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, ".build/metro-cache") }),
];
module.exports = config;
