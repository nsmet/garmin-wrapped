# Garmin Wraped — a MINI WATT product ⚡️

A Garmin annual recap prepared for independent visitors at **https://garmin-wrapped.miniwatt.app**. The existing sports-poster design, motion controls, 1080×1920 exports, fictional demo and 184-concept design library are preserved. Real stories are calculated from imported records and admitted only when their required measurements are complete.

## Deploy to Cloudflare

Use [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md) for the first deployment, runtime secret, domain, Git builds and rollback. `npm run deploy:cloudflare:dry-run` verifies the production upload locally; `npm run deploy:cloudflare` builds and publishes it. The Cloudflare target uses isolated visitor sessions and requires no Sites login.

## Develop and verify

Use Node 24.21+ and npm. No personal credentials are needed for the tests or demo.

```sh
npm ci
npm run dev
npm run check
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm audit --omit=dev --audit-level=high
```

The local preview runs at http://127.0.0.1:5173. The Sites starter supplies a local mock identity; deployed requests use Sites authentication. Unit/API/importer tests inject fake Garmin responses and exercise default wellness inclusion, source-failure omission and explicit importer exclusions; browser tests mock only the application's API and exercise the real UI, normalization-to-story flow, consent and canvas export. Neither is a live Garmin account test.

Responsive browser coverage includes Chromium and WebKit on desktop and mobile. All recap slides are checked at seven viewport sizes from 320×568 to 1920×1080, including tablet and phone landscape; all 184 library templates are checked at desktop, tablet and compact-phone sizes. The checks measure drawn text against the live navigation bounds and exercise the onboarding, dialogs and portrait export controls after resizing.

For a local development key default, set `DEV_GARMIN_API_KEY` in the ignored `.dev.vars` file. The dev server prefills the password field on entry and when returning to connect; production builds omit this behavior. Keep actual keys out of tracked files.

## Connection and privacy

The Cloudflare deployment accepts each visitor’s own Personal API key in an isolated, encrypted browser session. The original Sites target retains its platform sign-in. Garmin’s Personal API is intended for individual use and excludes commercial applications serving multiple end users; resolve Garmin’s integration terms before a commercial launch. See the deployment guide for the distinction between technical visitor support and an approved business integration.

Cloudflare non-secret settings are in `wrangler.cloudflare.jsonc`; `SESSION_SECRET` is set with `npm run secret:cloudflare`. The legacy Sites target uses runtime environment tools. Never commit secret values:

- `GARMIN_MODE=personal` enables the personal-account connector. Any other value disables it.
- `SESSION_SECRET`: at least 32 random bytes, base64url encoded. Used for AES-GCM encrypted session cookies. Rotation invalidates sessions.
- `AUTH_MODE=visitor` and `PUBLIC_ORIGIN`: public Cloudflare session mode and exact allowed origin.
- `CONNECT_RATE_LIMITER` / `DATA_RATE_LIMITER`: Cloudflare bindings for public request limits.
- `PERSONAL_OWNER_ID`: optional exact Sites-scoped authenticated user ID, used only by the legacy private Sites target.

The Garmin key is submitted to the same-origin server, exchanged for Garmin's text JWT and immediately discarded. The JWT is kept in an encrypted, HttpOnly, Secure, SameSite=Strict cookie for at most 20 minutes. It is cleared after each import and on disconnect. Neither keys nor raw activity/health records are written to durable storage. The tab holds the resulting recap in memory; refresh/close clears it. Application logs allowlist request IDs, route names, codes and durations. Hosting infrastructure/access logs are controlled by the hosting provider.

Daily steps, sleep, heart rate and overnight HRV are included automatically when available, without form options. A health export requires separate consent per card and per preview. Export allowlisting excludes evidence references, Garmin IDs, names, timestamps and locations. A downloaded or shared PNG cannot subsequently be deleted by this app. Disconnecting clears this app's session; revoke the key separately in Garmin Connect to revoke Garmin access.

## Pipeline

`Garmin -> bounded pages -> allowlisted normalized records -> coverage ledger -> verified candidates -> ordered Chapters[].Stories[] -> presentation admission -> sanitized export`.

- `server/garmin.mjs`: documented Personal API auth, activity search, daily wellness and monthly sleep adapters; request timeouts, capped transient retries, no auth retries.
- `server/api.mjs`: platform identity, same-origin POST enforcement, request limits, encrypted/user-bound sessions, no-store responses, redacted errors and security headers.
- `public/importer.mjs`: cancellable import, terminal-page completeness, repeated-page detection, optional-source failure omission, connection cleanup.
- `public/metrics.mjs`: versioned normalization, per-metric coverage/provenance, timezone-based year boundaries, duplicate conflict rejection, multisport-child exclusion and chapter planning.
- `public/activity-audit.mjs`: private, in-memory activity breakdown with exact Garmin types, dates and links, plus counts of excluded duplicates, multisport children and records outside the period. It is never part of card exports.
- `public/story-model.mjs`: admission, unique claims, health consent, display-only export allowlist and chapter-plan adaptation.
- `public/app.mjs`, `public/onboarding.mjs`, `ui/index.html`: real flow and demo, accessible DOM descriptions, dialogs, reduced motion, navigation, recovery and data clearing.
- `public/visual-system.mjs`, `public/poster.mjs`: shared renderer for live cards, thumbnails and exports.
- `scripts/check.mjs`, `.github/workflows/check.yml`: source/security boundary and image-budget checks, tests, dependency audit and production build.

