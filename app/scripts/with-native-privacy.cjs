const {
  withAppDelegate,
  withMainApplication,
  withAndroidManifest,
} = require("expo/config-plugins");
const swift = `
    // miniwatt-network-privacy: no durable Garmin HTTP responses or cookies.
    ExpoFetchCustomExtension.setCustomURLSessionConfigurationProvider {
      let configuration = URLSessionConfiguration.ephemeral
      configuration.urlCache = nil
      configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
      configuration.httpCookieStorage = nil
      configuration.httpShouldSetCookies = false
      configuration.httpCookieAcceptPolicy = .never
      return configuration
    }
    URLCache.shared.removeAllCachedResponses()
`;
const kotlin = `
    // miniwatt-network-privacy: Expo Fetch inherits this factory without disk caching.
    com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory {
      com.facebook.react.modules.network.OkHttpClientProvider.createClientBuilder().cache(null).build()
    }
    java.io.File(cacheDir, "http-cache").deleteRecursively()
`;
module.exports = function withNativePrivacy(config) {
  config = withAppDelegate(config, (result) => {
    const mod = result.modResults;
    if (mod.language !== "swift")
      throw Error(
        "MiniWatt network privacy requires the supported Swift AppDelegate.",
      );
    if (!mod.contents.includes("miniwatt-network-privacy")) {
      const marker = /\)\s*-> Bool \{/;
      if (!marker.test(mod.contents))
        throw Error(
          "AppDelegate template changed: review network privacy setup.",
        );
      mod.contents = mod.contents.replace(marker, (match) => match + swift);
    }
    return result;
  });
  config = withMainApplication(config, (result) => {
    const mod = result.modResults;
    if (mod.language !== "kt")
      throw Error(
        "MiniWatt network privacy requires the supported Kotlin MainApplication.",
      );
    if (!mod.contents.includes("miniwatt-network-privacy")) {
      const marker = "super.onCreate()";
      if (!mod.contents.includes(marker))
        throw Error(
          "MainApplication template changed: review network privacy setup.",
        );
      mod.contents = mod.contents.replace(marker, marker + kotlin);
    }
    return result;
  });
  return withAndroidManifest(config, (result) => {
    const application = result.modResults.manifest.application?.[0];
    if (application) {
      application.$["android:allowBackup"] = "false";
      application.$["android:usesCleartextTraffic"] =
        result.extra?.variant === "development" ? "true" : "false";
    }
    return result;
  });
};
