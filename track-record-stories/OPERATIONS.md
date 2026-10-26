# Cloudflare and historical Sites operations

The current standalone deployment targets **https://garmin-wrapped.miniwatt.app** and supports independent visitors using their own keys. Follow [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md) for deployment, secrets, request limits and rollback. The following sections record the earlier owner-private Sites deployment; its audience, release gate and acceptance results do not describe a verified public Cloudflare deployment.

## Historical private release record

## Scope and remaining gate

Keep Site `appgprj_6ada43661f988191accfbfee8e03ecf2` owner-private. The earlier Sites deployment was owner-private. The standalone Cloudflare target now has separate visitor sessions, Cloudflare rate-limit bindings and a public-configuration check. Garmin’s restriction on commercial multi-user use of the Personal API still applies; see the current deployment guide. Access to a personal key does not establish business integration approval.

On 23 October 2026, a read-only live check with an owner-supplied key passed authentication, complete 2025 activity pagination, normalization and story admission. The key and account records were held only in process memory and were not saved. Automated tests continue to use fake responses. A subsequent read-only acceptance check compared returned steps, resting-heart-rate and sleep fields against the original Garmin responses across the selected year; all comparisons passed and health cards were blocked from export without consent. No raw values or account records were saved. Physical-phone native sharing remains an owner acceptance check. The existing credential in `../audit.py` was not used.

Owner acceptance sequence:

1. Connect your own key. The recap uses the current year and automatically detects your device’s timezone. Daily steps, sleep and resting heart rate are included automatically when available; the form has no inclusion toggles.
2. Compare session counts and at least one distance/duration against Garmin's same-year records. Use the chapter menu's “Activity breakdown, coverage & privacy” to inspect the exact source types, activity dates and links behind each sport count, plus excluded-record totals. Confirm multisport parent/child behavior and boundary dates. Reload a recorded story and confirm it asks for reconnection instead of automatically opening fictional data.
3. Check recorded daily steps, sleep and resting-heart-rate coverage against Garmin and verify missing sources omit stories.
4. Confirm each health export asks permission; reject one and allow another. Check the PNG's content and 1080×1920 dimensions. Test native sharing on a physical phone (browser automation cannot validate the device's share sheet).
5. Clear data, reload, and verify the recap is gone. Revoke a disposable test key in Garmin and verify a later connection fails cleanly.

## Privacy and export acceptance

Automated checks cover default activity/steps/health inclusion and explicit importer exclusions, missing optional sources, session expiry, cancellation, repeated pagination, health export consent and clearing. Chromium and WebKit both verify that exported PNGs decode at exactly 1080×1920. Consent dialog text is wiped on dismissal and data clearing. Export consent is revoked whenever a preview closes, including after encoding fails or a preview is cancelled before a blob exists. These regressions were reproduced before the fixes and now pass with fictional fixtures.

Current automated coverage: 51 unit/API/importer tests and 104 desktop/mobile browser checks, including automatic current-year and device-timezone detection across the New Year boundary. Responsive checks cover all 25 example recap slides at seven viewport sizes (320×568 through 1920×1080), all 184 library templates at desktop/tablet/compact-phone sizes, and usable onboarding, dialogs and export controls after resizing. Motion checks cover actual changing canvas frames, exact-frame pause, paused navigation and reduced-motion changes during a transition in Chromium and WebKit. Regression checks cover reload/reconnection, explicit demo selection, 52 cycling activities versus two runs, source-type breakdowns, excluded-record accounting and clearing the breakdown. Annual checks cover deduplication, active days, sport shares, monthly minutes, ties, missing durations, partial coverage, future months, and sanitized chart export. No test revokes the owner’s live Garmin key or sends a card to another app. The native share sheet and a disposable-key revocation check require the owner’s device/account interaction.

## Release

Use Node 24.21+. `npm ci`, `npm run check`, `npm test`, `npm audit --omit=dev --audit-level=high`, `npm run build`, and `npm run test:e2e` must pass. GitHub Actions contains these checks for repositories mirrored to GitHub; the current Sites source repository does not itself execute GitHub Actions. Run the same commands through the Sites source workflow before publishing.

The source helper pushes and packages the exact checkout. Use the retained project ID and verified commit/archive in the native private deployment operation. Never switch audience to diagnose an API error. Confirm the returned deployment status and URL. Runtime variables are applied by redeploying a saved version.

