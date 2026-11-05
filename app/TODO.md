# MiniWatt Wrapped — implementation and release gates

Updated 5 November 2026. The prototype at `8bb1152` is preserved and completed with app-owned implementation, configuration and tests. **Not a verified production release.** All repository changes remain inside `app/`; the website and its workflow are unchanged. Domain/rendering baseline: `e3102e526e6804ff9546248d86c9f5db8f0f6412` (136 immutable files, SHA-256 verified).

The original migration plan remains a design record. The implemented connection uses Garmin Personal API directly through Expo Fetch, matching the user's personal-key flow. There is no separate mobile backend and no website API change. Details: `docs/transport.md`, `docs/validation.md`, `docs/release.md`.

## Current scope

- [x] Focus release work on iOS per the latest user instruction; preserve and defer Android work. Android-only checks below are historical/deferred, not iOS blockers. Production config no longer requires an Android identifier.
- [x] Evaluate native iOS options: prefer native Expo screens plus a Metal-backed Skia recap renderer for the balance of graphics performance and calculation parity; record the decision in `docs/ios-architecture.md`. The current Three.js viewer stays the validated reference.
- [ ] Native-renderer implementation/benchmark on macOS and a physical iPhone, before replacing the reference renderer. The user has confirmed iPhone/build access, but no Apple graphics toolchain or phone is connected to this workspace yet.

## Import and data correctness

- [x] Restore a 15-second deadline covering both request and response-body reading; bounded three-attempt retries and Retry-After waits; immediate cancellation during requests, reads, backoff and secure-storage waits.
- [x] Use `expo/fetch` with manual redirects and omitted cookies. Inspect both native implementations; add ephemeral iOS networking/no URLCache and Android no-disk-cache configuration. Global React Native fetch is not the release transport.
- [x] Isolate tokens per import; local session expiry, key clearing, unconditional cleanup and stale-generation rejection. An older import cannot disconnect or replace a newer one.
- [x] Keep the website's endpoint parameters, pagination through an empty terminal page, 20,000-record limit, normalizers, source completeness, duplicate/parent rules, recap calculations, precision, story selection/order and privacy allowlists.
- [x] Match movement-only wellness health-field stripping and optional-source omission; test empty/short/repeated pages, invalid/auth/permission failures, malformed/oversized data, cancellation, hung responses, timeouts and retries using synthetic responses.
- [x] Preserve Hermes grouping shims and add a preflight that refuses an import before requesting records when required Intl behavior is missing. Run portable normalization/privacy cases in the matching Hermes v1 runtime.
- [ ] Run the shared recap/Intl suite in native iOS Hermes. The matching Linux CLI uses placeholder Intl implementations and fails the new guard; it is not a substitute for the OS implementations. Android runtime checks are deferred.
- [x] Prepare a separate preview-only native iOS runtime probe using the shared synthetic domain suite, including year/DST boundaries. Its independent context/manifest removes the production EAS profile; it needs no account/key. Native execution remains the device gate above.
- [ ] Physical iPhone: authorized live key exchange, TLS, redirects, bearer requests, streamed cancellation, errors, long imports, time-zone/year boundaries and interruption. No account/key or phones were available.
- [ ] Compare a full real recap with the website for the same account/year/time zone: counts/exclusions, sport types, ordered stories, values, steps/floors, sleep, heart rate, HRV and warnings. Record only redacted differences.
- [ ] Confirm applicable Garmin authorization/terms and historical coverage for the intended distribution. Current public Personal/Business overview was checked; account-bound authorization was unavailable.

## Recap viewer

- [x] Full admitted recap and website fictional fixture, conditional cycling promotion, progress, previous/next, tap/swipe, keyboard and chapter selection.
- [x] Reuse dot generation, data-dot meanings, 900 ms morphs, introductions, ambient loops and typography; support manual pause and dynamic reduced motion.
- [x] Load original licensed fonts and required rider asset offline. Native DOM export inspection exposed unresolved local CSS URLs; assets are now embedded in app-owned stylesheets and reproducibly generated.
- [x] Three.js live/still rendering, Canvas fallback, WebGL-loss recovery, ResizeObserver/orientation handling and explicit animation/GPU disposal. Pause for native modals/background; re-create a terminated WebView at the selected story.
- [x] Safe areas and Android Back handling, including dismissing a DOM chapter dialog before leaving the recap. Native retry control for an interrupted viewer.
- [x] Versioned, bounded, validated display-only native/DOM contracts. No key, token, raw record, evidence ID or location reaches the viewer. Reject stale callbacks and export chunks; block remote WebView navigation and release debugging.
- [x] Browser checks for reachable stories, deterministic web-renderer parity, four colourways, narrow/large/landscape controls, fonts, context loss, inactive animation and teardown.
- [ ] Real-device offline asset loading, every family/sample, native WebView recreation, low-memory recovery, dense/low-count transitions, battery, frame times and 15-minute memory behavior. No physical-device measurements are claimed.

