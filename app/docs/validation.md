# Validation record — 5 November 2026

Active scope: **iOS**. The user deferred Android and asked for a native-graphics recommendation. Work started from a clean `expo-app` at `8bb1152cb22a0f8ab12feec09286bbc5a8d04657`. The website reference is `e3102e526e6804ff9546248d86c9f5db8f0f6412`. No repository file outside `app/` was changed. Publication is limited to the `expo-app` branch; no website deployment or secret change is part of this work.

The user confirmed a physical iPhone, Mac/Xcode and Expo/Apple build access on 5 November 2026 and will run the packaged build commands on the Mac. Those resources are not connected to this Linux workspace. Signed native and device/live checks remain pending; `mac-handoff.md` provides the concrete next steps.

Status: engineering candidate with explicit external release gates. **Not production-ready and not a verified native Skia implementation.** The implemented viewer is bundled Three.js/Canvas in a native Expo app. The preferred iOS graphics direction is native Metal-backed Skia; see `ios-architecture.md`. Existing implementation and Android files are preserved.

## Passed checks

| Check | Evidence / practical limit |
| --- | --- |
| Domain, formatting, source coverage, transport and bridge | 70 Node tests pass. Includes copied website assertions, endpoint/normalization behavior, failed optional sources, short/repeated pages, auth/rate limits, hung fetch/body reads, timeout/cancel during backoff, session isolation, cancellation of stalled accepted-key storage, source sanitization, revoked/stale exports and runtime preflight. Synthetic fixtures only; no live Garmin connection. |
| Native application state | 7 React Native tests pass using Jest Expo: cancel/late completion, timeout during stalled secure-storage deletion, native date preflight before year calculation, background interruption, clear-data, presentation boundary/health consent, and Back dismissing chapter dialogs. OS/network/file I/O is mocked; these do not establish device behavior. |
| Viewer / exported iOS DOM surface | 9 browser tests pass, covering bundled licensed fonts, navigation/chapters/descriptions, reduced motion, 1080 × 1920 PNGs, four colourways, all 89 shareable fixture stories, pixel parity with the pinned web renderer, Canvas fallback, WebGL loss, inactive rendering, teardown, small/large/landscape controls, live background compositing and settled-text repaint avoidance. The iOS export boots with WebGL and no remote asset requests in a controlled browser harness. The latest refreshed standalone iOS DOM export boot check also passes. This is not WKWebView-on-iPhone evidence. |
| Immutable baseline | All 136 vendor files match the pinned SHA-256 manifest. Drawing adapters add static Three.js bundling and explicit GPU disposal without modifying the immutable baseline. |
| iOS release-like bundles | Hermes bytecode and self-contained DOM/graphics/font assets export successfully. This proves bundling, not Xcode compilation/signing or Metal/WKWebView device behavior. |
| App-only build boundary | The allowlisted context was copied to `/workspace/work/app-only`, outside the repository, and installed with its own `npm ci`. Its TypeScript/baseline checks and iOS bundle succeed with neither website sibling in the context. A root-specific app-owned Metro cache prevents stale absolute DOM proxy paths leaking between checkouts. The context has 208 reviewed files and an input hash manifest. This is separate from EAS's real upload-archive inspection. |
| Native project generation | iOS preview prebuild succeeds; generated Swift config installs ephemeral Expo networking, disables URLCache/cookies, and preserves normal TLS trust. The 1024 × 1024 iOS icon is verified opaque; all 11 licensed fonts are embedded. Native icons/splash are generated from the existing product vector mark; no starter icon is shipped by the app config. No native iOS compilation was possible here. The separate credential-free runtime probe also exports to iOS Hermes bytecode; its 17 shared synthetic checks pass in Node, with actual iPhone execution pending. |
| Hermes portable checks | 25 normalization/grouping/privacy/PNG-decoder checks pass in Hermes v1 built from `hermes-v260318099.0.5`, commit `9a115f15785851f4ff2747ebb090ddd066fc8ad2`, using ICU 76. |
| Scope and whitespace | App-only boundary check and `git diff --check` pass. No website dependency, backend, workflow, deployment or secret was altered. |