## Hosted acceptance record

The private browser flow also completed with both steps and health enabled. Available health insights require the same per-card consent as fixture tests. One later monthly sleep request exhausted its bounded retries with upstream HTTP 526, so sleep was omitted rather than calculated from a partial fetch. Source explanations are available under the story menu’s “Activity breakdown, coverage & privacy”; coverage notes do not interrupt story cards with a repeated banner. During acceptance, earlier hosted token-exchange requests were rejected before numeric upstream status logging was added; a later complete import succeeded. The earlier vendor status is unknown, so this record does not attribute the rejection to a specific cause. New rejection logs include that status for future diagnosis. The owner’s open recap was left intact.

## Connector compatibility

The Garmin adapter uses `redirect: manual` and `cache: no-store`. The deployed Worker fetch implementation rejects `redirect: error` before sending a request, which previously appeared as a Garmin connection failure. Redirect responses are rejected explicitly, without following them or forwarding credentials to another destination; regression tests cover both behaviors.

## Health and errors

- `/api/health`: no-store liveness/version response; hosting authentication still applies on the private Site.
- Native Sites Worker logs expose structured `api_error` events with request ID, allowlisted route, code, status and duration. Unexpected upstream rejections additionally log the numeric HTTP status, never the vendor response body. Correlate a user-visible request ID to these events. Never log request/response bodies, headers, source records or vendor error text.
- `GARMIN_AUTH` / `SESSION_EXPIRED`: reconnect. No background refresh or permanent connection exists.
- `GARMIN_PERMISSION`: inspect source availability/permissions. Unavailable optional stories are omitted, with the source explanation in the story menu’s coverage details.
- `GARMIN_RATE_LIMIT` / `GARMIN_UNAVAILABLE`: bounded retries are already applied; wait and retry the import. Do not loop indefinitely.
- `GARMIN_TLS`: the hosted upstream returned HTTP 526 after bounded retries. A secure source connection could not be validated. Unavailable optional stories are omitted, with the source explanation in the story menu’s coverage details; token-exchange failures stop the import. Keep TLS verification enabled. Cloudflare documents this status at https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-526/ . This app cannot repair the external certificate chain.
- `UPSTREAM_DATA`: inspect Garmin's schema with sanitized fixtures; fail the import rather than silently producing annual totals.
- Browser failures show a recoverable message. No third-party analytics/error SDK is installed. Persistent notification/alert destinations have not been configured; use Worker logs and the liveness endpoint with the operator's chosen private monitoring service.

Rate limits are in-memory per Worker isolate (6 connections and 300 data requests per user/minute); they are appropriate only behind owner-private access, not global abuse protection for a public app. Imports cap at 20,000 activities, eight MB per upstream response, 15 seconds per upstream attempt, three transient attempts and five minutes overall. No durable health database means there is no health-data backup to restore.

## Rollback and recovery

Before release, record the current Site version. Version 4 is the previous fictional-only static prototype. To roll back, list saved Site versions, select the known-good version and deploy it with the native owner-private deployment operation. Confirm success. A Worker version must use its matching runtime settings and archive; a static prototype rollback restores demo-only behavior. Rotating `SESSION_SECRET` immediately invalidates encrypted session cookies; disabling `GARMIN_MODE` and redeploying disables new data connections. Neither action revokes Garmin keys.

## Dependency audit

Next, React, Vite, Vinext and the Cloudflare runtime were updated from the supplied starter. Release checks fail on high/critical production dependency findings. The full dependency audit currently includes unresolved advisories in Vinext’s build-time CommonJS/glob chain (`vite-plugin-commonjs` → `fast-glob` → `micromatch`/`braces`) and its optional OG generator (`satori`/`fflate`). These are development/build dependencies; this site accepts no remote build sources, user glob patterns, uploads or OG-rendering requests. They are not a justification for ignoring runtime findings. Recheck the full audit when upgrading Vinext, and verify those modules remain absent from the emitted Worker. Do not use `npm audit fix --force` to silently downgrade the framework.

## Asset budget

25 web assets total 6,752,326 bytes (80.63% smaller than the original 34,862,098 bytes). No single image exceeds 750 kB. Images load on demand and the full design catalog loads only when opened. Original generation provenance and codec verification are in ASSETS.md.