### Verified story families

The year overview includes recorded activities, total minutes/hours when duration coverage is complete, distinct active days, a donut and counts for every sport family, and a twelve-month heat map. Peak and quietest comparisons preserve ties, exclude unfinished/future months and are disabled for partial imports. Missing duration switches the heat map to explicitly labeled session counts. Sport copy and layouts vary by measurement: equipment introduction, recorded time, distance, weekday distribution and ranked longest distances. Demo and production use the same planner and renderer. Aggregate chart fields are validated and copied through an explicit export allowlist.

Session count and complete recorded hours across 18 sport families; distance and longest recorded distance for applicable sports; weekday patterns with enough sessions and a unique winner; sport mix; recorded steps and peak step day; median recorded sleep (30+ nights); recorded activity peak HR, median activity-average HR (8+ activities), resting heart rate (30+ days), and overnight HRV (30+ nights) when available; overview and finale. Unknown types remain in “Other activities”. Distance/duration require usable numeric measurements in every eligible record. Missing records never become zero.

Hours cards use 19 independent sport compositions in `public/duration-posters.mjs`, including a separate design for Other activities. Each varies its geometry, number placement and supporting-stat layout. The same renderer serves live cards, chapter thumbnails and exports, including alternate export colors. Decorative shapes never assert laps, sets, routes or discipline time splits. Browser regressions verify that every composition remains unique with identical colors and measurements, and that small and large values fit mobile, landscape, desktop and portrait export layouts.

`indexComplete` means all pages returned for the requested window were consumed. It does not prove Garmin recorded every activity performed. Imports always use the current year in the device’s automatically detected timezone. Activity dates are converted from explicit UTC into that timezone; daily wellness uses Garmin's calendar dates. Current-year copy says “so far”. Partial imports never generate a longest-of-year claim. Unsupported detailed concepts (FIT splits, routes, power/HR-zone analysis, nutrition, hydration, technical sport metrics, etc.) stay in the design library and do not generate claims. The full 176-candidate reference specification lives in `../garmin_wrapped_story_engine_v3`; this implementation provides the supported first-release metric families rather than claiming all concepts have calculators.

Reloading a story URL returns to connection with an explanation that the private recap was cleared. Fictional records load only after explicitly choosing the demo. To investigate a sport count after import, open the chapter menu and choose “Activity breakdown, coverage & privacy”; unknown Garmin types remain under Other activities with an explanation in coverage details.

The heart-rate chapter includes monthly resting-HR and overnight-HRV medians when at least two months have 10+ recorded days or nights and the source has 30+ measurements overall. Charts retain all 12 months, show measurement counts, leave gaps for sparse or missing months, and mark the current month and future months. Future-dated records are excluded using the device timezone. Activity peak HR is the highest usable maximum in the imported activities, without estimating physiological HRmax. Activity-average HR is the median of recorded session averages, with each activity weighted equally. HRV uses Garmin's `lastNightAvg`, never the rolling weekly average. Garmin's daily `restingValue` may fall back to the daily minimum; coverage details explain this. HRV import failures discard the partial HRV source while preserving the rest of the recap. All heart-rate and HRV cards require separate export consent.

### API contracts

Verified against Garmin's Personal API Swagger and official Python client:

- POST `/personalapitoken-service/personal-api/personal-api-key/token`, `Authorization: ApiKey ...`, text JWT response.
- GET `/activitylist-service/activities/search/activities`, direct array, `start`, `limit=99`, inclusive local-date bounds, `excludeChildren=true`.
- GET `/usersummary-service/v2/dailysummaries`, `{data:[]}`, one-year range.
- GET `/sleep-service/sleep/dailySleepSummariesByDate`, direct array, max 31 days.
- GET `/hrv-service/hrv/daily/{fromDate}/{toDate}`, `{hrvSummaries:[]}`, requested month by month. Only calendar date and usable overnight average enter the recap.

Sources: https://developer.garmin.com/gc-developer-program/personal/swagger-docs/ and https://github.com/garmin/connect-personal-api-python . Do not run or deploy `../audit.py`: it contains an existing personal credential outside this repository.

Data-quality notes and optional-source failures are available under the story menu’s “Activity breakdown, coverage & privacy”. They never add a repeated warning banner to story cards. Unavailable measurements still cannot generate stories. Hosted HTTP 526 responses are reported in coverage details as secure-connection failures and never cause certificate checks to be bypassed.

## Hosting

`wrangler.cloudflare.jsonc` configures the standalone Worker and Custom Domain. `public/` contains static assets and `ui/index.html` is served by the root route. `dist/` is generated and ignored. `.openai/hosting.json` and the Sites Vite integration retain the original Site identity. Use [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md) for this domain and `OPERATIONS.md` for the historical private Sites acceptance record.

Cycling recaps end with a MINI WATT invitation after the year receipt. It is shown only when an admitted cycling chapter exists, is excluded from personal card exports, and links to miniwatt.app without passing recap data.
