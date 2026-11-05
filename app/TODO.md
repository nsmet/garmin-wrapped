# MiniWatt Wrapped — remaining work

Status: development prototype, **not production ready**. Keep all work inside `app/`; the existing web app and its deployment remain unchanged. The source snapshot is pinned to web commit `e3102e526e6804ff9546248d86c9f5db8f0f6412`. See `migration_plan.md` for detailed acceptance criteria.

The current implementation uses the Garmin Personal API directly from React Native. The earlier plan proposed a separate mobile backend; that decision needs to be revisited based on the user's preference for the personal-key flow and actual device testing. Do not change the website API to make mobile work.

## 1. Prove the core import on devices — release blocker

- [ ] Build development binaries and test on a physical iPhone and Android phone using an authorized personal Garmin key. Verify key exchange, TLS, redirects, bearer requests, cancellation and errors on both platforms.
- [ ] Compare the full resulting recap against the web app for the same account, year and time zone: activity counts, sport classification, story order, values, daily steps/floors, sleep, HRV and warnings. Record any differences without saving personal data in test fixtures.
- [ ] Restore and test a per-request timeout in the app's adapted Garmin client; its original 15-second timeout was removed during the initial port. Preserve cancellation, bounded retries and redirect rejection on both native platforms.
- [ ] Exercise long imports, rate limits, empty/short/repeated pages, invalid/expired keys, incomplete activity data and optional-source failures. Verify abort and cleanup even when an app is interrupted.
- [ ] Verify Hermes compatibility for grouping, `Intl` time zones, abort APIs, `URLSearchParams`, streams and response handling; replace unsupported APIs with tested equivalents. Test changes of time zone and year boundaries.
- [ ] Verify Garmin's current authorization and data-access terms for the intended audience and confirm sufficient current-year activity and wellness history. Production distribution depends on the permitted integration and available data.

## 2. Make the recap viewer match the website

- [ ] Verify Three.js and Canvas fallback on physical devices, including WebGL context loss, background/resume and low-memory recovery. Measure representative dense and low-count stories, transitions, battery and memory.
- [ ] Bundle and load the original licensed fonts and required assets; compare live cards and text layout against the web app on small and large phones.
- [ ] Implement the original story transitions and dot morphing, progress indicator, tap/swipe navigation, story controls, conditional promotional card and reduced-motion behavior. The current viewer provides basic previous/next buttons only.
- [ ] Add resize, orientation and safe-area handling; respect Android Back. Ensure viewer cleanup cancels animation frames and releases canvases and GPU resources.
- [ ] Limit data sent across the native/DOM boundary to the fields needed for presentation. Validate messages and reject stale or malformed requests; do not pass keys, session tokens, raw activity records, evidence identifiers or locations to the viewer.
- [ ] Compare every reachable story family and the fictional sample against reference screenshots and the web app's output. Confirm that optimizations never alter the meaning or count of data dots.

## 3. Sharing, consent and privacy

- [ ] Implement sanitized 1080 × 1920 PNG export with the web renderer and all four existing colourways; validate typography, dot blending and output on both platforms.
- [ ] Add the native share sheet and optional save-to-device flow; handle cancellation, permissions and receiving-app compatibility. Remove temporary files after use and on a later cleanup sweep.
- [ ] Preserve separate, explicit per-card consent before generating a health-card share preview or export. Keep promotional cards unshareable and verify the export allowlist excludes personal identifiers and raw data.
- [ ] Provide privacy and data-coverage screens, warnings, activity breakdown and clear-data/disconnect actions. Clear in-memory records, viewer state and cached exports when the user clears data.
- [ ] Decide whether to offer the web app's optional remembered-key feature. If offered, use platform secure storage with explicit opt-in, forget controls and tests; never store keys in WebView storage or logs.
- [ ] Define and test app backgrounding, import cancellation, process termination and resume behavior. Prevent stale asynchronous results from restoring a cleared recap.
- [ ] Write accurate mobile privacy copy and complete the platform data-safety and health-data disclosures for the actual implementation.

## 4. Accessibility and product polish

- [ ] Add screen-reader descriptions for canvas stories, accessible navigation and focus handling; test VoiceOver and TalkBack without duplicate announcements.
- [ ] Test large text, contrast, touch targets, keyboard handling, reduced motion and system settings changes.
- [ ] Replace starter icons and splash screen with approved MiniWatt Wrapped assets; finalize onboarding, personal-key help, error and retry states.
- [ ] Choose minimum supported iOS/Android versions and device matrix. Document supported behavior when offline or when the app is killed.

## 5. Tests and release engineering

- [ ] Add integration tests for the native Personal API adapter with realistic synthetic Garmin responses, retries, timeouts, cancellation, malformed data and optional-source errors. Expand parity coverage beyond the current mocked happy path and copied pipeline tests.
- [ ] Add tests for viewer contracts, navigation, lifecycle, export sanitization and consent; run relevant domain cases in Hermes as well as Node.
- [ ] Create reproducible development, preview and production EAS build configurations; set approved bundle identifiers, signing and store ownership. Produce and test signed release candidates on real devices.
- [ ] Build from an app-only context and inspect the EAS upload archive for secrets, personal data and unrelated repository files. Add app-owned verification commands and CI without changing root workflows.
- [ ] Prepare TestFlight and Play internal testing, store metadata, screenshots, privacy details, permitted reviewer access and a rollback/support procedure. Address all release-blocking issues before submission.
- [ ] Resolve the existing deployment trigger before merging into `main`: every push to `main` currently redeploys the web app, including app-only changes. Keep mobile work on `expo-app` while preserving the agreed web freeze.

## Already established

- [x] Independent Expo scaffold under `app/`; web source copied into the app with a SHA-256 manifest.
- [x] Initial native key-entry/health-consent screen and direct Personal API adapter using the web app's normalizers and recap calculation.
- [x] Initial DOM viewer with copied dot engine, Three.js renderer, Canvas fallback and fictional sample.
- [x] TypeScript check, mocked Personal API happy-path test, copied pipeline test and Expo JavaScript bundle exports passed. These checks do not establish live Garmin connectivity, device performance or production readiness.

All scaffold and implementation files, including this todo, are currently uncommitted on `expo-app`.
