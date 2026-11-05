# MiniWatt Wrapped

Independent Expo SDK 58 app, now focused on iOS. Android work is deferred at the user's request; existing Android files are preserved. Work stays on `expo-app`; every mobile change is under `app/`. The website, its backend, dependencies and deployment are unchanged.

**Release candidate implementation, not a verified production release.** Live Garmin imports, physical-device performance/accessibility, signed store builds and Garmin distribution authorization remain release gates. Architecture recommendation: keep the native Expo screens and use a Metal-backed native Skia recap renderer after an iPhone benchmark. The implemented renderer remains the bundled Three.js/Canvas reference; no unmeasured native performance gain is claimed. See [ios-architecture.md](docs/ios-architecture.md).

See [TODO.md](TODO.md), [validation.md](docs/validation.md) and [release.md](docs/release.md).

## Run and check

Use Node 24 and npm 11.9.0. From this directory:

```sh
npm ci
npm run check
npm run test:native
npx playwright install chromium
npm run test:viewer
npm start
```

Use `npm run ios` for a local development binary with the native privacy configuration. Expo Go does not apply that configuration and is not a privacy or release validation target. iOS native compilation needs macOS/Xcode. The configured iOS floor is 16.4; physical iPhone validation is outstanding. Existing Android setup is retained but deferred.

The fictional example covers all supported story families without credentials. Enter a personal key only in the native app, for your own authorized Garmin account. Never put credentials or personal records in fixtures, logs, screenshots, source files or issue reports.

```sh
npm run bundle:ios
HERMES_BIN=/path/to/hermes npm run test:hermes:portable
HERMES_BIN=/path/to/hermes npm run test:hermes
```

`hermesc` compilation does not prove that domain code executes correctly; the last command needs a matching Hermes v1 executable built with Intl. The matching Linux Hermes CLI has a placeholder DateTimeFormat.formatToParts implementation: portable normalization/privacy checks run there, while the full recap check correctly fails its runtime preflight. Full timezone/calculation checks must run in the native iOS/Android runtimes. The app refuses a live import before requesting records if required Intl behavior is missing.

For an actual iPhone, `npm run prepare:runtime-probe` creates a separate preview-only test-app context running that shared synthetic suite in native Hermes. It uses no Garmin account, network or saved key. See [the iOS validation record](tests/device/ios-validation.md) for build/install steps. Its device result is still pending; it does not replace testing the normal signed app.

## Data and rendering

The native app uses `expo/fetch` directly against the Garmin Personal API, exchanges the key for a temporary bearer token, and uses the website's normalization, coverage, calculation and story-selection modules unchanged. It does not call the web app or introduce a backend. See [transport.md](docs/transport.md) for the native fetch limitation, endpoint contract and unverified live behavior.

Each import owns its token and cancellation scope, has a five-minute deadline, and always releases session references. Requests have a 15-second deadline including response reading, at most three attempts, bounded backoff, no redirects, no cookies and no disk HTTP cache. Optional-source failure omissions follow the web behavior. Interrupted imports must reconnect.

Only validated display fields reach the bundled DOM viewer. Three.js dots, the Canvas fallback, morphs, licensed fonts, all four colourways and 1080 × 1920 exports use the pinned web algorithms. Export messages are bounded, ordered and tied to one native-authorized share interaction. Each real health card needs separate permission before any share preview is generated. Promotional cards cannot export.

Recaps and raw records stay in memory. Remembered keys use opt-in platform secure storage. Unshared PNG previews are deleted on close; handed-off PNGs are swept after 24 hours on later launch/resume so receiving apps can consume them. Clear data removes keys, recaps and owned PNGs. Exported copies outside the app cannot be recalled. Native “Read card” supports system text scaling; VoiceOver/TalkBack descriptions include chart values.

## Isolation and provenance

`vendor/public/` is the immutable 136-file snapshot from web commit `e3102e526e6804ff9546248d86c9f5db8f0f6412`. `npm run verify:baseline` checks its SHA-256 manifest. Small rendering adapters under `src/viewer/` add GPU teardown; generated styles embed the original licensed fonts and rider asset because Metro does not resolve local CSS asset imports in native DOM exports. `npm run prepare:assets` regenerates those styles and rasterizes the existing website vector brand mark for native icons/splash.

```sh
npm run check:boundary
npm run prepare:context
```

The second command creates an allowlisted standalone context in `.build/eas-context`, with a hash manifest and ignore rules at its actual upload root. Copy it outside this repository, install its own dependencies, and run EAS from there with `EAS_NO_VCS=1`. Never run an upload from the repository root. Signing identities and EAS project ownership are supplied by the owner, not embedded in source. Production config fails closed without those IDs. No OTA publishing or automatic deployment is enabled.

Do not merge or push to `main`: its existing workflow redeploys the website even for app-only pushes. Mobile builds/releases stay on `expo-app` until that separate policy is resolved.
