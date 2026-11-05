# Personal API transport and parity

Reviewed 5 November 2026. Source: the website's `server/garmin.mjs`, `public/importer.mjs`, `public/metrics.mjs`, `public/story-model.mjs` and `public/recap-sequence.mjs` at `e3102e5`. The mobile branch started clean at `8bb1152`; no website changes were made.

## Direct native requests

The prototype's global React Native fetch was unsuitable: React Native documents `redirect: manual` and `credentials: omit` as unsupported, and its response body need not be a readable stream. The prototype's streaming-only reader could return an empty token and its per-request timeout had been removed. A mocked Node Response did not expose those limitations.

The native entry now explicitly passes Expo SDK 58's `expo/fetch`. In the installed Expo source, Android `NativeRequest.kt` disables both HTTP and HTTPS redirect following for manual mode and omits cookies; iOS `NativeResponse.swift` rejects following in its URLSession delegate and `ExpoURLSessionTask.swift` disables cookie handling for omitted credentials. TLS uses the normal platform trust store; no certificate override is installed. This is source-level evidence, not a successful live Garmin test.

Expo Fetch ignores the Fetch `cache` option in its request initializer. An explicit `Cache-Control: no-store` request header is sent, and the app's native config plugin additionally creates an ephemeral/no-URLCache iOS session and disables Android's inherited OkHttp disk cache. Native privacy setup is applied at binary build time. Do not substitute global `fetch` or treat Expo Go as equivalent.

The request deadline covers fetch and body consumption; a manual AbortController composition avoids relying on `AbortSignal.any/timeout`. Streaming reads enforce 8 MB per response; the fallback `text()` reader validates size after native buffering, so a nonstreaming test/fallback transport cannot provide a streaming memory bound. The production transport has streamed response support. Retries share the caller's cancellation, never retry auth/permissions, use at most three attempts and cap Retry-After delay at five seconds. Both the import and request generation are checked after asynchronous work.

There is no remote session/revocation endpoint in this architecture. Closing an import discards its in-memory bearer reference; it does not revoke the user's Garmin API key or guarantee immediate upstream token invalidation. Use Garmin's key page to revoke access.

## Website contract retained

| Source | Mobile request / admission rule |
| --- | --- |
| Key exchange | POST `/personalapitoken-service/personal-api/personal-api-key/token`, `Authorization: ApiKey …`; plain JWT or supported JSON token wrapper. Bearer used only after validation. |
| Activities | GET `/activitylist-service/activities/search/activities`; year-boundary padding, local start ascending, `excludeChildren=true`, 99 records/page; advance by returned count until an empty terminal page, maximum 20,000 activities. |
| Daily | GET `/usersummary-service/v2/dailysummaries` for the requested year; normalize typed fields, strip health fields for movement-only imports. |
| Sleep | GET `/sleep-service/sleep/dailySleepSummariesByDate` monthly, up to the selected zone's current month for the current year. Discard incomplete source history. |
| HRV | GET `/hrv-service/hrv/daily/{start}/{end}`; overnight averages, not weekly values; discard incomplete source history. |
| Recap | Unchanged source normalizers, time-zone filtering, duplicate/parent rules, completeness/coverage, health thresholds, monthly unknown/future states, precision, story selection/order and cycling invitation. |
| Privacy | No web API calls/cookies. Records stay native/in memory; viewer gets only bounded presentation fields. Per-card native share authority, display-only export allowlist, no promotional exports. |

The website's metric and selection code remains immutable and verified by hashes. Transport/session changes are isolated under `src/`. Node tests use synthetic data only; native React tests mock I/O to check application state, not Garmin connectivity.

## Runtime check and current iOS scope

The matching Hermes v1 Linux CLI was built from tag `hermes-v260318099.0.5` (`9a115f1`) with ICU 76/Intl enabled. Its `PlatformIntlICU.cpp` DateTimeFormat.formatToParts and NumberFormat paths contain placeholders; Android and Apple use separate implementations. Twenty-five portable normalization/grouping/privacy checks pass in that runtime, while the full recap suite correctly fails its Intl preflight. This does not establish a phone bug or native parity. The app now refuses an import before key exchange if the required date parts and decimal formatting are unavailable. Native iOS Intl/year-boundary checks remain mandatory.

Android is deferred per the latest user instruction. Current release validation targets iOS. The native Skia/Metal renderer is the preferred next architecture in `ios-architecture.md`; the implemented bundled viewer is still the parity reference and has no claimed iPhone benchmark.

## External validation still required

On a physical iPhone and Android phone with an authorized account, verify TLS, redirects (including a controlled no-credential redirect probe), omitted cookies, bearer requests, streaming/abort behavior, a full current-year import, optional-source permissions, rate limits and interruption. Compare counts, excluded records, sport types, ordered story IDs/values, steps/floors, health and warnings with the website for exactly the same year and time zone. Record only pass/fail and differences without personal records, keys, tokens or private screenshots.

Garmin's current public overview describes Personal access as pull access to the individual's own data. Business access has a different integration and history model. That does not by itself establish distribution permission or sufficient history for this app's intended audience; the owner must confirm the applicable Garmin terms/authorization before public distribution. No account-bound documentation or agreement was available in this session.

Sources checked: [React Native networking](https://reactnative.dev/docs/network), [Expo DOM components](https://docs.expo.dev/guides/dom-components/), [Garmin program overview](https://developer.garmin.com/gc-developer-program/overview/), and the installed/pinned Expo native source. Current public pages were read on 5 November 2026; there is no claim that a real Personal API connection succeeded.
