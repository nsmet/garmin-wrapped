# iOS candidate validation record

Template only: **nothing below has passed on a physical iPhone yet**. Use a private release record. Never include an API key, token, account name, activity identifier, health values, raw response or personal screenshot. Use only synthetic data for share/image evidence. Record live website comparisons as matched/not matched with a redacted description, not a record dump.

## Candidate identity

- Source commit and uncommitted diff hash:
- App-only `build-inputs.json` SHA-256:
- EAS build ID or Xcode archive identifier:
- Bundle identifier / version / build number:
- Build profile (preview/TestFlight), Hermes and Expo/RN versions:
- Device model / iOS version / test date:
- Tester / authorization to use the personal Garmin account (no identity details):
- Garmin distribution/Personal API terms review status:

Run on an older supported iPhone and a current model. Repeat changed gates whenever source/native dependencies, signing settings or the renderer change. A browser test, simulator, Expo Go or mock does not close a physical-device gate.

## Native Hermes probe

Before live account testing, build the separate synthetic runtime probe from the same source/dependencies. It executes the shared `tests/hermes/domain-checks.mjs` suite in the actual iOS Hermes runtime, including European spring DST and the US repeated autumn hour. It never imports the product entry, connects to Garmin or reads saved keys.

```sh
# From app/: creates a separate allowlisted context and input hash manifest.
npm run prepare:runtime-probe
# Copy .build/runtime-probe outside the repository, then in that copy:
npm ci
EAS_NO_VCS=1 npx eas-cli@27.4.1 build:inspect --platform ios --stage archive --profile preview --output .build/archive --force
EAS_NO_VCS=1 npx eas-cli@27.4.1 build --platform ios --profile preview
# Alternatively, on a Mac with Xcode and owner-managed device signing:
APP_VARIANT=preview npx expo run:ios --device --configuration Release
```

The context selects `tests/device/runtime-app.tsx` as its entry and removes the production EAS profile. The normal app's entry/config remain unchanged. Keep this probe separate from the App Store candidate. Record its manifest/build identity and the on-device PASS/FAIL screen (synthetic text only). A successful JS export is not a successful probe execution. Then install the normal preview/TestFlight app and complete every remaining gate below; the probe does not validate native networking, graphics, files, accessibility or sharing.

- Physical iPhone native Hermes probe result: Pending.
- Probe build/input identity and synthetic result evidence: Pending.

## Offline fictional flow

Install the signed candidate, disconnect from the development server, enable airplane mode and launch it. Run the fictional example manually and, where available, with Maestro:

```sh
APP_ID=your.owner.approved.bundle.identifier maestro test tests/device/fictional-flow.yaml
```

| Gate | Result / redacted evidence |
| --- | --- |
| Cold launch offline; original icon/splash/fonts/rider load | Pending |
| All story families, all 89 shareable fixture cards; promotion cannot share | Pending |
| Tap/swipe/chapters, first/last bounds, rotation, safe areas | Pending |
| Pause, dynamic system reduced motion; background stops animation | Pending |
| VoiceOver focus/descriptions; very large Read card text; keyboard dismissal | Pending |
| App-switcher privacy; lock/call/interruption/resume | Pending |
| Canvas fallback and WebView process recovery (development fault injection) | Pending |
| Four colourways; 1080 × 1920 PNGs; no EXIF/text/location chunks | Pending |
| Share sheet cancellation, Save to Files and real receiving apps | Pending |
| 20 prepare/share/cancel cycles; close/clear during an export | Pending |
| Unshared file removed; handed-off file usable; later 24-hour sweep; Clear data | Pending |
| Process termination/cold launch drops recap; no dev server required | Pending |

## Live Garmin and website comparison

Enter the personal key only into the native app. Use the same authorized account/year/time zone in the unchanged website. Keep network logging off; do not disable TLS or forward real credentials through a diagnostic service. Local runtime preflight must pass before any record request.

| Gate | Result / redacted evidence |
| --- | --- |
| Real native key exchange and bearer requests; TLS and streamed body reads | Pending |
| Activity pagination reaches terminal page; coverage and exclusions match web | Pending |
| Sport types, ordered stories, captions, precision and displayed values match web | Pending |
| Steps/floors, sleep, activity/resting HR, HRV and omission warnings match web | Pending |
| Current-year, local year/DST boundaries and required native Intl behavior | Pending |
| Optional-source switches and missing/denied sources behave correctly | Pending |
| Invalid/revoked key and permissions; bounded retries, timeout and useful errors | Pending |
| Cancel during exchange/body/page/backoff; background cancel; no late restore | Pending |
| Remember opt-in, forget, clear, reboot/reinstall Keychain behavior | Pending |
| Real health cards: deny/allow separately; no preview/file before permission | Pending |
| Clear removes recap/key/owned files; Garmin key revocation remains external | Pending |

Use synthetic credentials and a controlled development endpoint for redirect, timeout and fault injection. Re-test real Garmin against its unmodified HTTPS endpoints afterward. Never commit a modified endpoint, relaxed TLS setting or live record fixture.

## Performance and renderer decision

Use the same synthetic presentation input in release-like builds. Record frame-time median/p95/p99 and longest stall, interaction latency, peak/retained memory, export latency and battery/thermal observations over at least 15 minutes. Cover sparse/dense scenes, repeated morphs, background/recreation and consecutive exports. The current viewer targets roughly 30 fps ambient motion; the proposed export budget is three seconds after fonts load. These are targets, not measured results.

- Current Three.js/Canvas candidate measurements: Pending.
- Native Skia/Metal candidate implementation/build: Pending.
- Matched native/reference visual and data-dot semantics: Pending.
- Same-device comparison and shipping-renderer decision: Pending.

## Release decision

Record remaining failures explicitly. Attach only fictional screenshots and redacted technical measurements. Confirm hosted mobile policy/support URLs, Apple privacy answers, approved store identity, reviewer access, actual EAS archive inspection and TestFlight results for this binary. Do not mark production ready while required device, live integration, authorization or signing gates remain pending. Android is deferred.
