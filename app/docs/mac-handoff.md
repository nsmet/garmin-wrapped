# iPhone build handoff

The app is an engineering candidate, not an approved production release. The current renderer is the verified bundled Three.js/Canvas viewer. Expo plus a native Skia/Metal renderer is the preferred next graphics direction; that native renderer has not been implemented or benchmarked. Android is deferred.

The user has confirmed both Mac/Xcode and Expo/Apple build access. This Linux workspace has no connection to either yet. The app-only handoff archive allows building on the Mac without copying or changing the website. It contains `source/` (normal candidate), `runtime-probe/` (separate synthetic test app), documentation and exact input manifests. No dependencies, signing credentials, account data or native binaries are included.

## On the Mac

Use Node 24/npm 11.9.0, current supported Xcode and its command-line tools, and owner-managed Apple device signing. Connect/unlock the physical iPhone, trust the Mac and enable Developer Mode when iOS requests it. Select your signing team and approved bundle identifier if Xcode asks. Keep credentials in Apple's/Expo's supported login stores; do not paste them into chat or files in this source package.

Start with the synthetic native runtime probe:

```sh
cd runtime-probe
npm ci
APP_VARIANT=preview npx expo run:ios --device --configuration Release
```

The screen must show `PASS: 17 synthetic domain checks` and `Hermes enabled`. Record only that synthetic result, the iPhone/iOS versions and the probe input/build identity. It checks native Intl, DST/year boundaries, normalization, precision, coverage and privacy. It does not connect to Garmin or read secure storage. Its EAS production profile is removed. Do not submit this test app to the store.

Then build the normal candidate:

```sh
cd ../source
npm ci
npm run verify:baseline
npm run verify:assets
npm run typecheck
npm test
npm run test:native
APP_VARIANT=preview npx expo run:ios --device --configuration Release
```

The archive has no `.git` directory, so `check:boundary` is a repository-only check and is not run in the extracted package. Its source manifests replace no device checks. Build in these separate directories so the test-app entry cannot leak into the normal candidate. Reusing the same preview bundle identifier installs the normal app over the probe; validate the normal app separately. If native compilation fails, provide a redacted error and Xcode/macOS versions, with no tokens or records.

For EAS instead, log in and configure owner-controlled project/device signing from the selected context. Follow `release.md` to inspect the actual upload archive and build `--platform ios --profile preview` with EAS CLI 27.4.1. A production profile additionally requires owner-approved `IOS_BUNDLE_IDENTIFIER` and `EXPO_PROJECT_ID`, and every release gate must pass first. Do not run a build/upload from the original repository root.

## Validate on the iPhone

1. Disconnect from the development server. In airplane mode, explore the fictional example, navigate/read cards, export all colourways and use Save to Files/receiving apps. Complete the offline section of `ios-validation.md`.
2. With networking enabled, enter your own authorized Garmin Personal API key only into the native app. Compare the recap with the unchanged website for the same account/year/time zone. Record matched/not matched and redacted discrepancies, never real values, account identifiers, keys, records or screenshots.
3. Complete cancellation, interruption, secure storage, per-card health consent, clearing, accessibility, recovery and 15-minute performance gates in that record. Test an older supported iPhone and a current model before claiming the supported device range.

Return the synthetic probe result and redacted technical failures. Actual account results remain on your device. A successful import alone does not close the remaining privacy/sharing/graphics/accessibility gates. The website deployment/workflow and `main` branch must remain untouched.
