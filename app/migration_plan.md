# Separate Expo app migration plan

Prepared 5 November 2026. Planning document only: no Expo application, dependency installation, deployment, commit or push is performed by creating this document.

## Implementation update — 5 November 2026

The plan below is the original design record. Implementation now lives in this app folder on `expo-app`, retaining the pinned website snapshot. Per the current user instruction, connection uses direct Garmin Personal API requests through Expo Fetch; no separate backend or website changes were introduced. Current completed work, test evidence and external release gates are recorded in `TODO.md` and `docs/validation.md`. A production-ready claim requires the pending real-device, live-account and signed-release checks.

## 1. Source of truth and fixed boundary

GitHub repository: [nsmet/garmin-wrapped](https://github.com/nsmet/garmin-wrapped).

The GitHub API was queried directly for `refs/heads/main` before this plan was written. Its head was **`e3102e526e6804ff9546248d86c9f5db8f0f6412`**, “Complete privacy contact details”, committed 3 November 2026 at 16:33 Brussels time. The local `work` branch pointed to the same commit and `git status --porcelain` was empty before planning. The source review used a `git archive` of that exact commit, excluding ignored files, local build output and personal configuration.

Baseline: [view the reviewed commit](https://github.com/nsmet/garmin-wrapped/tree/e3102e526e6804ff9546248d86c9f5db8f0f6412).

**All repository additions and subsequent mobile implementation belong inside a new top-level `app/` directory, alongside `track-record-stories/`. The existing website stays exactly as it is.** This is separate from `track-record-stories/app/`, which already belongs to the website.

The boundary includes source, assets, dependencies, lockfiles, tests, server behavior, configuration, domains, secrets and deployment workflows. Specifically:

- Do not edit, move or delete anything in `track-record-stories/` or `garmin_wrapped_story_engine_v3/`.
- Do not introduce a root workspace, shared package, root dependency, root lockfile change or root Git hook.
- Do not edit `.github/`, the root `.gitignore`, hosting metadata or existing web deployment settings.
- Do not change the website API, cookies, consent behavior, CSS, Three.js version or build process to accommodate mobile.
- Do not load the live website as the mobile interface. Ship an app-owned copy of the rendering code and required assets.
- Do not add association files or universal-link routes to the website for this release. Use app-owned links if needed.
- App builds and tests must work when both existing sibling source directories are absent from the build context.

At implementation start, query GitHub `main` again, inspect any new commits, and refresh this baseline explicitly. Never assume a local branch or a previously fetched remote ref is current. Never reset away user changes. Use a separate branch/worktree when needed; keep implementation changes confined to `app/`.

## 2. Recommended product architecture

Build an **Expo app with native screens and a bundled web recap renderer**. The iOS and Android binaries share the new app codebase. The existing website remains independent.

React Native owns connection, health-data consent, loading/progress, errors, settings, secret storage, platform navigation and native sharing. One embedded DOM surface owns the entire recap scene: backgrounds, typography, dots, transitions and recap-specific controls. During a recap, avoid layering competing native controls over web controls. Present native share/privacy screens separately and pause rendering underneath.

Use Expo DOM components as the first implementation candidate. They provide a supported way to bundle a web rendering surface and communicate with native code. They do **not** convert imperative HTML and JavaScript into React Native components. A small app-owned React DOM wrapper and a refactored viewer controller are still required.

If release-build asset loading or export transfer fails the prototype, use an explicit `react-native-webview` with a bundled, self-contained viewer. This fallback changes only the embedding adapter, not the website or the data contract. Do not ship a fallback that simply points at the production web URL.

The initial release deliberately keeps the renderer in a web graphics environment. Rewriting it through native Three.js, React Three Fiber or Skia is a separate future project, triggered only by measured requirements. Native graphics libraries are not needed in the initial app dependency list.

Data flow:

```text
Native connection + consent
    -> separate mobile API -> authorized Garmin integration
    -> native import coordinator + app-owned copy of the metric/story pipeline
    -> validated recap held in native memory
    -> allowlisted presentation data -> bundled DOM viewer
    -> native-authorized sanitized export -> local PNG -> platform share sheet
```

This architecture preserves the existing visual system while allowing mobile features and release schedules to evolve independently. It intentionally accepts a maintained copy of selected web modules rather than requiring changes to the web project.

## 3. Release-one scope

The target is current product functionality on physical iPhones and Android phones:

- Connect using an explicitly supported Garmin authorization method, with clear help and recoverable errors.
- Build the current-year/year-to-date recap in the device's resolved time zone, matching the reviewed website's behavior.
- Preserve source coverage, sport classification, eligibility thresholds, monthly unknown/future states, story order, omission rules and displayed units.
- Preserve all currently reachable dot designs, transitions, foreground text, colourways and conditional promotional content. Promotional cards remain excluded from exports.
- Support touch navigation, progress, pause/reduced motion, safe areas, screen resizing, font loading and accessibility.
- Generate the same 1080 × 1920 PNG cards and share them through the platform share sheet. Offer explicit image saving if selected, with permission handling.
- Provide native privacy/coverage details, forget-key and clear-data actions. Preserve the existing activity-audit information through an app-owned accessible view.
- Bundle a clearly fictional fixture mode for development and device testing. Production reviewer access is planned explicitly; personal real-data fixtures are never bundled.

Release one does not introduce recap archives, cloud accounts, cross-device sync, multiple-year history UI, push notifications, scheduled imports, background syncing, video exports, payments, widgets, watch apps, Apple Health or Health Connect. Existing story-design libraries remain development tooling rather than a new production feature.

The interface may differ from the website where mobile controls require it; the website itself does not change. Exact metric/eligibility parity and close recap/export visual parity are required. Native onboarding need not be pixel-identical to web onboarding.

## 4. Proposed app directory

The following is the target layout, not files scaffolded by this planning task:

```text
garmin-wrapped/
  track-record-stories/                  existing web application; untouched
  garmin_wrapped_story_engine_v3/        existing reference material; untouched
  .github/                              existing workflows; untouched
  app/                                  independent Expo project
    migration_plan.md
    README.md
    package.json
    package-lock.json
    app.config.ts
    eas.json
    metro.config.js
    tsconfig.json
    .gitignore
    .eas/workflows/                      mobile workflows, after context validation
    assets/                             app icons, native fonts, splash assets
    src/app/                            Expo Router native routes
    src/features/connect/
    src/features/import/
    src/features/recap/
    src/features/share/
    src/features/privacy/
    src/core/                           typed wrappers around copied pure modules
    src/platform/                       key storage, files, lifecycle, accessibility
    src/viewer/                         DOM wrapper, controller, markup, style adapters
    src/bridge/                         versioned native/DOM contracts and validation
    vendor/web-baseline/                 immutable copies from the pinned main commit
    vendor/source-manifest.json          source SHA, paths, hashes, licences
    public/                             binary-bundled viewer assets if needed
    backend/                            separately deployed mobile API
      src/
      wrangler.jsonc
      README.md
    scripts/                            app-only checks, copying, packaging and release
    tests/unit/
    tests/contracts/
    tests/viewer/
    tests/device/
    tests/fixtures/                     synthetic data only
    docs/                               decisions, device results and release runbooks
    .build/                             ignored app-only build/staging artifacts
```

Install dependencies only from `app/`. Use its own lockfile and Expo-supported React/React Native versions; do not inherit the website's React version. Pin the selected stable Expo SDK, compatible native packages, EAS CLI, Node version and viewer Three.js version after the prototype passes. Run `expo install` for native packages and `expo-doctor` for compatibility.

Expected modules: Expo Router, development client, DOM/WebView support, SecureStore, FileSystem, Sharing, Font, safe-area support, and system accessibility/lifecycle APIs. Add MediaLibrary only for an explicit save-to-photos feature. Add AuthSession/WebBrowser only if the approved Garmin connection flow needs them. Avoid permissions and packages without a release-one use.

## 5. What is reused and what is adapted

All source imports are one-time, reviewed copies from a verified Git commit. Import scripts read Git objects at the pinned SHA; they never copy working-tree files, `.env` files or generated archives. Normal builds do not execute an import script or read sibling directories.

| Existing source | Mobile treatment |
| --- | --- |
| `public/metrics.mjs`, `measurement-format.mjs`, `sport-registry.mjs`, `story-content.mjs` | Copy with their transitive dependencies; preserve calculations and coverage rules. Wrap with app-owned TypeScript contracts. |
| `public/story-model.mjs`, `visual-system.mjs`, `recap-sequence.mjs` | Copy the runtime validation, ordering and export allowlisting dependencies. Keep evidence checks in native processing before creating presentation data. |
| `public/dot-engine.mjs`, `dot-shapes.mjs`, `dot-spec.mjs` | Copy the geometry, motion, units/legend and story-to-design mapping. Preserve every data-dot meaning. |
| `public/dot-card.mjs`, `dot-scene.mjs`, `dot-render.mjs`, `share-card.mjs`, vendored Three.js | Keep the web rendering algorithms inside the bundled viewer, including Canvas 2D fallback and export compositing. |
| `public/app.mjs` | Use as a behavioral reference. Build an app-owned viewer controller with explicit mount/dispose and bridge APIs; do not import the full browser application unchanged. |
| `ui/index.html`, recap styles, `fonts.css`, required images/fonts | Extract required recap markup/styles into app-owned viewer files. Resolve assets for release builds; remove website-only navigation, SEO, script tags and onboarding assumptions. |
| `public/importer.mjs` | Preserve pagination, completeness, bounded requests, optional-source omission and cleanup behavior; replace transport with a native app API client. |
| `public/onboarding.mjs`, `key-store.js`, `entry-field.js`, `entry-reel.mjs` | Rebuild onboarding natively. Preserve important copy/progress semantics. Keep any reused animation within an app-owned DOM component; browser localStorage is not the native secret store. |
| `server/garmin.mjs`, `server/api.mjs` | Reuse reviewed integration logic in the mobile backend as appropriate. Replace website-specific session/origin assumptions only in the app copy. |
| Existing unit/browser tests | Copy applicable assertions and synthetic fixtures into app tests, adjusting paths. Supplement them with native integration tests rather than assuming browser coverage proves device behavior. |
| `garmin_wrapped_story_engine_v3/` | Reference for semantics only unless a runtime dependency is demonstrated. Do not substitute its illustrative reference selector for the live metric pipeline. |

The source manifest records the full upstream commit, original path, destination, SHA-256 and licence for every copied file. Keep immutable baseline files separate from app adapters. Record intentional mobile changes and source refreshes; do not silently overwrite adaptations during a refresh. Include required font and Three.js licence notices.

## 6. Renderer and bridge implementation

Build one persistent viewer per active recap. Refactor the copied browser controller to accept a validated presentation model instead of fetching records or controlling onboarding. It must mount only after its markup and canvases exist, handle Strict Mode mount/unmount correctly, and dispose listeners, observers, animation frames, textures, WebGL contexts and object URLs.

Keep dot calculations and animation inside the viewer. **Never send dot positions across the native bridge each frame.** Native sends a recap once, then small commands for navigation, playback, lifecycle and export. Keep GPU shaders, background drawing, Canvas text and export composition together for visual consistency.

Suggested version-one contract:

| Direction | Operations |
| --- | --- |
| Native -> viewer | initialize presentation, navigate to story, set playback/reduced motion, update viewport/insets, request sanitized export, clear/dispose |
| Viewer -> native | ready/capabilities, selected story changed, open-share request, coverage/details request, export bytes/chunks, recoverable renderer error |

All commands carry a protocol version and recap generation; asynchronous operations also carry request IDs. Validate inbound messages and reject unknown types, oversized payloads, stale generations and invalid story IDs. DOM/native action calls are asynchronous. Use serializable DTOs: no Sets, functions, DOM objects or browser URLs in cross-runtime payloads. Native retains authoritative consent state and raw/evidence-bearing datasets; the viewer receives allowlisted display data and minimal UI flags.

For exports, native authorizes the selected story and colourway, creates sanitized display fields, and requests a deterministic still frame. The viewer returns PNG bytes through a bounded, tested transfer. A `blob:` URL is private to the WebView and cannot be passed to the native share API. Prove base64/chunk transfer or a supported file handoff during the spike, including peak memory and cancellation. Do not bridge repeated full-resolution images just to show thumbnails.

Bundle fonts, images and renderer JavaScript; no CDN dependencies or website asset URLs. For Expo DOM public assets, use the supported asset base path. Public assets are embedded in binaries and are not supported by Expo Update, so release one ships renderer/asset changes through new binaries. Do not assume adding `use dom` makes existing relative imports, HTML script tags or CSS URLs work automatically.

Retain the existing approximately 30 fps ambient target and higher-frequency transition behavior where sustainable. Retain the existing pixel-density cap, background stopping and Canvas fallback. Any mobile optimization must preserve the data-dot count/legend meaning. Reduce resolution, animation rate or decorative work before changing meaningful dots. Canvas fallback is a measured degraded path, not an assumption that every large scene will remain smooth.

The prototype must test a release-like binary with no Metro server, no sibling website files and no Internet asset access. Debug-mode success alone is insufficient.

## 7. Separate mobile API and Garmin dependency

The current API requires same-origin browser requests and uses a short-lived encrypted HttpOnly cookie. A bundled DOM/native app has a different origin and request model. Do not weaken or extend the production website API to accommodate it.

Create a separate mobile API under `app/backend/`, with a distinct deployment identity, endpoint, environment variables, session secret, rate limits and logs. Prefer the current server platform to minimize new infrastructure. Existing web routes, Cloudflare configuration, cookies and production secrets remain untouched. Deployment of the new backend is an implementation/release step, not part of creating this plan.

Proposed mobile contract: versioned connect, activities, wellness, sleep, HRV and disconnect endpoints. Preserve the existing bounded pagination, source failure behavior, import timeout and metric completeness rules. Keep API versioning separate from the native/DOM bridge version.

Use an explicit short-lived mobile bearer session rather than a shared WebView cookie jar. Keep it in native memory, outside URLs, logs and the DOM viewer. Preserve a maximum 20-minute import-session lifetime unless the approved integration requires a separately reviewed policy. Enforce expiry, scope and per-session/per-IP rate limits server-side. A client ID or an Origin header alone is not authentication.

If disconnect is described as revocation, implement actual server-side closed-session/revocation tracking with bounded expiry. Dropping a token from client memory does not revoke a stateless bearer token. Store no raw activity/health records; document any temporary session identifiers retained for revocation. Seal upstream credentials/tokens server-side where appropriate, and keep the mobile backend's key separate from web secrets.

Keep remembered personal keys opt-in and only save after successful authentication. Use SecureStore, not WebView localStorage. Clear on explicit forget, rejected credentials and clear-data actions. Do not promise uninstall is the only deletion mechanism; verify platform-specific SecureStore behavior. Public OAuth credentials/client secrets never belong in an Expo bundle. If OAuth is required, use the system browser, supported callbacks and PKCE where applicable, with server-side secrets.

**Garmin access is a production gate independent of Expo.** Garmin's published Personal offering is for accessing one's own data. Its business Starter offering currently lists push-only delivery and no historical data. This product needs current-year historical activity and wellness coverage, not just new events after installation. Establish the permitted integration, available history, consent flow, limits and commercial terms before committing to a public launch date. Enterprise's listed history does not by itself guarantee the full year this app needs.

Personal-key device development may use the developer's own eligible account; that does not establish permission for distribution to other users. If the approved business API changes the retrieval model, estimate the adapter work after obtaining its actual contract. A file-import alternative is a separately scoped product decision, not silently included here.

## 8. Native screens, lifecycle and privacy

Native routes: connection/help, import progress/error, recap, share options/health consent, coverage/privacy, and settings/clear data. Keep the selected story in session state so the share sheet or a privacy screen can close back to the same card. Android Back closes a modal first; leaving a recap with unsaved in-memory data has a clear action. Do not attach competing native swipe gestures to the viewer's existing touch navigation.

Use an explicit session state machine: disconnected -> connecting -> importing -> preparing -> viewing -> clearing. Cancellation and failure return through cleanup. Every import/recap has a generation ID so stale network or export callbacks cannot revive cleared data. Preserve time-zone boundaries and test Intl behavior under the selected Hermes runtime.

Initial lifecycle policy:

- Foreground viewing: recap stays in RAM; no durable recap archive.
- Opening a native modal or backgrounding: pause renderer immediately; resume the selected story on return while the process remains alive. Check whether the WebView process survived and reinitialize from the native in-memory presentation if needed.
- Backgrounding during import: cancel rather than promise background completion; disconnect best-effort and rely on server expiry/revocation for interrupted cleanup. Return to a clear reconnect/retry state.
- Process termination/cold launch: no recap recovery is promised. Explain the need to reconnect; an optionally remembered key is distinct from stored health data.
- Clear data: abort requests, revoke/disconnect best-effort, invalidate generations, clear key and all native/DOM recap references, revoke object URLs, and delete app-owned export caches. Do not claim remote cleanup succeeded when the device was offline.

Keep explicit health-fetch consent and separate health-share consent before generating share previews/exports. Bind consent to the current recap, story and share interaction; invalidate on close, selection changes and clear-data according to the existing behavior. The native authority validates consent before requesting an export. Never serialize entire datasets, evidence, Garmin IDs, timestamps or location data to the export bridge.

For a share: generate a sanitized 1080 × 1920 PNG, write it to an app cache path, call Expo Sharing with that local URI, handle cancellation as a normal outcome, and clean up on a tested platform-appropriate schedule plus a next-launch sweep. Do not delete a file before the platform finishes consuming it. Temporary-file cleanup must not delete an image the user explicitly saved to Photos/Files. Explain that exported copies cannot be recalled.

Keep logs free of keys, bearer sessions, raw records, bridge payloads and PNG/base64 content. Disable WebView debugging in release builds. Use bundled, reviewed viewer code; block arbitrary in-view navigation and open allowed external links through the platform browser. Do not fetch/evaluate remote viewer JavaScript.

Preserve the existing readable story descriptions for screen readers. Provide one clear accessibility representation for canvas content, avoiding duplicate native/DOM announcements. Test VoiceOver, TalkBack, large text, contrast, touch targets, keyboard dismissal and system reduced-motion changes. Use a privacy cover for sensitive screens in the app switcher where supported and validated; do not claim absolute screenshot prevention across platforms.

## 9. Milestones, estimates and completion gates

Assumption: one experienced Expo/React engineer full-time, stable release-one scope, access to physical test devices and an already usable/approved Garmin integration. Estimates are engineering days, not waiting time for external services.

| Milestone | Work and concrete deliverable | Estimate | Completion gate |
| --- | --- | ---: | --- |
| M0 — Baseline and isolation | Recheck GitHub main; record source manifest, allowed paths and target devices; create app branch. | 1 day | Reviewed source SHA is explicit; working-tree changes outside `app/` are zero. |
| M1 — Device prototype | Minimal Expo native shell, bundled representative renderer, fonts, bridge, PNG transfer, context-loss and lifecycle exercise. Use synthetic fixtures and no backend. | 3–5 days | Release-like builds pass the renderer/export gates below on physical iOS and Android. |
| M2 — App foundation | Independent dependencies, Router, types, scripts, config, baseline copies, app-only build context, development/preview build profiles. | 2–3 days | App builds with sibling web directories absent; upload archive contains only reviewed app inputs. |
| M3 — Connection and import | Separate API/session handling, native consent and connection UI, import progress, cancellation, errors, SecureStore and metric-parity tests. | 5–7 days | Allowed real-account import succeeds on both OSes; incomplete/failed sources match expected omission rules. |
| M4 — Full recap viewer | Integrate all reachable designs, transitions, chrome, promotion gating, accessible descriptions, coverage view, navigation and complete lifecycle cleanup. | 4–6 days | All supported story families work; synthetic replay agrees with baseline story values/order and visual references. |
| M5 — Sharing and privacy | Colourways, health consent, 1080 × 1920 export, native share/save, cancellations, temp-file cleanup and clear-data behavior. | 3–4 days | Exports match agreed visual references; denied/revoked consent cannot export; actual receiving apps accept PNGs. |
| M6 — Device hardening and beta | Physical-device matrix, release profiling, memory/thermal checks, poor-network tests, accessibility and fixes. | 5–7 days | No unresolved release-blocking failures; performance and cleanup gates pass with recorded evidence. |
| M7 — Release preparation | Signing, app privacy/data-safety metadata, screenshots, reviewer access, mobile API deployment/rollback runbook, signed candidate builds. | 2–3 days | Reproducible signed release candidates and complete submission material; web remains unchanged. |

Total: **25–36 engineering days**, before contingency. Allow approximately **30–43 days with 20% contingency**, and budget **6–10 working weeks** for implementation. A first installable proof is expected in M1, not at the end.

This is slightly broader than the initial 5–8-week hybrid estimate: the strict web freeze requires app-owned code copies, a separate API/session path and independently verified packaging. Garmin business integration changes, substantial renderer replacement, additional languages/features and external approval waits are outside the numbers. Re-estimate after M1 and after Garmin history access is confirmed; a native-renderer rewrite replaces this estimate rather than fitting inside the contingency.

Dependencies: M1 must pass before committing to full renderer integration; M2 precedes production screens; M3 and M4 both precede M5 end-to-end validation; M6 follows integrated import/view/share; M7 requires product, Garmin and store prerequisites. Do not hide failed gates by proceeding straight to release.

## 10. Prototype and release acceptance criteria

Targets below are proposed acceptance budgets to measure during M1, not performance claims about the existing code.

Renderer/device prototype:

- Use an older supported physical iPhone and a midrange physical Android, then select and record minimum supported OS/device targets. Simulators supplement this work and do not replace it.
- Exercise sphere/globe, a dense distance/flow scene, a monthly-health layout, low-count shapes, colourways and morph transitions. Include boundary/high-count synthetic inputs within supported import limits.
- In a release-like build, ambient motion sustains approximately 30 rendered fps on agreed target devices; record frame-time distribution and longest stalls separately for transitions. Investigate repeated stalls over 100 ms rather than relying on average fps alone.
- Navigation begins visibly responding within a proposed 150 ms budget under normal load. Rendering does not block Back, cancellation or accessibility actions.
- Full-resolution PNG generation plus native file transfer completes within a proposed 3 seconds on target devices after fonts are ready. Record transfer size and peak memory. If these budgets fail, document the reason, optimization work and revised estimate before committing to the architecture.
- There are no app-induced animation frames while inactive/backgrounded. Background/resume, viewer recreation and WebGL context loss produce a recoverable view or explicit retry, never an empty permanent screen.
- A 15-minute representative viewing session and 20 consecutive export/cancel cycles show no continuing growth from leaked viewers, contexts, blobs or files. Establish an actual device memory budget from measurements rather than guessing a universal MB ceiling.
- No missing font, shader, asset, import or export dependencies when offline in a release-like binary. After an online import, the in-memory recap remains viewable/shareable offline while the process survives. A fresh import still requires Internet access.

Automated and manual verification:

| Layer | Required evidence |
| --- | --- |
| Pure domain | Existing meaningful metric assertions plus synthetic cases for duplicates/parents, time zones, completeness, missing wellness, monthly comparisons, health thresholds, floors, story admission/order and export allowlisting. Run relevant cases in native Hermes as well as Node. |
| Transport/backend | Session expiry and revocation, invalid credentials, bounds/rate limits, interrupted pagination, malformed/repeated pages, optional-source failures, cancellation and cleanup; no website cookies/origin behavior changed. |
| Bridge | Version/shape validation, stale generations, invalid IDs, oversized/export chunks, timeout/reload, repeated taps, consent denied or revoked and clear-data during in-flight export. |
| Rendering | Deterministic still-time references for each reachable design and four colourways; narrow phone, common phone and large phone layouts; fonts fully loaded; tolerance for GPU antialiasing, with human review of meaningful mismatches. |
| Native flows | Connect -> import -> recap -> share -> return, forget/reconnect, empty/partial data, airplane mode, app interruption, low-memory viewer recreation, Android Back, first-launch permission denial and settings recovery. |
| Accessibility | VoiceOver/TalkBack, large text, system reduced motion, focus on modal open/close and canvas descriptions without duplicate announcements. |
| Isolation | No changed tracked paths outside `app/`; app builds without sibling source; no runtime requests to the web app; no web deployment or secret/config changes. |

Add app-owned commands for typechecking, unit/contract tests, viewer checks, device-flow automation, baseline-hash validation and path-scope checks. Use existing test assertions where they prove behavior; do not create tests that merely restate adapter implementation. Record manual device checks that automation cannot establish.

## 11. Build, branch and release isolation

The existing `.github/workflows/deploy-cloudflare.yml` deploys the web project on **every push to `main`**, without an app-path filter. Therefore an app-only merge can redeploy the unchanged website. This plan does not edit that workflow.

Develop and initially release from a mobile branch based on verified `main`; mobile EAS builds do not require merging into `main`. No `main` push or merge is part of the planning task. If “unchanged web” also means zero web deployment executions, keep mobile releases off `main` while the workflow is unchanged. Completely preventing app-only main merges from triggering the existing workflow would require a separately authorized workflow/settings change outside the app-folder boundary. Do not pretend an `app/` file can change this trigger.

Keep signing/build configuration in `app/app.config.ts` and `app/eas.json`; keep app automation in app-owned scripts and, once verified, `app/.eas/workflows/`. Do not add a root GitHub workflow. Use separate development, preview and production app/API identities where needed. Bundle IDs, display name, signing ownership and EAS project/account are decisions to record before M7, not identifiers to invent during planning.

EAS monorepo support does not prove the upload archive is confined to the app directory. The repository includes large existing deployment archives; none should become accidental mobile build inputs. `.easignore` discovery depends on the Git/project root, so do not assume an app-local ignore file filters the whole repository.

Make `app/scripts/prepare-eas-context` create a clean allowlisted standalone build context beneath ignored `app/.build/`, containing only reviewed app source/config/assets and its own generated Git root if required by the CLI. Exclude `.env*`, `.dev.vars*`, secrets, personal fixtures, backend secret material, test screenshots with real data, sibling source and old archives. Put the context's ignore rules at its actual upload root. Inspect a real EAS archive before the first upload and demonstrate the selected CLI's project-root behavior. Normal native builds must require no source outside this context.

Begin with explicit preview/production binary builds and manual release gates. Configure automatic EAS workflows only after the app-project directory, archive boundary and trigger behavior are demonstrated. New native modules/configuration require a new binary. Release one does not automatically publish OTA changes; this also avoids inconsistency between binary-bundled DOM public assets and updated JavaScript.

The mobile API has its own deploy and rollback commands under `app/backend/`. Retain backward-compatible API versions for released binaries; app-store rollback and adoption are not immediate. TestFlight/Google Play internal testing precedes wider release. Check current platform testing/account requirements when preparing submission instead of assuming a fixed waiting period.

## 12. Production gates and remaining decisions

Resolve these in the indicated phase; they do not require changing the website:

| Decision/dependency | Default plan | Required by |
| --- | --- | --- |
| Full-year authorized Garmin access and business eligibility | Verify with Garmin; use own-data fixtures/development meanwhile. Do not promise a public release based on personal-key support. | Before public beta/date commitment |
| DOM embedding and export handoff | Expo DOM first; explicit bundled WebView if prototype evidence requires it. | End of M1 |
| Minimum devices/OS versions | Select after physical prototype and SDK compatibility checks; record exact targets. | End of M1 |
| Key/recap persistence | Remember key only with opt-in; recap/raw data stays in RAM; no background import. | M3 |
| Image saving | Share sheet required; explicit save-to-photos optional, with narrowly requested permission. | M5 |
| App name, bundle identifiers, Expo/Apple/Google ownership | Owner-controlled identities; check brand/store suitability. | Before signing setup |
| Reviewer access | Document a permitted review account or agreed fictional review mode demonstrating complete functionality. | M7 |
| Main-branch merge behavior | Retain existing web workflow; release mobile branch independently under the strict boundary. | Before any merge to main |
| Native renderer | Deferred; introduce only after measured failure/requirements and a revised estimate. | Future project |

Prepare mobile-specific privacy and support information, including temporary export files and remembered-key behavior. Do not reuse claims about browser localStorage or website cookies for the native app. Complete app-store privacy disclosures and any applicable health-app declarations from the actual mobile data flows. A hybrid renderer does not itself guarantee or prevent store acceptance; demonstrate sufficient mobile utility and follow Apple's minimum-functionality review guidance.

External prerequisites include physical test devices, Expo and store accounts, iOS signing access, backend hosting credentials and authorized Garmin integration/history. Collect these during M0/M1 so they do not appear as surprises at release. No prices or external approval durations are assumed here.

## 13. Final definition of done

- Signed iOS and Android release candidates install and run without the development server.
- Current functionality, domain rules, all reachable dot designs, colourways and sanitized exports meet the recorded parity checks.
- Real authorized imports and synthetic failure scenarios work on both platforms.
- Health consent, secret storage, temporary-file deletion, clear-data and lifecycle behavior pass the agreed checks.
- Device performance, accessibility and memory/export measurements are recorded with device/OS/build versions.
- App source, copied baseline provenance, API versioning, setup instructions, build scripts and rollback/support procedures are complete under `app/`.
- App-only builds succeed in a standalone context; no existing website files, dependencies, services, domains, secrets or workflows have been modified.
- Release decisions and unresolved external conditions are visible; a working prototype is not mislabeled as a production-ready integration.

## 14. Reference material

Repository findings above come from the pinned GitHub-main snapshot, particularly `track-record-stories/public/{app,importer,metrics,story-model,dot-engine,dot-card,dot-scene,dot-render,share-card}.mjs`, `ui/index.html`, `server/{api,garmin}.mjs`, `DOT-DESIGN.md`, the existing tests, and `.github/workflows/deploy-cloudflare.yml`.

Official documentation consulted for this plan (recheck version-sensitive details during implementation):

- [Expo DOM components](https://docs.expo.dev/guides/dom-components/) — embedding, asynchronous communication, asset paths and public-asset update limitations.
- [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) — native file sharing.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — platform secret storage behavior.
- [EAS builds in monorepos](https://docs.expo.dev/build-reference/build-with-monorepos/) — app project configuration.
- [EAS upload ignore rules](https://docs.expo.dev/build-reference/easignore/) — upload-root and archive considerations.
- [Expo Workflows](https://docs.expo.dev/eas/workflows/get-started/) — separate mobile build automation.
- [Garmin developer program overview](https://developer.garmin.com/gc-developer-program/overview/) — Personal, Starter and Enterprise capabilities/history.
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — current submission and minimum-functionality requirements.