## Sharing, consent and privacy

- [x] Display-only 1080 × 1920 Canvas PNGs using web rendering, all four colourways, bounded ordered transfer, dimension/metadata checks and native cache files.
- [x] Native share sheet and save via available receiving apps/Files; no media-library permission or separate photo-library integration. Handle unavailable sharing/cancellation and prevent duplicate sheet launches.
- [x] Native authority requires separate consent for each real health-card share interaction before preview/export. Revoke on close, change, clear and app departure; promotional cards cannot share.
- [x] Delete unshared previews; retain handed-off files for receiving-app compatibility and sweep on first launch/resume after 24 hours. Clear data deletes owned exports immediately. Reject late writes/results after clear.
- [x] Native privacy, warnings, coverage, source sport/count breakdown with paged activity details, forget and clear-data controls.
- [x] Optional remembered key uses explicit opt-in SecureStore, accepted-key-only saving, serialized storage operations and forget controls. Never use WebView storage or logs for secrets.
- [x] Cancel imports on interruption, pause viewing, retain recap in RAM only, discard on process death and protect iOS app-switcher previews where supported.
- [x] Mobile privacy copy and disclosure inventory/support/rollback runbooks accurately describe direct native traffic, memory, secure storage and temporary files.
- [ ] On physical iPhones, verify real health consent, file writing/deletion, share cancellation, receiving-app consumption, Files destinations, 20 export cycles, later cleanup, secure storage/reinstall and app-switcher privacy. Automated native tests mock OS I/O.
- [ ] Owner-hosted mobile privacy/support URL, final Apple privacy/health declarations, and submission. The frozen website policy/deployment was not changed.

## Accessibility and polish

- [x] Readable story/chart descriptions, accessible controls/states, logical chapter dialog, native Read card for system text scaling, keyboard handling and reduced motion.
- [x] Native 44+ point controls, safe-area layout, contrast-conscious copy/errors and screen-reader labels without a second native announcement of the canvas story.
- [x] Replace starter icons/splash with the existing product's vector brand mark, reproducibly rasterized with an opaque 1024 × 1024 iOS icon; preserve font/asset provenance and licenses.
- [x] Personal-key help/revoke links, explicit access/health switches, clear errors, cancellation/retry, empty recap and fictional reviewer mode.
- [x] Configure iOS 16.4 and Android API 26 floors; document offline/process-death behavior and a target device matrix.
- [ ] Physical VoiceOver, focus after sheets, large text, contrast, touch targets, orientation, safe areas and supported iOS/device matrix. Final support claims and asset/store approval require owner/device review.

## Release engineering

- [x] App-local locked dependencies, TypeScript, meaningful domain/transport/bridge/native-state/browser tests, baseline and path-boundary checks. Add a fictional Maestro smoke flow and a precise iOS device/live-account validation record template; no real-data fixture or stored credential.
- [x] Development, internal preview and production EAS profiles; development client; owner-supplied production identifiers with fail-closed validation. No invented store ownership or OTA deployment.
- [x] Allowlisted standalone build context, its own lockfile/config and input hash manifest; exclude secrets, native output, sibling projects and old deployment archives.
- [x] Release-like Hermes iOS/Android JavaScript and DOM bundle commands; native prebuild privacy configuration generated for both platforms. Separate these checks from signed native binaries.
- [ ] Actual EAS upload-archive inspection and signed candidates: EAS CLI stops at the missing Expo login. Apple ownership, approved IDs and signing access are not configured.
- [ ] iOS compilation/signing on macOS/Xcode or EAS, unavailable here. Android native binary work is deferred; its earlier dependency resolution returned HTTP 503 for a required AndroidX lifecycle POM.
- [ ] Complete Expo Doctor's two online schema/directory checks after environment access to Expo/React Native Directory is available. Local compatibility checks are documented separately.
- [x] Store copy, fictional reviewer-access instructions, device checklist, support/rollback procedures and app-only CI commands under `app/`.
- [ ] TestFlight, required physical/live gates, store screenshots and final publisher submissions. Do not label the app production ready until these pass.
- [x] Keep mobile work on `expo-app`; do not alter or trigger the existing web deployment workflow. The `main` deployment-trigger issue remains a separate owner decision before any merge.