Important packaging bugs found and fixed during validation: unresolved local font/rider CSS URLs in native exports; stale absolute DOM proxy paths across checkout caches; asynchronous Three.js chunk loading from file-backed surfaces; missing live dot-layer blend mode hiding the background; unnecessary layout and settled-text/background redraws. Browser still-image equality alone would not have exposed all of these.

## Unverified / externally blocked

- **Mac/Xcode and physical iPhone:** unavailable in this Linux environment. No signed native iOS binary, real WKWebView test, Metal/Skia experiment, VoiceOver test, secure-storage/export/share-sheet receiving-app test, low-memory recovery, battery, thermal or native frame-time measurement is claimed. Full native renderer work must pass that build/device gate before replacing the reference.
- **Authorized Garmin account/key:** none configured or supplied. No real key exchange, bearer request, live import/history/permission test or same-account website parity comparison was performed. Never send or commit personal keys, tokens, records or private screenshots.
- **Expo/Apple ownership/signing:** no Expo login/project ownership or Apple signing account configured. EAS CLI 27.4.1 `build:inspect --stage archive` stops at “An Expo user account is required to proceed.” The generated standalone context is not an inspected EAS upload. Production config requires owner-approved `IOS_BUNDLE_IDENTIFIER` and `EXPO_PROJECT_ID`.
- **Native Intl / full Hermes pipeline:** the matching Linux Hermes CLI's ICU implementation returns placeholder date parts and uses a dummy number-format path. The full recap test correctly fails the runtime guard. Apple/Android have separate native Intl implementations; portable test success is not a full native recap/time-zone pass. Run the full suite in native iOS Hermes, including local year/DST boundaries, before release. Unsupported formatting now prevents a real import before any Garmin request. A separate preview-only iOS runtime probe now packages the shared synthetic domain suite, including DST/year boundaries, without account/network/storage access; its native execution remains pending. See `tests/device/ios-validation.md`.
- **Online Expo Doctor checks:** 18/20 checks pass. The online config schema check cannot reach `exp.host` (`EAI_AGAIN`); React Native Directory metadata also fails to fetch. Local types, bundles and pinned compatibility checks do not replace these online checks.
- **Garmin distribution/history authorization:** current public program documentation was reviewed. Account-bound terms/authorization and sufficient personal history for the intended audience remain unverified; confirm them with the owner/Garmin before public distribution.
- **Publisher actions:** mobile policy hosting, final privacy/data-safety answers, approved store identity/assets, actual iPhone screenshots, reviewer access, TestFlight and App Store submission remain owner/device gates. Do not change the frozen website to host mobile material.

Android work was stopped per the user's instruction. Historical Android bundle/prebuild checks succeeded; a native build hit a Google Maven HTTP 503 for an AndroidX lifecycle POM. This is not an active iOS blocker, and no Android readiness claim is made.

## Reproduce

From `app/` with Node 24/npm 11.9.0:

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:viewer
npm run bundle:ios
npm run prepare:context
HERMES_BIN=/path/to/matching/hermes npm run test:hermes:portable
# Requires a runtime with complete native Intl, not the Linux placeholder:
HERMES_BIN=/path/to/matching/hermes npm run test:hermes
```

The browser run here used Playwright 1.64.1 and a locally extracted Chromium with software WebGL (`CHROMIUM_PATH=/tmp/chromium`, SwiftShader); no iOS GPU result is implied. Logs, build output and fictional screenshots are under ignored `.build/validation`; no personal artifacts are stored there. Run `tests/device/fictional-flow.yaml` against a designated preview iPhone when available, then complete the real-account/OS checks in `release.md`. Use only a permitted fictional/reviewer flow for store screenshots.
