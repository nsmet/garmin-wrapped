import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT || "development";
  const production = variant === "production";
  const iosId = process.env.IOS_BUNDLE_IDENTIFIER,
    androidId = process.env.ANDROID_APPLICATION_ID;
  if (production && (!iosId || !process.env.EXPO_PROJECT_ID))
    throw Error(
      "Production requires owner-approved IOS_BUNDLE_IDENTIFIER and EXPO_PROJECT_ID.",
    );
  return {
    ...config,
    name: `MiniWatt Wrapped${production ? "" : variant === "preview" ? " Preview" : " Dev"}`,
    slug: "miniwatt-wrapped",
    version: "1.0.0",
    platforms: ["ios"],
    orientation: "default",
    userInterfaceStyle: "dark",
    updates: { enabled: false },
    ios: {
      ...config.ios,
      bundleIdentifier:
        iosId ||
        `app.miniwatt.wrapped.${variant === "preview" ? "preview" : "dev"}`,
      buildNumber: "1",
      supportsTablet: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: [],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          ...(variant === "development"
            ? { NSAllowsLocalNetworking: true }
            : {}),
        },
      },
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [],
      },
    },
    android: {
      ...config.android,
      package:
        androidId ||
        `app.miniwatt.wrapped.${variant === "preview" ? "preview" : "dev"}`,
      versionCode: 1,
      permissions: [],
      blockedPermissions: [
        "android.permission.VIBRATE",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#0B1222",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
    },
    plugins: [
      "./scripts/with-native-privacy.cjs",
      [
        "expo-build-properties",
        { ios: { deploymentTarget: "16.4" }, android: { minSdkVersion: 26 } },
      ],
      ["expo-secure-store", { configureAndroidBackup: true }],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0B1222",
          image: "./assets/splash-icon.png",
          imageWidth: 180,
        },
      ],
      [
        "expo-sharing",
        { ios: { enabled: false }, android: { enabled: false } },
      ],
    ],
    extra: {
      eas: process.env.EXPO_PROJECT_ID
        ? { projectId: process.env.EXPO_PROJECT_ID }
        : undefined,
      variant,
    },
  };
};
