# Mobile release runbook

Active release scope is iOS; Android is deferred per the latest user instruction. Existing Android instructions below are historical references, not iOS release gates. No distribution is authorized by this document. Keep work and releases on `expo-app`. Do not push or merge `main`: its unchanged website workflow runs on every main push, including app-only changes.

For the user-confirmed Mac/Xcode and iPhone access, start with `mac-handoff.md`; the build access is not connected to the Linux workspace. The app-only archive has separate normal/probe contexts and instructions for local Release builds.

## Owner inputs

Provide owner-controlled `EXPO_PROJECT_ID`, `IOS_BUNDLE_IDENTIFIER` through the build environment. Production configuration rejects missing IDs. The default `.dev` and `.preview` IDs are local test identities, not store ownership decisions. Use Expo/Apple credentials only in their supported login/signing stores; never put a Garmin key in a build environment, EAS secret, source file or test fixture.

Before public beta, confirm Garmin's applicable terms and permitted audience/history. Personal-key support for the developer's own data is not proof of authorization to distribute an integration. The direct API design is deliberate; changing it to a Business API or separate backend would be a new integration decision inside `app/`, never a website change.

## Validate and package

```sh
npm ci
npm run check
npm run test:viewer
npm run bundle:ios
HERMES_BIN=/path/to/matching/hermes npm run test:hermes
npm run prepare:context
```

For CI, use these same app-owned commands with the working directory set to `app/`. No root workflow is required or changed. A browser/desktop test result is not a device gate.

Copy `.build/eas-context` to a clean external directory. It includes only the explicit allowlist in `scripts/prepare-context.mjs`, immutable baseline files and its own dependencies/lockfile/config; `.env*`, credentials, native build directories, sibling source and deployment archives are excluded. Its generated `build-inputs.json` records exact SHA-256 inputs. Install with `npm ci` in that context and build there. Keep its ignore file at that actual upload root.

```sh
# Run in the standalone context after owner login/project setup.
EAS_NO_VCS=1 npx eas-cli@27.4.1 build:inspect --platform ios --stage archive --profile preview --output .build/archive --force
# Inspect every uploaded path before starting a remote build.
EAS_NO_VCS=1 npx eas-cli@27.4.1 build --platform ios --profile preview
# Only after physical-device, account and review gates pass:
EAS_NO_VCS=1 npx eas-cli@27.4.1 build --platform ios --profile production
```

The actual EAS archive inspection needs an Expo account even at archive stage. In this environment it stopped at login; the generated allowlist context is not mislabeled as an inspected EAS upload. Owner-approved IDs and EAS credentials remain external prerequisites. Do not use `eas update`; OTA updates are disabled for release one so native and DOM assets cannot drift.

Preview is an internal release-like build; development uses `expo-dev-client`. Expo Go does not apply the app's ephemeral networking and no-cache configuration. For internal iPhone installation, register the designated device through EAS before building, or use owner-managed signing on a Mac. Validate a signed TestFlight candidate without a development server and offline after importing. JavaScript export and native project generation alone do not produce an installable iPhone app.

## Device gates

Use at least an older supported physical iPhone and a current iPhone. Configured floor: iOS 16.4; final support claims depend on those devices and the actual Expo/RN floor. Record model, iOS version, build SHA, configuration and result, never private records or credentials. Copy `tests/device/ios-validation.md` into a private release record and complete it for the exact signed binary. Android validation is deferred.

First run the separate `npm run prepare:runtime-probe` preview on iOS to execute the synthetic domain/Intl/DST suite in native Hermes; build/install instructions are in that validation record. Its production EAS profile is deliberately removed, and it does not replace the normal app's device/live-account checks.

1. Import with an authorized personal account. Compare the web app for the same account/year/time zone: activity count, exclusions, sport types, story order/values, steps/floors, sleep, resting/activity HR, HRV and warnings. Run a key/token/redirect/TLS/permission/timeout/rate-limit check without logging headers/bodies. Use controlled endpoints and synthetic credentials for redirect fault injection. Never alter certificate trust or send the real key to a test endpoint.
2. Test cancelling during exchange, response reads, pagination and retry waits; background during import; return after lock, calls and system sheets; kill/cold start. No stale result may restore a cleared recap. Confirm secure opt-in key persistence/forget after reboot and reinstall according to OS behavior. Recaps do not survive process death.
3. Navigate every family, small/large/landscape, swipes, chapter dialog, system reduced motion and manual pause. Force WebGL loss and WebView process recreation in a development build; repeat ordinary interruption/recovery on the release-like candidate. The native retry control must recover; no permanent blank screen. Validate the native “Read card” path with very large system text.
4. Deny and grant each real health card's share consent. Verify no share preview/PNG before consent, all four colourways, exact 1080 × 1920 dimensions, no EXIF/text/location metadata, cancellation and actual receiving apps/Save to Files. Close/reopen and clear during transfer. Test 20 share/cancel cycles and a later cache sweep. Receiving apps can consume files asynchronously; validate the 24-hour retention policy on target apps.
5. VoiceOver: logical focus, readable chart details, no duplicate story announcements, meaningful disabled states and 44-point targets. Check contrast, keyboard dismissal, screen rotation and safe-area insets. iOS uses an app-switcher blur; verify it on real OS versions. Do not claim universal screenshot prevention.
6. Measure a 15-minute dense/low-count recap: representative ~30 fps ambient target, transition stalls, battery/thermal behavior, memory after background/recreate, and consecutive exports. Proposed export budget is three seconds after fonts are ready. Record measured results; desktop timing does not establish phone budgets.

## Store material and reviewer access

Suggested name: MiniWatt Wrapped. Description: “See your recorded Garmin year through dot stories. Build a private recap using your own Personal API key, explore your sports, and share individual cards. Health sharing asks separately. No recurring sync or cloud recap archive.” Keep the independent/not-endorsed Garmin notice.

Use the bundled fictional example for reviewers to exercise the complete renderer and share flow without someone else's account or a hardcoded key. Tell reviewers that the full live integration requires their own eligible, authorized Personal API access. If that is insufficient for review, arrange a permitted review method with Garmin and the stores; do not commit an account or bypass authorization.

Capture screenshots only from fictional mode after device verification, at actual required store sizes. Review the supplied icon/splash against the existing product brand. Finalize privacy/support URLs hosted independently of the frozen website, using the mobile policy draft in `docs/privacy-policy.md` and inventory in `docs/privacy-disclosures.md`; do not claim the existing browser-cookie policy is the native policy. Submit current Apple privacy answers and any required health declaration against the built binary and current platform definitions. Owner console submission and policy review remain pending.

## Support and rollback

Support/privacy contact follows the existing product: info@miniwatt.app, Nick Smet, Kalmthout, Belgium. Ask for OS/model/build number and a redacted error code, never keys, tokens, activity records or private screenshots. Revoke compromised keys on Garmin's official Personal API page. Clear data deletes this app's retained material but cannot recall externally shared copies.

Retain reviewed source/lockfile and signed build provenance for each release. Stop staged rollout or withdraw the candidate on an import, privacy or sharing regression. Supply a fixed binary with a higher build number; app-store adoption/rollback is not instantaneous. There is no mobile backend or OTA release to roll back, and the website deployment remains untouched.
