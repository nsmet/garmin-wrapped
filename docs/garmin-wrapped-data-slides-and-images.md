# Garmin Wrapped — complete data, slide and image specification

**Snapshot:** 28 October 2026, `main` commit `07c1b6052efa0134eca27fd7790426b0061d86e3` in [nsmet/garmin-wrapped](https://github.com/nsmet/garmin-wrapped/tree/07c1b6052efa0134eca27fd7790426b0061d86e3). This describes the GitHub implementation, not a separate verification of what is currently deployed.

**Coverage:** 89 possible recap cards; 184 template/concept cards; 50 interface/state items; every one of the 158 image-file paths in the repository. This document contains no styling recommendations.

## Reading the specification

- **Headline/title** is the exact existing card title. There is not a separate hidden marketing title.
- **Card type** identifies a metric, summary, distribution, monthly series, recorded-duration summary, ranking, or promotion.
- **Data presented** describes the fields, calculations, units and supporting counts needed to construct that card.
- **Eligibility** determines whether the card appears. Absence of a metric does not mean zero.
- **Image layers** lists the actual image keys requested by the current renderer, linked to descriptions and source/delivery image links in section 5. A card with no requested photo is explicitly identified.
- **Example values and captions** are from a fictional audit fixture created only to verify the complete screen inventory. They are neither personal data nor the shipped demo fixture. Do not hardcode those values. Use each card’s formula and field descriptions to construct real output.
- **Template/concept** means the entry can currently be viewed, but its value is `—` and its label is `DATA REQUIRED`. The intended metric is described to identify the concept; availability in the library does not mean a working calculator exists.

The same content can be shown inside the viewer, as a chapter thumbnail, and in an exported image. Viewport changes and color alternatives do not create new data cards. Exact IDs distinguish separate entries even where the themes overlap.

## 1. Data construction contract

### Sources and raw fields used by the current recap

| Source | Raw fields | Meaning / use |
| --- | --- | --- |
| Activities | `activityId` | Identity, deduplication, internal evidence and activity audit. Not included in exported cards. |
| Activities | `startTimeGMT` | UTC start timestamp; converted to the device timezone for year, month, weekday and active-day calculations. |
| Activities | `activityType.typeKey` | Mapped to one of 18 named sport families; unknown types become Other activities. Activity names do not determine sport. |
| Activities | `parentId` | A nonzero/nonempty parent marks a multisport child and excludes it from double-counted activity totals. |
| Activities | `duration` | Seconds; supports recorded hours, minutes and average activity time. |
| Activities | `distance` | Metres; supports sport km totals, average km and longest-distance rankings. |
| Activities | `averageHR`, `maxHR` | Recorded per-activity heart-rate average and maximum in BPM. |
| Daily summaries | `calendarDate`, `includesWellnessData` | Garmin calendar day and confirmation that wellness values are present. |
| Daily summaries | `movement.steps.value` | Recorded step count for that day. |
| Daily summaries | `heartRate.restingValue` | Recorded daily resting HR; Garmin may substitute daily minimum when resting value is unavailable. |
| Sleep | `calendarDate`, `sleepTimeSeconds` | Garmin calendar day and recorded nightly sleep duration. |
| HRV | `calendarDate`, `lastNightAvg`, `status` | Recorded nightly HRV average in ms; invalid status or unusable values are omitted. |

The code also normalizes some additional activity fields such as elevation, speed and power, but the current live-card generator does not thereby implement every library concept using those measurements.

### Scope, counting and validation

- The UI imports the current year using the automatically detected device timezone. There is currently no year or timezone picker.
- The real import reads all activity pages before constructing annual totals. It supports at most 20,000 activities. A repeated/incomplete page, conflicting duplicate, invalid activity data or fatal source/auth failure ends the import with a recovery state.
- Deduplicate by activity ID. Exclude multisport children, records outside the local-calendar year, and future activities. Count each retained parent activity once.
- A sport family’s session count is its number of retained activities. The sport-mix denominator is the count of all retained activities, including Other activities. Shares represent counts, not time.
- Active days are distinct local activity dates. Calendar-month grouping and weekday grouping use local activity dates. Daily wellness/sleep/HRV use Garmin’s calendar dates.
- Missing/unusable duration or distance is not zero. Omit the corresponding unsupported total. Zero is a valid recorded number but a sport hours/distance card needs a positive sum.
- Health values require usable numeric records. Activity/resting HR must be greater than 0 and at most 250 BPM. Overnight HRV must be greater than 0 and at most 1000 ms. Sleep duration must be greater than 0 and at most 86,400 seconds. Inconsistent activity average HR above max HR is not admitted as a usable pair.
- Daily records are deduplicated by calendar date; conflicting copies fail validation. Daily records after the current day or outside the selected year are excluded.
- Optional daily-wellness, sleep or HRV source failures omit affected stories and add coverage details, preserving the supported recap. Authentication/session failures remain fatal. An incomplete sleep/HRV source is discarded rather than partially summarized as complete.

### Shared calculations and presentation fields

| Card measurement | Calculation | Unit / required accompanying fields |
| --- | --- | --- |
| Sport sessions | Count retained activities in family | Sport-specific activity noun; percentage of all activities |
| Sport hours | Sum duration seconds / 3600 | Recorded hours; supporting recorded minutes = sum / 60; average duration = sum / family count |
| Sport distance | Sum distance metres / 1000 | Recorded kilometres; mean km per activity; contributing activity count |
| Sport weekday | Count family activities for each local weekday; require unique highest count | Winning weekday; Monday–Sunday counts; winner count / family count; timezone |
| Sport longest | Maximum eligible family distance / 1000 | Longest recorded km; descending top 2 or 3 distances; activity count |
| Step total | Sum actual recorded daily steps | Steps; contributing recorded-day count |
| Step peak | Maximum actual recorded daily steps | Steps in one recorded day; contributing-day count; current card does not display the peak date |
| Sleep | Median recorded nightly duration | Round median duration to whole minutes and show hours/minutes; contributing-night count |
| Activity peak HR | Maximum usable per-activity `maxHR` | BPM; contributing activity count out of total |
| Activity average HR | Arithmetic mean of usable per-activity `averageHR` | BPM; contributing count out of total; equal activity weights, not duration-weighted |
| Activity monthly HR | Per-month arithmetic mean of usable per-activity averages | BPM; month state; contributing activity count; missing months remain gaps |
| Resting HR | Arithmetic mean of usable daily resting values | BPM; contributing recorded-day count |
| Resting monthly HR | Per-month mean of usable daily resting values | BPM; month state and contributing days; ≥10 days per displayed month |
| Overnight HRV | Median of recorded nightly `lastNightAvg` values | ms; contributing-night count; no diagnostic interpretation |
| Monthly HRV | Per-month median of recorded nightly averages | ms; month state and contributing nights; ≥10 nights per displayed month |

Numbers generally display at most one decimal. Sport hours and km use one decimal. Average activity time is rounded once to seconds, then formatted as minutes/seconds or hours/minutes/seconds with carry-over handled correctly.

### Card object and chart payloads

The content consumed by the card renderer consists of `id`, `template`, `title` (array of headline lines), `value` (display string), `unit`, `caption`, optional `chart`, optional `presentation`, and template-identifying fields where relevant. The verification plan also contains eligibility/evidence/status fields; those internal references are not exported as personal-card content.

| Payload `chart.kind` | Required content |
| --- | --- |
| No chart | Metric/title/unit/caption; image keys from the card’s template |
| `summary` | Up to four items with `label`, formatted `value`, `unit`: activities, optional recorded minutes, active days, sport families |
| `sport-mix` | `total`; items with sport `key`, `label`, activity `value`; values sum to total; percentage derived from value / total |
| `months` | `measure` = minutes or sessions; `compare`; 12 items with month `label`, numeric/null `value`, activity `sessions`, `state` = complete/partial/current/future |
| `duration` | Two supporting items with labels/values: RECORDED MINUTES and AVG TIME / ACTIVITY; hero value is recorded hours |
| `record` | Up to three ranked items with labels 01/02/03 and numeric distance values in km |
| `weekdays` | Seven named weekdays and their activity counts; hero value is the unique winning weekday |
| `health-months` | `measure` = activityHR/restingHR/hrv; `compare`; 12 items with month `label`, numeric/null `value`, contributing `count`, and month `state` |

Year-calendar peak/quietest comparisons use completed months only and preserve ties. Unknown/future months are distinct from known zero-activity months. If any annual activity duration is missing, the calendar measure changes from minutes to session counts. A partial-index plan suppresses annual rankings.

Activity/resting-HR monthly comparisons can highlight the highest and lowest displayed averages, preserving ties at displayed precision and marking the current month as so far. Activity HR may show one month. Resting-HR/HRV monthly cards need 30 usable days/nights overall and at least two months meeting the 10-per-month threshold. HRV uses medians and does not enable high/low ranking. Missing months are not connected as continuous measurements.

### Dynamic captions for sport-card types

`[qualifier]` is empty for a complete historical-year plan, ` · so far` for a complete current-year plan, or ` · imported records` for a partial-index plan. The current UI normally imports the current year with a complete activity index.

| Type | Caption content |
| --- | --- |
| Sessions | `[count] [sport noun] in your recorded year[qualifier].` / `[percentage]% of all recorded activities.` |
| Hours | `[minutes] recorded minutes of [sport label].` / `[average duration] per activity, on average.` |
| Distance | `[average km] km per run/ride/activity, on average.` / `Total distance across [count] recorded activities.` |
| Weekday | `[winner count] of [count] [sport noun] fell on [weekday].` / `Activity dates use [timezone].` |
| Longest | `The longest distance among [count] recorded [sport noun].` / `Your two/three longest distances, side by side.` |

### Availability, provenance and export behavior

- A person receives only supported cards; 89 is the full set of possible card identities, not a fixed recap length.
- A normal recap requires at least one admitted activity. Source/sample counts describe what was recorded, not every activity or night a person performed.
- Recorded, fictional-demo and template data must remain distinguishable in the content labels. Data is cleared on refresh/closing the tab; a deep link is not a persisted private recap.
- Sleep/HR/HRV cards need per-card consent for real-data export. Step cards currently do not have the health flag. Consent is not carried to another card or retained after closing the picker.
- The exported card contains display data and approved caption/notice only, excluding raw Garmin IDs, evidence references, precise locations and private activity-audit details. MINI WATT promotion is not exportable as a personal data card.

## 2. All interface and state coverage items

These 50 entries include screens, dialog modes, motion/control variants, errors, disclosures, feedback and the output surface. They are not 50 independent URL routes. In a shared dialog, use the same shell and design its content/state variants.

### UI-01 · `intro-effort` — YOUR GARMIN WRAPPED.

- **Type:** Intro scene.
- **Trigger/condition:** Normal-motion initial visit without a story hash.
- **Data/content/controls:** Skip intro; branding; shared shoe/track artwork.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L81).

### UI-02 · `intro-year` — YOUR [YEAR] SPORT YEAR.

- **Type:** Intro scene.
- **Trigger/condition:** Second scene of the optional intro.
- **Data/content/controls:** Current year; sport-year heading; skip intro.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L86).

### UI-03 · `intro-handoff` — Intro → landing handoff

- **Type:** Transition state.
- **Trigger/condition:** End of intro; skipped entirely for reduced motion or story deep links.
- **Data/content/controls:** Artwork settles into the landing poster; landing copy reveals.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/entry-intro.js#L28).

### UI-04 · `connect-default` — Make it yours / connect landing

- **Type:** Screen.
- **Trigger/condition:** Initial landing after intro; also /#connect.
- **Data/content/controls:** API-key field; Show/Hide; key help; build recap; demo; privacy; animated poster; FAQ.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L99).

### UI-05 · `connect-key-visible` — API key revealed

- **Type:** Field state.
- **Trigger/condition:** Show/Hide button.
- **Data/content/controls:** Same connection form with visible key and Hide action.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L46).

### UI-06 · `connect-key-error` — Missing-key validation

- **Type:** Error state.
- **Trigger/condition:** Submit an empty or whitespace key.
- **Data/content/controls:** Inline alert and invalid key field; focus returns to key.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L42).

### UI-07 · `connect-reconnect` — Reconnect after reload / deep link

- **Type:** Recovery state.
- **Trigger/condition:** Visit with any hash other than #connect before loading a recap.
- **Data/content/controls:** Notice that the private recap was cleared; reconnect or explicitly choose demo.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L56).

### UI-08 · `connect-cleared` — Data cleared / disconnected

- **Type:** Return state.
- **Trigger/condition:** Clear my data & start again; Clear my data & disconnect; cancel import; return from real-import failure.
- **Data/content/controls:** Returns to connection form. No separate success page or confirmation modal.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L17).

### UI-09 · `connect-still` — Landing with motion paused / reduced

- **Type:** Motion state.
- **Trigger/condition:** Pause homepage animation or OS reduced motion.
- **Data/content/controls:** Still poster; play control or disabled motion control. Reduced motion skips the intro.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L6).

### UI-10 · `connect-about` — A little more info / FAQ expanded

- **Type:** Disclosure state.
- **Trigger/condition:** Expand footer details.
- **Data/content/controls:** What is Garmin Wrapped; year-to-date recap; local/server processing disclosures, each expandable.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L141).

### UI-11 · `connect-no-js` — JavaScript disabled notice

- **Type:** Fallback state.
- **Trigger/condition:** JavaScript disabled.
- **Data/content/controls:** Connection landing with enable-JavaScript message; recap cannot run.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L118).

### UI-12 · `key-help` — Your key. Your start line.

- **Type:** Dialog.
- **Trigger/condition:** Where do I find my key?
- **Data/content/controls:** Three steps; Garmin key link; official FAQ link; demo button; close.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L152).

### UI-13 · `key-help-troubleshooting` — Lost, expired or deleted key help

- **Type:** Disclosure state.
- **Trigger/condition:** Expand troubleshooting in key-help dialog.
- **Data/content/controls:** Replacement-key instructions. Garmin account/key creation itself is external.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L161).

### UI-14 · `loading-demo` — Demo loading

- **Type:** Screen state.
- **Trigger/condition:** Choose the fictional demo.
- **Data/content/controls:** Getting the example ready; fictional-data label; Back; pause motion.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L26).

### UI-15 · `loading-connect` — Connecting to Garmin

- **Type:** Screen state.
- **Trigger/condition:** Submit a key.
- **Data/content/controls:** Connecting securely to Garmin; private-session label; Back; pause motion.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L26).

### UI-16 · `loading-activities` — Reading activity records

- **Type:** Progress state.
- **Trigger/condition:** Import activity pages.
- **Data/content/controls:** Number of activity records received.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/importer.mjs#L14).

### UI-17 · `loading-wellness` — Reading daily summaries

- **Type:** Progress state.
- **Trigger/condition:** Import daily movement/wellness.
- **Data/content/controls:** Daily-summary progress message.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/importer.mjs#L24).

### UI-18 · `loading-sleep` — Reading sleep history

- **Type:** Progress state.
- **Trigger/condition:** Import monthly sleep data.
- **Data/content/controls:** Current month / total months.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/importer.mjs#L31).

### UI-19 · `loading-hrv` — Reading HRV history

- **Type:** Progress state.
- **Trigger/condition:** Import monthly HRV data.
- **Data/content/controls:** Current month / total months.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/importer.mjs#L35).

### UI-20 · `loading-build` — Checking coverage / building recap

- **Type:** Progress state.
- **Trigger/condition:** Finish source import.
- **Data/content/controls:** Checking coverage and building your story.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/importer.mjs#L40).

### UI-21 · `loading-paused` — Loading with motion paused / reduced

- **Type:** Motion state.
- **Trigger/condition:** Pause motion or OS preference.
- **Data/content/controls:** Same ongoing import with still artwork; Play motion or disabled Reduced motion control.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L6).

### UI-22 · `loading-real-error` — Real import failed / reconnect

- **Type:** Error state.
- **Trigger/condition:** Invalid/expired key or session; network/API/TLS failure; configuration/access/rate-limit error; malformed/repeated/oversized activity data.
- **Data/content/controls:** Shared loading-failed layout with returned message; Back and Return & reconnect. These error messages are variants of one layout.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L37).

### UI-23 · `loading-timeout` — Import timed out

- **Type:** Error state.
- **Trigger/condition:** Five-minute import deadline.
- **Data/content/controls:** No recap saved; return and reconnect.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L36).

### UI-24 · `loading-empty` — No supported activities this year

- **Type:** Empty/error state.
- **Trigger/condition:** Import has no eligible activities.
- **Data/content/controls:** Same loading-failed screen; Return & reconnect. Code copy says choose another year, but no year picker exists in the current UI.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L194).

### UI-25 · `loading-demo-error` — Demo failed / retry

- **Type:** Error state.
- **Trigger/condition:** Demo data/module/assets preparation fails.
- **Data/content/controls:** Shared failure layout with Try the demo again.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs#L37).

### UI-26 · `viewer-recorded` — Recorded recap viewer

- **Type:** Shared shell.
- **Trigger/condition:** Successful real import.
- **Data/content/controls:** Canvas story; header/edition; progress; chapter label; caption; previous/next; pause; share; story-menu button. 89 possible story contents listed separately.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L166).

### UI-27 · `viewer-demo` — Fictional demo viewer

- **Type:** Data-mode state.
- **Trigger/condition:** Explicitly choose demo.
- **Data/content/controls:** Same planner/renderer with FICTIONAL DATA and DEMO labeling. Demo is not 89 additional screen designs.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L28).

### UI-28 · `viewer-template` — Design-template viewer

- **Type:** Data-mode state.
- **Trigger/condition:** Choose an entry from All 184 design templates.
- **Data/content/controls:** Template title; dash metric; DATA REQUIRED; TEMPLATE · NO PERSONAL DATA; DESIGN LIBRARY edition.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L4).

### UI-29 · `viewer-navigation` — First / middle / last story controls

- **Type:** Navigation states.
- **Trigger/condition:** Story position changes.
- **Data/content/controls:** First disables Back; last changes Share/Next to Choose a card. Without cycling the last card is finale; with cycling it is MINI WATT.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L32).

### UI-30 · `viewer-motion` — Playing / paused / still / transitioning

- **Type:** Motion states.
- **Trigger/condition:** Pause, OS reduced motion, or move between stories.
- **Data/content/controls:** Play/Pause or disabled Still; incoming/outgoing artwork transition. Keyboard arrows and touch swipes navigate.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L34).

### UI-31 · `chapters-recap` — Every chapter / recorded year

- **Type:** Dialog mode.
- **Trigger/condition:** Open story menu.
- **Data/content/controls:** Recorded recap thumbnails; search; collection selector; count; Show more in batches of 12; privacy/coverage and clear/start-again actions.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L67).

### UI-32 · `chapters-demo` — Every chapter / example recap

- **Type:** Dialog mode.
- **Trigger/condition:** Open story menu during demo.
- **Data/content/controls:** Same grid with example-recap and fictional-story labels.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L72).

### UI-33 · `chapters-library` — All 184 design templates

- **Type:** Dialog mode.
- **Trigger/condition:** Choose library collection.
- **Data/content/controls:** Template thumbnails; sport/health category dropdown; search; count; Show more. Category contents are all enumerated below.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L10).

### UI-34 · `chapters-search` — Filtered / zero-result story grid

- **Type:** Filter states.
- **Trigger/condition:** Search or choose a library category.
- **Data/content/controls:** Grid results and count update; zero results leave an empty grid. No separate custom empty-state illustration is implemented.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L70).

### UI-35 · `chapters-library-error` — Design library unavailable

- **Type:** Error state.
- **Trigger/condition:** Catalog JSON cannot load.
- **Data/content/controls:** The design library could not load. Try again.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L69).

### UI-36 · `privacy-landing` — Your data. Your call.

- **Type:** Dialog mode.
- **Trigger/condition:** Data & privacy from connection landing.
- **Data/content/controls:** Privacy text and clear/disconnect action; no recorded activity breakdown.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L196).

### UI-37 · `privacy-demo` — Demo privacy / no Garmin account

- **Type:** Dialog mode.
- **Trigger/condition:** Activity breakdown, coverage & privacy during demo.
- **Data/content/controls:** Fictional-demo explanation.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L207).

### UI-38 · `privacy-recorded` — Recorded coverage and activity breakdown

- **Type:** Dialog mode.
- **Trigger/condition:** Activity breakdown, coverage & privacy during real recap.
- **Data/content/controls:** Import notice; timezone; story count; warnings if present; counted/returned activities; sport accordions; exclusions.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L205).

### UI-39 · `privacy-source-warning` — Missing sources / measurements / unknown types

- **Type:** Content states.
- **Trigger/condition:** Wellness, sleep, HRV unavailable; insufficient coverage; unrecognized activity types; omitted duration/distance.
- **Data/content/controls:** Coverage warning list inside privacy dialog. Optional-source failure preserves supported recap; no extra modal or warning banner on each story.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L208).

### UI-40 · `activity-breakdown-expanded` — Sport activity details expanded

- **Type:** Disclosure state.
- **Trigger/condition:** Expand an activity-audit sport.
- **Data/content/controls:** Exact Garmin type counts and activity dates/duration/distance; links to Garmin; Show more activities in batches of 100. External Garmin activity details are not in-app screens.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/activity-audit.mjs#L4).

### UI-41 · `health-consent` — Share this health card?

- **Type:** Dialog.
- **Trigger/condition:** Export a real sleep, HR or HRV card.
- **Data/content/controls:** Selected card description; Keep it private; Allow this card’s export. Reopens when consent expires. Step cards currently do not carry the health flag.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L101).

### UI-42 · `health-consent-cancel` — Health export declined

- **Type:** Return state.
- **Trigger/condition:** Keep it private or dismiss consent.
- **Data/content/controls:** Returns to previous viewer or existing share selection; no standalone declined page.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L141).

### UI-43 · `share-ready` — Your year. Your pick.

- **Type:** Dialog.
- **Trigger/condition:** Share a non-health card, confirm health export, or choose a card from the final slide.
- **Data/content/controls:** 1080×1920 preview; eligible-card chooser; selected state; five colors; Download PNG; native share when supported. Library exports offer only the selected template.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html#L184).

### UI-44 · `share-rendering` — Making your card…

- **Type:** Loading state.
- **Trigger/condition:** Open share or change selected card/color.
- **Data/content/controls:** Busy preview and disabled download until PNG ready.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L156).

### UI-45 · `share-colors` — Original / Paper / Cobalt / Orange / Mint

- **Type:** Five color states.
- **Trigger/condition:** Choose export colorway.
- **Data/content/controls:** One preview layout with five palettes; preserve metric/chart and selected-card controls.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/share-card.mjs#L3).

### UI-46 · `share-render-error` — Card could not be created

- **Type:** Error state.
- **Trigger/condition:** PNG rendering/encoding fails.
- **Data/content/controls:** Inline creation error; choose another card or color to retry.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L167).

### UI-47 · `share-native` — Native sharing available / unavailable

- **Type:** Capability states.
- **Trigger/condition:** Browser can share files, or native share errors.
- **Data/content/controls:** Share to another app button appears only when supported. On non-abort failure an inline message offers PNG download. OS share sheet is external/system UI.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L172).

### UI-48 · `share-download` — Download ready feedback

- **Type:** Toast state.
- **Trigger/condition:** Download PNG.
- **Data/content/controls:** Your card is ready to save. No standalone download-success page.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L171).

### UI-49 · `asset-load-failure` — Artwork could not load

- **Type:** Toast state.
- **Trigger/condition:** Image fails to load.
- **Data/content/controls:** An image could not load. The story remains available.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs#L18).

### UI-50 · `export-artifact` — Exported portrait story card

- **Type:** Output surface.
- **Trigger/condition:** Download any eligible recap or template card.
- **Data/content/controls:** 1080×1920 PNG; branding/year, chart or metric, caption and provenance label; no viewer navigation controls. 88 data cards and 184 templates support export; MINI WATT promotional slide does not.
- **Source:** [implementation](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/share-card.mjs#L11).

### Exact main interface copy

| Surface | Headline / title | Main fields and actions |
| --- | --- | --- |
| Intro 1 | YOUR GARMIN / WRAPPED. | EVERY EFFORT. ALL YOURS.; A little perspective on a lot of effort.; Skip intro |
| Intro 2 | YOUR / [YEAR] / SPORT YEAR. | THE EARLY STARTS. THE EXTRA MILES.; All that movement. One story. Yours. |
| Connection | MAKE IT / YOURS. | Your sports. Your highlights. Your year in colour.; GARMIN PERSONAL API KEY; Paste your key here; Show/Hide; Where do I find my key?; Build my Garmin recap; Just looking? Try the demo |
| Landing poster | YOUR YEAR. / WRAPPED. | YOUR GARMIN CONNECT YEAR IN REVIEW; MADE OF MOVEMENT; RUN. RIDE. RELIVE IT. |
| Loading / failures | GOOD THINGS / TAKE MOTION. | Dynamic loading or error status; Back; Pause motion; failure retry / reconnect action |
| API-key help | YOUR KEY. / YOUR START LINE. | Open Garmin’s key page; 3 numbered steps; lost-key disclosure; Try the demo; close |
| Story menu | EVERY CHAPTER. | THE WHOLE PICTURE; collection selector; library category selector; Find a story…; grid; Show more stories; Clear my data & start again; Activity breakdown, coverage & privacy |
| Privacy / coverage | YOUR DATA. / YOUR CALL. | Privacy copy; recorded/demo coverage; warning list if any; sport accordions; Clear my data & disconnect; close |
| Health consent | SHARE THIS / HEALTH CARD? | Selected card metric/caption; Keep it private; Allow this card’s export |
| Share picker | YOUR YEAR. / YOUR PICK. | TAKE IT WITH YOU; CHOOSE A CARD; MAKE IT YOURS; preview; color selector; Download PNG; optional Share to another app; close |

Privacy copy is long-form and should remain readable/scrollable. The activity audit opens per-sport lists in batches of 100. Story grids load in batches of 12. A failed library request shows an inline message; zero search results leave an empty grid in the current implementation. Optional-source import failures appear in coverage details while supported stories remain available.

## 3. All 89 implemented conditional recap cards

### Year Overview (4)

#### CARD-001 · `cover`

- **Headline/title:** YOUR YEAR IN MOTION.
- **Data presented:** Year as hero value; number of recorded activities; distinct active days. Caption introduces the recap.
- **Card type:** `year introduction`.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon)
- **Eligibility:** At least one eligible recorded activity. Year summary/finale omit unavailable duration; calendar falls back from minutes to sessions.
- **Fictional data example:** `2026`; unit/context: `YOUR RECORDED EFFORT`.
- **Example caption:** 152 activities. 8 active days · so far. / The numbers. The sports. The standout moments.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L88); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-002 · `year-summary`

- **Headline/title:** THE WHOLE YEAR, IN VIEW.
- **Data presented:** Recorded activity count; total recorded minutes with hours as supporting unit when every activity has duration; distinct active days; number of sport families. Two-by-two summary grid.
- **Card type:** `summary`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** At least one eligible recorded activity. Year summary/finale omit unavailable duration; calendar falls back from minutes to sessions.
- **Fictional data example:** `152`; unit/context: `RECORDED ACTIVITIES · so far`.
- **Example caption:** 8 days with recorded activity · so far. / 9,652 recorded minutes across 19 sport families.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L89); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-003 · `sport-mix`

- **Headline/title:** YOUR YEAR. YOUR SPORTS.
- **Data presented:** Total activity count; every sport family’s activity count and rounded percentage. Donut chart plus complete legend. Shares count activities, not duration. Preserve tied leaders.
- **Card type:** `sport-mix`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** At least one eligible recorded activity. Year summary/finale omit unavailable duration; calendar falls back from minutes to sessions.
- **Fictional data example:** `152`; unit/context: `ACTIVITIES BY SPORT · so far`.
- **Example caption:** 19 sport families share the lead. / Each slice counts activities, not time.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L91); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-004 · `year-calendar`

- **Headline/title:** EVERY MONTH, A DIFFERENT PACE.
- **Data presented:** 12 month cells with recorded minutes and activity count, or session-count fallback if duration coverage is incomplete. Current/future/unknown states; peak and quietest completed-month values including ties.
- **Card type:** `months`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** At least one eligible recorded activity. Year summary/finale omit unavailable duration; calendar falls back from minutes to sessions.
- **Fictional data example:** `2026`; unit/context: `MONTHLY RECORDED MINUTES · so far`.
- **Example caption:** Recorded minutes. Darker means more. / Peak and quietest compare completed months only.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L100); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Running (5)

#### CARD-005 · `running-sessions`

- **Headline/title:** RUNS, ON REPEAT.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED RUNS · so far`.
- **Example caption:** 8 runs in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-006 · `running-hours`

- **Headline/title:** HOURS IN YOUR STRIDE.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of running. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-007 · `running-distance`

- **Headline/title:** A YEAR, ON FOOT.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per run, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-008 · `running-weekday`

- **Headline/title:** YOUR RUNNING DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED RUNNING DAY · so far`.
- **Example caption:** 8 of 8 runs fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-009 · `running-longest`

- **Headline/title:** YOUR LONGEST RUN.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded runs. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Cycling (5)

#### CARD-010 · `cycling-sessions`

- **Headline/title:** BACK IN THE SADDLE.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED RIDES · so far`.
- **Example caption:** 8 rides in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-011 · `cycling-hours`

- **Headline/title:** HOURS IN THE SADDLE.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of cycling. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-012 · `cycling-distance`

- **Headline/title:** THE KILOMETRES ROLLED.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per ride, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-013 · `cycling-weekday`

- **Headline/title:** YOUR RIDE DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED CYCLING DAY · so far`.
- **Example caption:** 8 of 8 rides fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-014 · `cycling-longest`

- **Headline/title:** YOUR LONGEST RIDE.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded rides. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Hiit (3)

#### CARD-015 · `hiit-sessions`

- **Headline/title:** INTERVALS. ON REPEAT.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED HIIT SESSIONS · so far`.
- **Example caption:** 8 HIIT sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-016 · `hiit-hours`

- **Headline/title:** THE INTERVAL HOURS.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of hiit. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-017 · `hiit-weekday`

- **Headline/title:** YOUR HIIT DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED HIIT DAY · so far`.
- **Example caption:** 8 of 8 HIIT sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Strength (3)

#### CARD-018 · `strength-sessions`

- **Headline/title:** A YEAR UNDER LOAD.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED STRENGTH SESSIONS · so far`.
- **Example caption:** 8 strength sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-019 · `strength-hours`

- **Headline/title:** HOURS ON THE TRAINING FLOOR.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of strength training. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-020 · `strength-weekday`

- **Headline/title:** YOUR LIFTING DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED STRENGTH TRAINING DAY · so far`.
- **Example caption:** 8 of 8 strength sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Walking (5)

#### CARD-021 · `walking-sessions`

- **Headline/title:** WALKS WORTH COUNTING.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED WALKS · so far`.
- **Example caption:** 8 walks in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-022 · `walking-hours`

- **Headline/title:** TIME ON YOUR FEET.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of walking. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-023 · `walking-distance`

- **Headline/title:** YOUR WALKING FOOTPRINT.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per activity, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-024 · `walking-weekday`

- **Headline/title:** YOUR WALKING DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED WALKING DAY · so far`.
- **Example caption:** 8 of 8 walks fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-025 · `walking-longest`

- **Headline/title:** YOUR LONGEST WALK.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded walks. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Hiking (5)

#### CARD-026 · `hiking-sessions`

- **Headline/title:** THE HIKING CHAPTER.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED HIKES · so far`.
- **Example caption:** 8 hikes in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-027 · `hiking-hours`

- **Headline/title:** HOURS ON THE TRAIL.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of hiking. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-028 · `hiking-distance`

- **Headline/title:** THE TRAIL ADDS UP.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per activity, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-029 · `hiking-weekday`

- **Headline/title:** YOUR HIKING DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED HIKING DAY · so far`.
- **Example caption:** 8 of 8 hikes fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-030 · `hiking-longest`

- **Headline/title:** YOUR LONGEST HIKE.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded hikes. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Swimming (5)

#### CARD-031 · `swimming-sessions`

- **Headline/title:** BACK TO THE WATER.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED SWIMS · so far`.
- **Example caption:** 8 swims in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-032 · `swimming-hours`

- **Headline/title:** HOURS IN THE WATER.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of swimming. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-033 · `swimming-distance`

- **Headline/title:** YOUR YEAR IN THE WATER.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per activity, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-034 · `swimming-weekday`

- **Headline/title:** YOUR SWIMMING DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED SWIMMING DAY · so far`.
- **Example caption:** 8 of 8 swims fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-035 · `swimming-longest`

- **Headline/title:** YOUR LONGEST SWIM.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded swims. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Rowing (5)

#### CARD-036 · `rowing-sessions`

- **Headline/title:** RETURN TO THE ROW.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED ROWING SESSIONS · so far`.
- **Example caption:** 8 rowing sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-037 · `rowing-hours`

- **Headline/title:** HOURS AT THE OARS.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of rowing. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-038 · `rowing-distance`

- **Headline/title:** THE ROWING DISTANCE.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per activity, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-039 · `rowing-weekday`

- **Headline/title:** YOUR ROWING DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED ROWING DAY · so far`.
- **Example caption:** 8 of 8 rowing sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-040 · `rowing-longest`

- **Headline/title:** YOUR LONGEST ROW.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded rowing sessions. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Yoga (3)

#### CARD-041 · `yoga-sessions`

- **Headline/title:** ROOM FOR THE MAT.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED YOGA PRACTICES · so far`.
- **Example caption:** 8 yoga practices in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-042 · `yoga-hours`

- **Headline/title:** HOURS ON THE MAT.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of yoga. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-043 · `yoga-weekday`

- **Headline/title:** YOUR YOGA DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED YOGA DAY · so far`.
- **Example caption:** 8 of 8 yoga practices fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Pilates (3)

#### CARD-044 · `pilates-sessions`

- **Headline/title:** PILATES IN PRACTICE.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED PILATES SESSIONS · so far`.
- **Example caption:** 8 Pilates sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-045 · `pilates-hours`

- **Headline/title:** HOURS OF PILATES.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of pilates. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-046 · `pilates-weekday`

- **Headline/title:** YOUR PILATES DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED PILATES DAY · so far`.
- **Example caption:** 8 of 8 Pilates sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Elliptical (3)

#### CARD-047 · `elliptical-sessions`

- **Headline/title:** ANOTHER TURN.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED ELLIPTICAL SESSIONS · so far`.
- **Example caption:** 8 elliptical sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-048 · `elliptical-hours`

- **Headline/title:** HOURS IN THE ELLIPSE.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of elliptical. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-049 · `elliptical-weekday`

- **Headline/title:** YOUR ELLIPTICAL DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED ELLIPTICAL DAY · so far`.
- **Example caption:** 8 of 8 elliptical sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Skiing (5)

#### CARD-050 · `skiing-sessions`

- **Headline/title:** A SEASON ON SNOW.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED SNOW-SPORT SESSIONS · so far`.
- **Example caption:** 8 snow-sport sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-051 · `skiing-hours`

- **Headline/title:** HOURS ON SNOW.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of skiing & snowboarding. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-052 · `skiing-distance`

- **Headline/title:** DISTANCE ON SNOW.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per activity, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-053 · `skiing-weekday`

- **Headline/title:** YOUR SNOW DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED SKIING & SNOWBOARDING DAY · so far`.
- **Example caption:** 8 of 8 snow-sport sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-054 · `skiing-longest`

- **Headline/title:** YOUR LONGEST SNOW SESSION.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded snow-sport sessions. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Golf (3)

#### CARD-055 · `golf-sessions`

- **Headline/title:** ROUNDS ON RECORD.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED GOLF ACTIVITIES · so far`.
- **Example caption:** 8 golf activities in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-056 · `golf-hours`

- **Headline/title:** HOURS ON THE COURSE.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of golf. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-057 · `golf-weekday`

- **Headline/title:** YOUR GOLF DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED GOLF DAY · so far`.
- **Example caption:** 8 of 8 golf activities fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Racket (3)

#### CARD-058 · `racket-sessions`

- **Headline/title:** BACK ON COURT.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED RACKET-SPORT SESSIONS · so far`.
- **Example caption:** 8 racket-sport sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-059 · `racket-hours`

- **Headline/title:** HOURS ON COURT.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of racket sports. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-060 · `racket-weekday`

- **Headline/title:** YOUR COURT DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED RACKET SPORTS DAY · so far`.
- **Example caption:** 8 of 8 racket-sport sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Triathlon (5)

#### CARD-061 · `triathlon-sessions`

- **Headline/title:** MORE THAN ONE DISCIPLINE.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED MULTISPORT ACTIVITIES · so far`.
- **Example caption:** 8 multisport activities in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-062 · `triathlon-hours`

- **Headline/title:** HOURS ACROSS DISCIPLINES.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of triathlon / multisport. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-063 · `triathlon-distance`

- **Headline/title:** YOUR MULTISPORT DISTANCE.
- **Data presented:** Sum of valid distance in metres ÷ 1000 as recorded km (one decimal); average km per activity; number of contributing sport activities.
- **Card type:** `distance aggregate`.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Eligibility:** Every activity in this distance-supported sport has usable distance; positive total.
- **Fictional data example:** `108.0`; unit/context: `RECORDED KILOMETRES · so far`.
- **Example caption:** 13.5 km per activity, on average. / Total distance across 8 recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-064 · `triathlon-weekday`

- **Headline/title:** YOUR MULTISPORT DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED TRIATHLON / MULTISPORT DAY · so far`.
- **Example caption:** 8 of 8 multisport activities fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-065 · `triathlon-longest`

- **Headline/title:** YOUR LONGEST MULTISPORT ACTIVITY.
- **Data presented:** Maximum recorded sport distance in km (one decimal); ranked top two or three distance bars; number of eligible sport activities. A longest recorded activity claim, not a certified personal record.
- **Card type:** `record`.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Eligibility:** At least 2 activities; complete activity index; usable distance in every family record; positive maximum.
- **Fictional data example:** `17.0`; unit/context: `KM · LONGEST RECORDED · so far`.
- **Example caption:** The longest distance among 8 recorded multisport activities. / Your three longest distances, side by side.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Team Sports (3)

#### CARD-066 · `team_sports-sessions`

- **Headline/title:** PART OF THE TEAM.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED TEAM-SPORT ACTIVITIES · so far`.
- **Example caption:** 8 team-sport activities in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-067 · `team_sports-hours`

- **Headline/title:** HOURS IN THE GAME.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of team sports. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-068 · `team_sports-weekday`

- **Headline/title:** YOUR TEAM-SPORT DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED TEAM SPORTS DAY · so far`.
- **Example caption:** 8 of 8 team-sport activities fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Climbing (3)

#### CARD-069 · `climbing-sessions`

- **Headline/title:** BACK TO THE WALL.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED CLIMBING SESSIONS · so far`.
- **Example caption:** 8 climbing sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-070 · `climbing-hours`

- **Headline/title:** HOURS AT THE WALL.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of climbing & bouldering. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-071 · `climbing-weekday`

- **Headline/title:** YOUR CLIMBING DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED CLIMBING & BOULDERING DAY · so far`.
- **Example caption:** 8 of 8 climbing sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Cardio (3)

#### CARD-072 · `cardio-sessions`

- **Headline/title:** CARDIO ON THE CALENDAR.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED CARDIO SESSIONS · so far`.
- **Example caption:** 8 cardio sessions in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-073 · `cardio-hours`

- **Headline/title:** HOURS OF CARDIO.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of cardio & fitness. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-074 · `cardio-weekday`

- **Headline/title:** YOUR CARDIO DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED CARDIO & FITNESS DAY · so far`.
- **Example caption:** 8 of 8 cardio sessions fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Other (3)

#### CARD-075 · `other-sessions`

- **Headline/title:** THE REST OF YOUR REPERTOIRE.
- **Data presented:** Number of activities in this sport family; rounded percentage of all recorded activities. Main value is a session/round/activity count with the sport-specific noun.
- **Card type:** `sport activity count`.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Eligibility:** At least one activity in this sport family.
- **Fictional data example:** `8`; unit/context: `RECORDED OTHER ACTIVITIES · so far`.
- **Example caption:** 8 other activities in your recorded year · so far. / 5.3% of all recorded activities.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-076 · `other-hours`

- **Headline/title:** HOURS BEYOND THE USUAL.
- **Data presented:** Sum of duration in seconds ÷ 3600 (one decimal) as recorded hours; sum ÷ 60 as recorded minutes; mean duration per activity formatted h/m/s. Sport-specific time-poster composition; decorative geometry is not measured intervals or splits.
- **Card type:** `duration`.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Eligibility:** Every activity in this sport family has usable duration; positive total.
- **Fictional data example:** `8.5`; unit/context: `RECORDED HOURS · so far`.
- **Example caption:** 508 recorded minutes of other activities. / 1h 03m 30s per activity, on average.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-077 · `other-weekday`

- **Headline/title:** YOUR ACTIVITY DAY.
- **Data presented:** Unique most frequent weekday as hero text; counts for Monday–Sunday as seven bars; leading-day count out of all sport sessions; device timezone in caption.
- **Card type:** `weekdays`.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Eligibility:** At least 8 activities in the family and one uniquely most frequent weekday.
- **Fictional data example:** `MONDAY`; unit/context: `MOST RECORDED OTHER ACTIVITIES DAY · so far`.
- **Example caption:** 8 of 8 other activities fell on Monday. / Activity dates use Europe/Brussels.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L101); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Everyday Movement (2)

#### CARD-078 · `steps-total`

- **Headline/title:** SMALL STEPS. BIG PICTURE.
- **Data presented:** Sum of steps across actual recorded days; number of days with step records. Missing days are omitted, not zero-filled.
- **Card type:** `single metric`.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Eligibility:** At least one usable recorded step day, plus an activity-backed recap.
- **Fictional data example:** `481,770`; unit/context: `STEPS · 60 RECORDED DAYS`.
- **Example caption:** Steps from recorded days only. / Missing days are never zero.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L126); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-079 · `steps-peak`

- **Headline/title:** YOUR BIGGEST RECORDED STEP DAY.
- **Data presented:** Largest step value among recorded days; number of days contributing. The current card does not display the peak date.
- **Card type:** `single metric`.
- **Image layers:** [stairs](#image-stairs)
- **Eligibility:** At least one usable recorded step day, plus an activity-backed recap.
- **Fictional data example:** `8,059`; unit/context: `STEPS IN ONE RECORDED DAY`.
- **Example caption:** 60 days with step records. / Daily dates follow Garmin.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L127); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Sleep (1)

#### CARD-080 · `sleep-median`

- **Headline/title:** OFF THE CLOCK.
- **Data presented:** Median of valid nightly recorded sleep durations, formatted as hours and minutes; contributing night count. This is not an average or sleep score.
- **Card type:** `single metric`.
- **Image layers:** [pillow](#image-pillow)
- **Eligibility:** Health included; at least 30 usable recorded sleep nights.
- **Fictional data example:** `8h 00m`; unit/context: `MEDIAN RECORDED SLEEP`.
- **Example caption:** 60 nights with sleep records. / No sleep is inferred for missing nights.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L131); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Heart And Effort (7)

#### CARD-081 · `max-hr`

- **Headline/title:** YOUR HIGHEST RECORDED HR.
- **Data presented:** Highest usable activity maxHR in BPM; number of activities with usable maxima out of all imported activities. This is a recorded peak, not physiological HRmax.
- **Card type:** `single metric`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** Health included; at least one usable activity maximum HR.
- **Fictional data example:** `177`; unit/context: `BPM · ACTIVITY PEAK · so far`.
- **Example caption:** Highest reported peak across your imported activities. / 152 of 152 activities include a usable maximum.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L139); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-082 · `activity-hr`

- **Headline/title:** YOUR HEART AT WORK.
- **Data presented:** Arithmetic mean of usable per-activity averageHR values in BPM; contributing activity count out of total. Each activity has equal weight, regardless of duration.
- **Card type:** `single metric`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** Health included; at least one usable per-activity average HR. Monthly chart can show a single month.
- **Fictional data example:** `123.5`; unit/context: `BPM · AVERAGE ACTIVITY HEART RATE · so far`.
- **Example caption:** 152 of 152 activities have heart-rate averages. / Each activity counts once, regardless of duration.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L141); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-083 · `activity-hr-monthly`

- **Headline/title:** YOUR HEART RATE, MONTH BY MONTH.
- **Data presented:** 12-month line chart and month-value/source-count grid. Each point is the mean of recorded per-activity HR averages for that month, rounded to one decimal. Missing/future months are gaps. High/low callouts preserve ties when comparison is enabled.
- **Card type:** `health-months`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** Health included; at least one usable per-activity average HR. Monthly chart can show a single month.
- **Fictional data example:** `MONTHLY AVERAGES`; unit/context: `BPM · ACTIVITY HEART RATE`.
- **Example caption:** Average of recorded activity averages in each month. / High and low compare the months shown.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L146); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-084 · `resting-hr`

- **Headline/title:** YOUR RESTING HEART RATE.
- **Data presented:** Arithmetic mean of usable daily resting HR values in BPM; contributing-day count. Garmin restingValue may fall back to daily minimum, explained in coverage details.
- **Card type:** `single metric`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** Health included; at least 30 recorded days with usable resting HR.
- **Fictional data example:** `57`; unit/context: `BPM · AVERAGE RESTING HEART RATE`.
- **Example caption:** 60 days with Garmin resting-heart-rate records. / Average across recorded days only.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L161); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-085 · `resting-hr-monthly`

- **Headline/title:** RESTING HR, MONTH BY MONTH.
- **Data presented:** 12-month line chart and month-value/day-count grid. Monthly means of usable daily resting HR; minimum 10 days per displayed month. Highest/lowest displayed averages, ties and current-month labels.
- **Card type:** `health-months`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** Health included; at least 30 usable resting-HR days overall and 2 months with at least 10 days each.
- **Fictional data example:** `MONTHLY AVERAGES`; unit/context: `BPM · RESTING HEART RATE`.
- **Example caption:** Monthly averages, with at least 10 recorded days per point. / High and low compare the months shown.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L162); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-086 · `hrv-median`

- **Headline/title:** YOUR OVERNIGHT HRV.
- **Data presented:** Median of usable recorded nightly lastNightAvg HRV values in ms; contributing-night count. No diagnostic or readiness interpretation.
- **Card type:** `single metric`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** Health included; at least 30 usable overnight-HRV nights.
- **Fictional data example:** `44.5`; unit/context: `MS · MEDIAN OVERNIGHT HRV`.
- **Example caption:** 60 nights with recorded overnight HRV averages. / Median across recorded nights only.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L166); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

#### CARD-087 · `hrv-monthly`

- **Headline/title:** HRV THROUGH THE YEAR.
- **Data presented:** 12-month line chart and month-value/night-count grid. Monthly medians of nightly HRV averages; minimum 10 nights per displayed month. Gaps/current-month labels; no high/low ranking is enabled.
- **Card type:** `health-months`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** Health included; at least 30 usable HRV nights overall and 2 months with at least 10 nights each.
- **Fictional data example:** `MONTHLY MEDIANS`; unit/context: `MS · OVERNIGHT HRV`.
- **Example caption:** Monthly medians, with at least 10 recorded nights per point. / Gaps show months without enough measurements.
- **Export:** 1080×1920 PNG; explicit per-card consent for real health data.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L167); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Finale (1)

#### CARD-088 · `finale`

- **Headline/title:** THAT’S YOUR TRACK RECORD.
- **Data presented:** Recorded-year receipt: year context plus activity count, recorded minutes (when complete), active days and sport-family count. Rows rather than the overview’s two-by-two grid.
- **Card type:** `summary`.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Eligibility:** At least one eligible recorded activity. Year summary/finale omit unavailable duration; calendar falls back from minutes to sessions.
- **Fictional data example:** `2026`; unit/context: `YOUR RECORDED YEAR · so far`.
- **Example caption:** 152 activities. 19 sport families. / A year with a shape all your own.
- **Export:** 1080×1920 PNG; no health-consent dialog for this card.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs#L170); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

### Mini-Watt (1)

#### CARD-089 · `mini-watt`

- **Headline/title:** KEEP THE WATTS COMING.
- **Data presented:** Promotional copy only: MINI WATT name; structured workouts, real routes, own entertainment; CTA Try MINI WATT; 14 days free; Mac + Windows; Bluetooth FTMS smart trainers. No personal metric.
- **Card type:** `promotion`.
- **Image layers:** [crank](#image-crank)
- **Eligibility:** An admitted cycling chapter; appended after finale. Promotional and not exportable.
- **Fictional data example:** `MINI WATT`; unit/context: `YOUR NEXT RIDE STARTS HERE`.
- **Example caption:** Structured workouts. Real routes. Your own entertainment. / Meet your next indoor cycling app.
- **Export:** Unavailable: promotional slide. Try MINI WATT links to https://www.miniwatt.app/download.
- **Source:** [card generator](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/recap-sequence.mjs#L8); [art composition](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs).

## 4. All 184 currently browsable template cards

**Current presented data on every template:** `—` as metric, `DATA REQUIRED` as unit/context, `DESIGN LIBRARY` as edition, `TEMPLATE · NO PERSONAL DATA` as notice, and `A possible chapter. / Only appears with supporting data.` as caption. Do not put invented personal statistics in these frames. All can be exported as templates without personal data; in template sharing, only the selected template is offered.

Each entry below also describes the intended metric concept and source requirement. The current library implementation does not present working data charts for all intended metrics. Requirements and claim guards are preserved from the catalog and can differ from the implemented runtime cards. Historical years in a catalog guard are example years, not a year-selection control.

### Running (12)

#### TEMPLATE-001 · `template-running_distance`

- **Headline/title:** THE DISTANCE YOU RAN
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** distance>=0; completeness>=95%
- **Required evidence:** activity_index.
- **Claim guard:** 2025 distance is valid only if all eligible run activities have usable distance
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L7).

#### TEMPLATE-002 · `template-running_longest`

- **Headline/title:** ONE RUN WENT FURTHER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Largest recorded distance within the sport. (`max_distance`)
- **Required eligibility:** at least 2 runs; max distance>0
- **Required evidence:** activity_index.
- **Claim guard:** largest recorded run, not a certified personal record
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L22).

#### TEMPLATE-003 · `template-running_pace`

- **Headline/title:** YOUR FASTEST COMPARABLE RUN
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Best pace across comparable eligible runs. (`best_comparable_pace`)
- **Required eligibility:** at least 3 runs, distance>=3km; GPS or calibrated pace
- **Required evidence:** activity_index.
- **Claim guard:** like-for-like distance and route conditions; no general speed improvement claim
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L37).

#### TEMPLATE-004 · `template-running_consistency`

- **Headline/title:** WEEKS IN YOUR RUNNING SHOES
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** at least 8 run weeks; full year
- **Required evidence:** activity_index.
- **Claim guard:** count unique ISO weeks with running
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L52).

#### TEMPLATE-005 · `template-running_favorite_time`

- **Headline/title:** WHEN YOUR RUNS HAPPENED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most common activity start-time bucket in local time. (`start_hour_mode`)
- **Required eligibility:** at least 10 runs; dominant time bucket>=40%
- **Required evidence:** activity_index.
- **Claim guard:** local-time clock with daylight savings
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L67).

#### TEMPLATE-006 · `template-running_hr`

- **Headline/title:** YOUR RUNNING ENGINE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR present >=75% of running time
- **Required evidence:** activity_index.
- **Claim guard:** HR zone settings may change; use only validated compatible zones
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L82).

#### TEMPLATE-007 · `template-running_cadence`

- **Headline/title:** YOUR RUNNING RHYTHM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Distribution of recorded cadence values. (`cadence_distribution`)
- **Required eligibility:** FIT cadence values in >=3 runs
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** running cadence units device-specific and FIT developer fields normalized
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L97).

#### TEMPLATE-008 · `template-running_elevation`

- **Headline/title:** THE HILLS ADDED UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total valid recorded ascent. (`ascent_sum`)
- **Required eligibility:** ascent valid in >=90% outdoor running
- **Required evidence:** activity_index.
- **Claim guard:** do not include treadmill elevation unless recorded as valid
- **Type:** template/concept; catalog story family `terrain`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L113).

#### TEMPLATE-009 · `template-running_footprint`

- **Headline/title:** ALL THE PATHS YOU TOOK
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Geographical coverage from valid GPS recordings. (`route_coverage`)
- **Required eligibility:** at least 3 valid GPS runs; privacy permission
- **Required evidence:** activity_index.
- **Claim guard:** never publicly expose start/end or precise trace by default
- **Type:** template/concept; catalog story family `location`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L128).

#### TEMPLATE-010 · `template-running_progress`

- **Headline/title:** DID YOUR PACE CHANGE?
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Pace change between matched early/late running samples. (`matched_pace_change`)
- **Required eligibility:** matched comparison >=6 sessions each period
- **Required evidence:** activity_index.
- **Claim guard:** match distance/elevation/type/effort; no causal explanation
- **Type:** template/concept; catalog story family `trend`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L143).

#### TEMPLATE-011 · `template-running_pr`

- **Headline/title:** THE RUNS THAT STOOD OUT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Count of explicit, verified personal-record markers. (`verified_pr_count`)
- **Required eligibility:** actual PR markers; corroborated with category
- **Required evidence:** activity_index.
- **Claim guard:** PR flag is not evidence of which distance record
- **Type:** template/concept; catalog story family `achievement`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L158).

#### TEMPLATE-012 · `template-running_trail_split`

- **Headline/title:** YOU LEFT THE ROAD BEHIND
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity distribution across validated sport subtypes. (`subtype_share`)
- **Required eligibility:** trail subtype >=3; entire running classification reliable
- **Required evidence:** activity_index.
- **Claim guard:** trail vs road breakdown only when subtype truly known
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [running-track](#image-running-track), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L173).

### Cycling (12)

#### TEMPLATE-013 · `template-cycling_distance`

- **Headline/title:** KILOMETERS ON TWO WHEELS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** distance completeness >=95%
- **Required evidence:** activity_index.
- **Claim guard:** separate indoor credited trainer kilometers from GPS outdoors
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L188).

#### TEMPLATE-014 · `template-cycling_duration`

- **Headline/title:** TIME IN THE SADDLE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** recorded duration complete
- **Required evidence:** activity_index.
- **Claim guard:** do not turn elapsed time into pedaling time
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L203).

#### TEMPLATE-015 · `template-cycling_biggest`

- **Headline/title:** YOUR BIGGEST RIDE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Largest recorded distance within the sport. (`max_distance`)
- **Required eligibility:** >=2 rides; valid distance
- **Required evidence:** activity_index.
- **Claim guard:** recorded longest not global record
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L218).

#### TEMPLATE-016 · `template-cycling_climbing`

- **Headline/title:** EVERY CLIMB COUNTS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total valid recorded ascent. (`ascent_sum`)
- **Required eligibility:** >=3 outdoor rides; ascent completeness >=90%
- **Required evidence:** activity_index.
- **Claim guard:** exclude indoor without meaningful ascent
- **Type:** template/concept; catalog story family `terrain`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L233).

#### TEMPLATE-017 · `template-cycling_power`

- **Headline/title:** THE WATTS YOU PUT DOWN
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Power output across comparable measured-duration windows. (`power_curve`)
- **Required eligibility:** calibrated power readings, comparable windows
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** FIT power data optional; no FTP claim without supported test
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L248).

#### TEMPLATE-018 · `template-cycling_cadence`

- **Headline/title:** YOUR PEDALING RHYTHM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Distribution of recorded cadence values. (`cadence_distribution`)
- **Required eligibility:** FIT cadence validated >=3 rides
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** no cadence absent sensor
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L264).

#### TEMPLATE-019 · `template-cycling_hr`

- **Headline/title:** THE EFFORT BEHIND THE RIDE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR present >=75% of duration
- **Required evidence:** activity_index.
- **Claim guard:** zones from consistent definition
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L280).

#### TEMPLATE-020 · `template-cycling_route`

- **Headline/title:** THE ROADS YOU EXPLORED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Geographical coverage from valid GPS recordings. (`route_coverage`)
- **Required eligibility:** >=3 valid outdoor GPS tracks
- **Required evidence:** activity_index.
- **Claim guard:** avoid revealing home and routine routes
- **Type:** template/concept; catalog story family `location`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L295).

#### TEMPLATE-021 · `template-cycling_longday`

- **Headline/title:** THE DAY YOU KEPT GOING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 rides; valid session duration
- **Required evidence:** activity_index.
- **Claim guard:** route optional
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L310).

#### TEMPLATE-022 · `template-cycling_subtypes`

- **Headline/title:** HOW YOU RODE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity distribution across validated sport subtypes. (`subtype_share`)
- **Required eligibility:** >=6 rides, indoor and outdoor accurately classified
- **Required evidence:** activity_index.
- **Claim guard:** do not imply preference from indoor vs outdoor alone
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L325).

#### TEMPLATE-023 · `template-cycling_speed`

- **Headline/title:** DID YOUR RIDING SPEED CHANGE?
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Speed change across matched comparable rides. (`matched_speed_change`)
- **Required eligibility:** matched outdoor course conditions; >=6 paired sessions
- **Required evidence:** activity_index.
- **Claim guard:** wind/terrain/traffic make naive mean speed misleading
- **Type:** template/concept; catalog story family `trend`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L340).

#### TEMPLATE-024 · `template-cycling_consistency`

- **Headline/title:** YOUR YEAR ON TWO WHEELS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 cycling weeks
- **Required evidence:** activity_index.
- **Claim guard:** count unique weeks
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L355).

### Hiit (10)

#### TEMPLATE-025 · `template-hiit_sessions`

- **Headline/title:** YOU CAME FOR THE INTENSITY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** recorded sessions only
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L370).

#### TEMPLATE-026 · `template-hiit_time`

- **Headline/title:** THE MINUTES THAT COUNTED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** >=4 sessions; duration complete
- **Required evidence:** activity_index.
- **Claim guard:** do not assume all minutes were hard effort
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L385).

#### TEMPLATE-027 · `template-hiit_zone4`

- **Headline/title:** TIME IN THE RED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded duration in the defined upper HR zone(s). (`upper_zone_minutes`)
- **Required eligibility:** HR coverage >=80%; compatible zone definition
- **Required evidence:** activity_index.
- **Claim guard:** zones 4 and 5, not necessarily actual max exertion
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L400).

#### TEMPLATE-028 · `template-hiit_hrpeak`

- **Headline/title:** THE BIGGEST HEART-RATE PEAK
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Highest usable recorded activity heart rate. (`max_hr`)
- **Required eligibility:** >=3 sessions with usable HR
- **Required evidence:** activity_index.
- **Claim guard:** not proof of maximum physiological heart rate
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L415).

#### TEMPLATE-029 · `template-hiit_recovery`

- **Headline/title:** HOW YOUR HEART SETTLED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Measured fall in heart rate between actual recorded intervals. (`intra_session_recovery`)
- **Required eligibility:** >=3 FIT sessions with intervals and continuous HR
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** observed recovery between intervals, not medical fitness conclusion
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L430).

#### TEMPLATE-030 · `template-hiit_repeat`

- **Headline/title:** THE WEEKLY RITUAL
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity recurrence across calendar weeks. (`weekly_consistency`)
- **Required eligibility:** >=8 active weeks
- **Required evidence:** activity_index.
- **Claim guard:** no moral judgement on missed weeks
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L446).

#### TEMPLATE-031 · `template-hiit_longest`

- **Headline/title:** YOUR LONGEST HIIT SESSION
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** long session is not higher intensity
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L461).

#### TEMPLATE-032 · `template-hiit_peak_day`

- **Headline/title:** YOUR BIGGEST HIIT DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Largest number of eligible sessions on one recorded day. (`max_sessions_day`)
- **Required eligibility:** >=8 sessions and repeated days
- **Required evidence:** activity_index.
- **Claim guard:** multiple sessions may reflect duplicate imports; dedupe first
- **Type:** template/concept; catalog story family `surprise`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L476).

#### TEMPLATE-033 · `template-hiit_interval_structure`

- **Headline/title:** THE FORMAT YOU RETURNED TO
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most common recorded structured-workout interval format. (`interval_pattern`)
- **Required eligibility:** structured workout steps in >=5 sessions
- **Required evidence:** activity_index.
- **Claim guard:** do not infer EMOM/AMRAP from generic timer
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L491).

#### TEMPLATE-034 · `template-hiit_workload`

- **Headline/title:** MORE THAN JUST A TIMER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Actual recorded workout set/repetition metadata. (`recorded_sets`)
- **Required eligibility:** reps/sets actually present for >=3 workouts
- **Required evidence:** activity_index.
- **Claim guard:** HIIT set summaries may not represent all exercises
- **Type:** template/concept; catalog story family `achievement`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L506).

### Strength (9)

#### TEMPLATE-035 · `template-strength_sessions`

- **Headline/title:** YOUR STRENGTH YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** sessions counted
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L521).

#### TEMPLATE-036 · `template-strength_time`

- **Headline/title:** HOURS OF STRENGTH TRAINING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid session durations
- **Required evidence:** activity_index.
- **Claim guard:** not time under tension
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L536).

#### TEMPLATE-037 · `template-strength_reps`

- **Headline/title:** EVERY REP COUNTS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of explicitly recorded repetitions. (`reps_sum`)
- **Required eligibility:** >=80% sessions with complete recorded rep metadata
- **Required evidence:** activity_index.
- **Claim guard:** recorded sets only, not estimated untracked repetitions
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L551).

#### TEMPLATE-038 · `template-strength_sets`

- **Headline/title:** SET AFTER SET
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of explicitly recorded sets. (`sets_sum`)
- **Required eligibility:** >=80% sessions complete sets
- **Required evidence:** activity_index.
- **Claim guard:** same dedupe rules
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L566).

#### TEMPLATE-039 · `template-strength_maxload`

- **Headline/title:** THE HEAVIEST RECORDED SET
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Highest valid recorded exercise/set load. (`max_recorded_load`)
- **Required eligibility:** weight measurements and exercise identity valid
- **Required evidence:** activity_index.
- **Claim guard:** never describe as one-rep max
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L581).

#### TEMPLATE-040 · `template-strength_exercise`

- **Headline/title:** THE MOVE YOU KEPT COMING BACK TO
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most frequently recorded classified exercise. (`top_exercise`)
- **Required eligibility:** >=8 classified exercises
- **Required evidence:** activity_index.
- **Claim guard:** requires consistent exercise IDs
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L596).

#### TEMPLATE-041 · `template-strength_progress`

- **Headline/title:** ONE LIFT, TWO CHAPTERS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Change in load between comparable sets of the same exercise. (`matched_load_progress`)
- **Required eligibility:** >=3 comparable sets in early/late windows
- **Required evidence:** activity_index.
- **Claim guard:** compare same movement/reps/equipment
- **Type:** template/concept; catalog story family `trend`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L611).

#### TEMPLATE-042 · `template-strength_hr`

- **Headline/title:** YOUR HEART SHOWED UP TOO
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR on >=75% session time
- **Required evidence:** activity_index.
- **Claim guard:** cardio metrics optional
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L626).

#### TEMPLATE-043 · `template-strength_consistency`

- **Headline/title:** YOUR ROUTINE HELD
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** no missing weeks interpreted as failure
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L641).

### Walking (8)

#### TEMPLATE-044 · `template-walking_sessions`

- **Headline/title:** WALK AFTER WALK
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** recorded walk sessions
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L656).

#### TEMPLATE-045 · `template-walking_distance`

- **Headline/title:** THE DISTANCE YOU WALKED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** >=90% valid distance
- **Required evidence:** activity_index.
- **Claim guard:** do not add daily step distance; risk of double count
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L671).

#### TEMPLATE-046 · `template-walking_longest`

- **Headline/title:** YOUR LONGEST WALK
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Largest recorded distance within the sport. (`max_distance`)
- **Required eligibility:** >=2 recorded walks
- **Required evidence:** activity_index.
- **Claim guard:** recorded only
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L686).

#### TEMPLATE-047 · `template-walking_minutes`

- **Headline/title:** TIME ON YOUR FEET
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** activity time, not standing
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L701).

#### TEMPLATE-048 · `template-walking_routine`

- **Headline/title:** THE WALKING HABIT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** walks recorded, not step-derived
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L716).

#### TEMPLATE-049 · `template-walking_timing`

- **Headline/title:** WHEN YOU HEADED OUT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most common activity start-time bucket in local time. (`start_hour_mode`)
- **Required eligibility:** >=10 walks
- **Required evidence:** activity_index.
- **Claim guard:** local time
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L731).

#### TEMPLATE-050 · `template-walking_routes`

- **Headline/title:** WHERE YOUR WALKS TOOK YOU
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Geographical coverage from valid GPS recordings. (`route_coverage`)
- **Required eligibility:** >=3 valid GPS trails
- **Required evidence:** activity_index.
- **Claim guard:** privacy gated
- **Type:** template/concept; catalog story family `location`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L746).

#### TEMPLATE-051 · `template-walking_weekday`

- **Headline/title:** YOUR WALKING DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most frequent weekday for eligible activities. (`weekday_mode`)
- **Required eligibility:** >=12 walks and meaningful concentration
- **Required evidence:** activity_index.
- **Claim guard:** not a fixed weekly plan
- **Type:** template/concept; catalog story family `surprise`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L761).

### Hiking (8)

#### TEMPLATE-052 · `template-hiking_sessions`

- **Headline/title:** YOU WENT EXPLORING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=3 hikes
- **Required evidence:** activity_index.
- **Claim guard:** recorded hikes only
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L776).

#### TEMPLATE-053 · `template-hiking_distance`

- **Headline/title:** TRAIL AFTER TRAIL
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** distance>=90%
- **Required evidence:** activity_index.
- **Claim guard:** verified route distance
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L791).

#### TEMPLATE-054 · `template-hiking_ascent`

- **Headline/title:** THE CLIMBS KEPT COMING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total valid recorded ascent. (`ascent_sum`)
- **Required eligibility:** >=3 hikes with ascent
- **Required evidence:** activity_index.
- **Claim guard:** validate elevation
- **Type:** template/concept; catalog story family `terrain`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L806).

#### TEMPLATE-055 · `template-hiking_longest`

- **Headline/title:** YOUR BIGGEST DAY OUT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Largest recorded distance within the sport. (`max_distance`)
- **Required eligibility:** >=2 hikes
- **Required evidence:** activity_index.
- **Claim guard:** recorded max
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L821).

#### TEMPLATE-056 · `template-hiking_highest`

- **Headline/title:** THE HIGHEST YOU REACHED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Highest usable recorded elevation. (`max_elevation`)
- **Required eligibility:** valid GPS/elevation; >=2 hikes
- **Required evidence:** activity_index.
- **Claim guard:** elevation above sea level, not ascent
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L836).

#### TEMPLATE-057 · `template-hiking_routes`

- **Headline/title:** THE PLACES YOU FOUND
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Geographical coverage from valid GPS recordings. (`route_coverage`)
- **Required eligibility:** >=2 GPS hikes
- **Required evidence:** activity_index.
- **Claim guard:** privacy gated
- **Type:** template/concept; catalog story family `location`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L851).

#### TEMPLATE-058 · `template-hiking_duration`

- **Headline/title:** HOURS IN THE OUTDOORS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** time recorded
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L866).

#### TEMPLATE-059 · `template-hiking_season`

- **Headline/title:** YOUR TRAIL SEASON
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Season with the strongest observed activity concentration. (`season_mode`)
- **Required eligibility:** >=6 hikes; clear seasonal pattern
- **Required evidence:** activity_index.
- **Claim guard:** weather inferred? no
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [boot](#image-boot)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L881).

### Swimming (9)

#### TEMPLATE-060 · `template-swim_sessions`

- **Headline/title:** YOUR YEAR IN THE WATER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 swims
- **Required evidence:** activity_index.
- **Claim guard:** pool and open water grouped
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L896).

#### TEMPLATE-061 · `template-swim_distance`

- **Headline/title:** LENGTH AFTER LENGTH
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** >=90% valid distance
- **Required evidence:** activity_index.
- **Claim guard:** pool distance relies on pool length/laps
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L911).

#### TEMPLATE-062 · `template-swim_longest`

- **Headline/title:** THE LONGEST SWIM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Largest recorded distance within the sport. (`max_distance`)
- **Required eligibility:** >=2 swims
- **Required evidence:** activity_index.
- **Claim guard:** recorded longest
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L926).

#### TEMPLATE-063 · `template-swim_time`

- **Headline/title:** HOURS IN THE WATER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid active timer
- **Required evidence:** activity_index.
- **Claim guard:** exclude time on deck where possible
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L941).

#### TEMPLATE-064 · `template-swim_strokes`

- **Headline/title:** EVERY STROKE ADDED UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total validated swimming/rowing strokes. (`stroke_sum`)
- **Required eligibility:** stroke totals validated >=80%
- **Required evidence:** activity_index.
- **Claim guard:** must never fake estimated stroke counts
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L956).

#### TEMPLATE-065 · `template-swim_pace`

- **Headline/title:** YOUR PACE THROUGH THE WATER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Comparable swimming pace per 100 metres. (`pace100m`)
- **Required eligibility:** >=3 comparable swims
- **Required evidence:** activity_index.
- **Claim guard:** separate pool/open water
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L971).

#### TEMPLATE-066 · `template-swim_pool`

- **Headline/title:** THE POOL YOU KNOW
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Distribution of recorded pool lengths. (`pool_length_distribution`)
- **Required eligibility:** >=4 valid pool swims
- **Required evidence:** activity_index.
- **Claim guard:** pool distance values validated
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L986).

#### TEMPLATE-067 · `template-swim_open`

- **Headline/title:** YOUR OPEN WATER CHAPTER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Share/count of validated open-water swim activities. (`open_water_share`)
- **Required eligibility:** >=2 true open-water activities
- **Required evidence:** activity_index.
- **Claim guard:** distinguish from pool
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1001).

#### TEMPLATE-068 · `template-swim_swolf`

- **Headline/title:** YOUR SWOLF STORY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Pattern in recorded SWOLF values. (`swolf_pattern`)
- **Required eligibility:** swolf available consistently >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** device-specific, not a cross-user score
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [pool-water](#image-pool-water), [goggles](#image-goggles)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1016).

### Rowing (8)

#### TEMPLATE-069 · `template-row_sessions`

- **Headline/title:** YOUR YEAR ON THE ROW
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=3 rows
- **Required evidence:** activity_index.
- **Claim guard:** recorded rows
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1031).

#### TEMPLATE-070 · `template-row_distance`

- **Headline/title:** METER BY METER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** >=90% distance
- **Required evidence:** activity_index.
- **Claim guard:** erg data not GPS river distance
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1046).

#### TEMPLATE-071 · `template-row_time`

- **Headline/title:** TIME IN RHYTHM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** duration valid
- **Required evidence:** activity_index.
- **Claim guard:** session time
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1061).

#### TEMPLATE-072 · `template-row_longest`

- **Headline/title:** YOUR LONGEST ROW
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Largest recorded distance within the sport. (`max_distance`)
- **Required eligibility:** >=2 valid rows
- **Required evidence:** activity_index.
- **Claim guard:** indoor/outdoor may be compared distance not conditions
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1076).

#### TEMPLATE-073 · `template-row_strokes`

- **Headline/title:** EVERY STROKE ADDED UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total validated swimming/rowing strokes. (`stroke_sum`)
- **Required eligibility:** strokes validated >=80%
- **Required evidence:** activity_index.
- **Claim guard:** strokes optional
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1091).

#### TEMPLATE-074 · `template-row_rate`

- **Headline/title:** YOUR STROKE RHYTHM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Distribution of validated rowing stroke rates. (`stroke_rate_distribution`)
- **Required eligibility:** cadence FIT validated >=3 rows
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** normalization of stroke rate
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1106).

#### TEMPLATE-075 · `template-row_pace`

- **Headline/title:** YOUR PACE PER 500
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Comparable rowing pace per 500 metres. (`pace500m`)
- **Required eligibility:** >=3 calibrated comparable sessions
- **Required evidence:** activity_index.
- **Claim guard:** erg vs water separate
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1122).

#### TEMPLATE-076 · `template-row_hr`

- **Headline/title:** THE EFFORT IN EVERY PULL
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR 75%
- **Required evidence:** activity_index.
- **Claim guard:** observed only
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [oar](#image-oar)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1137).

### Yoga (8)

#### TEMPLATE-077 · `template-yoga_sessions`

- **Headline/title:** YOU MADE SPACE TO MOVE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** activity classification only
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1152).

#### TEMPLATE-078 · `template-yoga_time`

- **Headline/title:** TIME ON THE MAT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** recorded yoga time
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1167).

#### TEMPLATE-079 · `template-yoga_consistency`

- **Headline/title:** THE MAT KEPT CALLING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** no claims of stress relief
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1182).

#### TEMPLATE-080 · `template-yoga_streak`

- **Headline/title:** A ROUTINE TO RETURN TO
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest consecutive run of active calendar weeks. (`longest_weekly_streak`)
- **Required eligibility:** >=8 yoga weeks and complete index
- **Required evidence:** activity_index.
- **Claim guard:** sequential activity weeks, not every day
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1197).

#### TEMPLATE-081 · `template-yoga_favorite_day`

- **Headline/title:** YOUR YOGA DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most frequent weekday for eligible activities. (`weekday_mode`)
- **Required eligibility:** >=10 yoga sessions
- **Required evidence:** activity_index.
- **Claim guard:** concentration threshold
- **Type:** template/concept; catalog story family `surprise`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1212).

#### TEMPLATE-082 · `template-yoga_month`

- **Headline/title:** WHEN YOU FOUND YOUR FLOW
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Month with the highest relevant activity count/concentration. (`month_mode`)
- **Required eligibility:** >=10 yoga sessions
- **Required evidence:** activity_index.
- **Claim guard:** seasonal pattern only
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1227).

#### TEMPLATE-083 · `template-yoga_duration`

- **Headline/title:** YOUR LONGEST FLOW
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 yoga sessions
- **Required evidence:** activity_index.
- **Claim guard:** duration not skill
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1242).

#### TEMPLATE-084 · `template-yoga_energy`

- **Headline/title:** WHAT HAPPENED AROUND CLASS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Measured Body Battery before/after eligible sessions. (`prepost_body_battery`)
- **Required eligibility:** consent and reliable measured pre/post samples
- **Required evidence:** activity_index.
- **Claim guard:** descriptive only; no causal recovery claim
- **Type:** template/concept; catalog story family `wellness`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1257).

### Pilates (8)

#### TEMPLATE-085 · `template-pilates_sessions`

- **Headline/title:** YOUR PILATES YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4
- **Required evidence:** activity_index.
- **Claim guard:** recorded sessions
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1272).

#### TEMPLATE-086 · `template-pilates_time`

- **Headline/title:** HOURS OF MOVEMENT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** recorded activity timer
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1287).

#### TEMPLATE-087 · `template-pilates_consistency`

- **Headline/title:** WEEKS YOU RETURNED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** weekly presence
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1302).

#### TEMPLATE-088 · `template-pilates_streak`

- **Headline/title:** THE ROUTINE TOOK SHAPE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest consecutive run of active calendar weeks. (`longest_weekly_streak`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** not fitness progression
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1317).

#### TEMPLATE-089 · `template-pilates_weekday`

- **Headline/title:** YOUR PILATES DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most frequent weekday for eligible activities. (`weekday_mode`)
- **Required eligibility:** >=10 sessions
- **Required evidence:** activity_index.
- **Claim guard:** strong mode
- **Type:** template/concept; catalog story family `surprise`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1332).

#### TEMPLATE-090 · `template-pilates_longest`

- **Headline/title:** YOUR LONGEST SESSION
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** no performance claim
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1347).

#### TEMPLATE-091 · `template-pilates_month`

- **Headline/title:** WHEN YOU FOUND YOUR GROOVE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Month with the highest relevant activity count/concentration. (`month_mode`)
- **Required eligibility:** >=10 sessions
- **Required evidence:** activity_index.
- **Claim guard:** full-year coverage
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1362).

#### TEMPLATE-092 · `template-pilates_hr`

- **Headline/title:** YOUR SESSION, IN HEARTBEATS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR time series >75%
- **Required evidence:** activity_index.
- **Claim guard:** heart rate does not measure pilates quality
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [ball](#image-ball), [mat](#image-mat)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1377).

### Elliptical (8)

#### TEMPLATE-093 · `template-elliptical_sessions`

- **Headline/title:** ON THE ELLIPTICAL
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** recorded sessions
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1392).

#### TEMPLATE-094 · `template-elliptical_time`

- **Headline/title:** THE MINUTES ROLLED ON
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** recorded time
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1407).

#### TEMPLATE-095 · `template-elliptical_longest`

- **Headline/title:** YOU KEPT IT GOING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** longest duration
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1422).

#### TEMPLATE-096 · `template-elliptical_hr`

- **Headline/title:** THE EFFORT PROFILE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR>=75%
- **Required evidence:** activity_index.
- **Claim guard:** HR zones validated
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1437).

#### TEMPLATE-097 · `template-elliptical_week`

- **Headline/title:** YOU KEPT COMING BACK
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** routine
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1452).

#### TEMPLATE-098 · `template-elliptical_peak`

- **Headline/title:** THE DAY YOUR HEART RAN HIGH
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Highest usable recorded activity heart rate. (`max_hr`)
- **Required eligibility:** >=4 HR tracked sessions
- **Required evidence:** activity_index.
- **Claim guard:** no max physiological claim
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1467).

#### TEMPLATE-099 · `template-elliptical_calories`

- **Headline/title:** ENERGY IN MOTION
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of usable recorded calorie estimates. (`calorie_sum`)
- **Required eligibility:** >=90% measured calorie coverage
- **Required evidence:** activity_index.
- **Claim guard:** estimated calories not exact expenditure
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1482).

#### TEMPLATE-100 · `template-elliptical_month`

- **Headline/title:** YOUR BUSIEST MONTH
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Month with the highest relevant activity count/concentration. (`month_mode`)
- **Required eligibility:** >=10 sessions
- **Required evidence:** activity_index.
- **Claim guard:** full-year index
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [studio-floor](#image-studio-floor), [elliptical](#image-elliptical)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1497).

### Skiing (8)

#### TEMPLATE-101 · `template-ski_days`

- **Headline/title:** DAYS ON THE SNOW
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of distinct local days containing the activity. (`active_days`)
- **Required eligibility:** >=2 unique days
- **Required evidence:** activity_index.
- **Claim guard:** recorded snow-sport days only
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1512).

#### TEMPLATE-102 · `template-ski_vertical`

- **Headline/title:** YOUR VERTICAL YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Validated ascent or descent appropriate to snow-sport subtype. (`ascent_or_descent`)
- **Required eligibility:** comparable measurement and subtype
- **Required evidence:** activity_index.
- **Claim guard:** downhill descent never labeled ascent
- **Type:** template/concept; catalog story family `terrain`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1527).

#### TEMPLATE-103 · `template-ski_runs`

- **Headline/title:** ONE RUN AFTER ANOTHER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Count of validated downhill run/lap segments. (`recorded_run_count`)
- **Required eligibility:** downhill lap/run segmentation validated
- **Required evidence:** activity_index.
- **Claim guard:** laps not always ski descents
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1542).

#### TEMPLATE-104 · `template-ski_distance`

- **Headline/title:** THE SNOW COVERED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** valid distance>=90%
- **Required evidence:** activity_index.
- **Claim guard:** disclose downhill vs cross-country
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1557).

#### TEMPLATE-105 · `template-ski_bigday`

- **Headline/title:** YOUR LONGEST SNOW DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=2 snow activities
- **Required evidence:** activity_index.
- **Claim guard:** elapsed vs moving distinction
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1572).

#### TEMPLATE-106 · `template-ski_elevation`

- **Headline/title:** YOUR HIGHEST POINT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Highest usable recorded elevation. (`max_elevation`)
- **Required eligibility:** elevation valid
- **Required evidence:** activity_index.
- **Claim guard:** altitude above sea level
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1587).

#### TEMPLATE-107 · `template-ski_places`

- **Headline/title:** WHERE THE SNOW TOOK YOU
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Geographical coverage from valid GPS recordings. (`route_coverage`)
- **Required eligibility:** GPS data; privacy
- **Required evidence:** activity_index.
- **Claim guard:** avoid exact location),
- **Type:** template/concept; catalog story family `location`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1602).

#### TEMPLATE-108 · `template-ski_subtype`

- **Headline/title:** YOUR WAY DOWN THE MOUNTAIN
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity distribution across validated sport subtypes. (`subtype_share`)
- **Required eligibility:** multiple identified snow subtypes
- **Required evidence:** activity_index.
- **Claim guard:** do not mix snowshoeing with alpine performance
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [skis](#image-skis)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1617).

### Golf (8)

#### TEMPLATE-109 · `template-golf_rounds`

- **Headline/title:** A YEAR ON THE COURSE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=3 rounds
- **Required evidence:** activity_index.
- **Claim guard:** recorded golf rounds
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1632).

#### TEMPLATE-110 · `template-golf_hours`

- **Headline/title:** TIME ON THE FAIRWAYS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** duration complete
- **Required evidence:** activity_index.
- **Claim guard:** walking between holes is part of activity
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1647).

#### TEMPLATE-111 · `template-golf_courses`

- **Headline/title:** THE COURSES YOU PLAYED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of distinct recorded golf-course IDs. (`distinct_course_count`)
- **Required eligibility:** course IDs available for >=3 rounds
- **Required evidence:** activity_index.
- **Claim guard:** optional; no GPS-derived course guessing
- **Type:** template/concept; catalog story family `location`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1662).

#### TEMPLATE-112 · `template-golf_score`

- **Headline/title:** YOUR SCORECARD YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Distribution of actual golf round scores with hole context. (`round_score_distribution`)
- **Required eligibility:** actual numeric scores/holes >=3 rounds
- **Required evidence:** activity_index.
- **Claim guard:** not available in tested generic API; require explicit golf score data
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1677).

#### TEMPLATE-113 · `template-golf_best`

- **Headline/title:** YOUR STANDOUT ROUND
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Best round among scores comparable by course/round context. (`best_comparable_round`)
- **Required eligibility:** stroke count and course context
- **Required evidence:** activity_index.
- **Claim guard:** adjust for course, 9 vs 18 holes
- **Type:** template/concept; catalog story family `achievement`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1692).

#### TEMPLATE-114 · `template-golf_streak`

- **Headline/title:** THE MONTHS YOU PLAYED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number/pattern of months with recorded activity. (`active_months`)
- **Required eligibility:** >=6 rounds
- **Required evidence:** activity_index.
- **Claim guard:** months present
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1707).

#### TEMPLATE-115 · `template-golf_walk`

- **Headline/title:** THE WALK BETWEEN SHOTS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Measured walking distance during golf rounds. (`walking_distance`)
- **Required eligibility:** GPS walking samples during round
- **Required evidence:** activity_index.
- **Claim guard:** avoid conflating club activity with steps
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1722).

#### TEMPLATE-116 · `template-golf_favorite_time`

- **Headline/title:** YOUR TEE-TIME HABIT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most common activity start-time bucket in local time. (`start_hour_mode`)
- **Required eligibility:** >=8 rounds
- **Required evidence:** activity_index.
- **Claim guard:** timestamps only
- **Type:** template/concept; catalog story family `surprise`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [golf-ball](#image-golf-ball), [golf-club](#image-golf-club)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1737).

### Racket (8)

#### TEMPLATE-117 · `template-racket_sessions`

- **Headline/title:** BACK ON COURT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** per subtype when available
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1752).

#### TEMPLATE-118 · `template-racket_time`

- **Headline/title:** HOURS ON COURT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** recorded time
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1767).

#### TEMPLATE-119 · `template-racket_type`

- **Headline/title:** YOUR COURT OF CHOICE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity distribution across validated sport subtypes. (`subtype_share`)
- **Required eligibility:** >=8 sessions and subtype classified
- **Required evidence:** activity_index.
- **Claim guard:** tennis vs padel etc
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1782).

#### TEMPLATE-120 · `template-racket_hr`

- **Headline/title:** YOUR EFFORT BETWEEN POINTS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR>=75%
- **Required evidence:** activity_index.
- **Claim guard:** cannot infer match outcomes
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1797).

#### TEMPLATE-121 · `template-racket_longest`

- **Headline/title:** YOUR LONGEST COURT SESSION
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** not longest match without match data
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1812).

#### TEMPLATE-122 · `template-racket_favorite_day`

- **Headline/title:** COURT DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most frequent weekday for eligible activities. (`weekday_mode`)
- **Required eligibility:** >=10 sessions
- **Required evidence:** activity_index.
- **Claim guard:** strong weekday signal
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1827).

#### TEMPLATE-123 · `template-racket_consistency`

- **Headline/title:** A YEAR ON THE COURT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** weekly consistency
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1842).

#### TEMPLATE-124 · `template-racket_score`

- **Headline/title:** YOUR MATCH STORY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Explicit verified racket-match scores/results. (`match_results`)
- **Required eligibility:** explicit verified scores exist
- **Required evidence:** activity_index.
- **Claim guard:** not available in generic FIT summary; do not invent wins
- **Type:** template/concept; catalog story family `achievement`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1857).

### Triathlon (8)

#### TEMPLATE-125 · `template-multi_events`

- **Headline/title:** THE MULTISPORT YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=2 full events
- **Required evidence:** activity_index.
- **Claim guard:** parent event counted once
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1872).

#### TEMPLATE-126 · `template-multi_legs`

- **Headline/title:** ONE SESSION, MANY SPORTS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of explicitly classified multisport legs. (`leg_count`)
- **Required eligibility:** FIT sessions classified into legs
- **Required evidence:** activity_index.
- **Claim guard:** child activities not counted again
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1887).

#### TEMPLATE-127 · `template-multi_total_time`

- **Headline/title:** TIME FROM START TO FINISH
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** timer semantics validated
- **Required evidence:** activity_index.
- **Claim guard:** transitions included/excluded explicit
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1902).

#### TEMPLATE-128 · `template-multi_split`

- **Headline/title:** YOUR SPLIT STORY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time in each complete multisport leg. (`leg_time_distribution`)
- **Required eligibility:** complete leg sessions >=1 full event
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** leg timing from FIT, not generic labels
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1917).

#### TEMPLATE-129 · `template-multi_transition`

- **Headline/title:** THE TIME BETWEEN SPORTS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of explicitly recorded multisport transition times. (`transition_time_sum`)
- **Required eligibility:** actual transitions recorded
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** not estimated
- **Type:** template/concept; catalog story family `technical`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1933).

#### TEMPLATE-130 · `template-multi_longest`

- **Headline/title:** YOUR BIGGEST MULTISPORT DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=2 events
- **Required evidence:** activity_index.
- **Claim guard:** event duration
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1949).

#### TEMPLATE-131 · `template-multi_sport_mix`

- **Headline/title:** THREE DISCIPLINES, ONE DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Distribution of recorded discipline types across multisport legs. (`leg_sport_mix`)
- **Required eligibility:** leg type metadata
- **Required evidence:** activity_index.
- **Claim guard:** only supported formats
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1964).

#### TEMPLATE-132 · `template-multi_hr`

- **Headline/title:** THE EFFORT THROUGH EACH LEG
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR continuous or session summaries
- **Required evidence:** activity_index.
- **Claim guard:** avoid attributing HR to legs without timestamp alignment
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1979).

### Team Sports (8)

#### TEMPLATE-133 · `template-team_sessions`

- **Headline/title:** YOUR SEASON IN PLAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** recorded sessions, not matches won
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L1994).

#### TEMPLATE-134 · `template-team_time`

- **Headline/title:** TIME IN THE GAME
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid timer
- **Required evidence:** activity_index.
- **Claim guard:** recorded field time not minutes played
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2009).

#### TEMPLATE-135 · `template-team_type`

- **Headline/title:** YOUR GAME
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity distribution across validated sport subtypes. (`subtype_share`)
- **Required eligibility:** sport subtypes >=5
- **Required evidence:** activity_index.
- **Claim guard:** do not conflate codes
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2024).

#### TEMPLATE-136 · `template-team_hr`

- **Headline/title:** GAME-DAY EFFORT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR>=75%
- **Required evidence:** activity_index.
- **Claim guard:** not match scoring
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2039).

#### TEMPLATE-137 · `template-team_distance`

- **Headline/title:** DISTANCE ON THE FIELD
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of recorded sport distances, converted to km. (`distance_sum`)
- **Required eligibility:** valid GPS recording on >=80% of sessions
- **Required evidence:** activity_index.
- **Claim guard:** indoor court GPS often unreliable
- **Type:** template/concept; catalog story family `distance`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2054).

#### TEMPLATE-138 · `template-team_active`

- **Headline/title:** WEEKS YOU SUITED UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** consistent sport type
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2069).

#### TEMPLATE-139 · `template-team_longest`

- **Headline/title:** YOUR LONGEST RECORDED SESSION
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** could include training
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2084).

#### TEMPLATE-140 · `template-team_scores`

- **Headline/title:** THE RESULTS YOU REMEMBER
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Explicit team-match result metadata. (`verified_results`)
- **Required eligibility:** explicit match result metadata available
- **Required evidence:** activity_index.
- **Claim guard:** generic Garmin API does not guarantee team results
- **Type:** template/concept; catalog story family `achievement`; no working measured chart is presented.
- **Image layers:** [green](#image-green), [football](#image-football)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2099).

### Climbing (8)

#### TEMPLATE-141 · `template-climb_sessions`

- **Headline/title:** YOU KEPT CLIMBING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** recorded climbing sessions
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2114).

#### TEMPLATE-142 · `template-climb_time`

- **Headline/title:** TIME ON THE WALL
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** includes rests
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2129).

#### TEMPLATE-143 · `template-climb_sends`

- **Headline/title:** THE PROBLEMS YOU SENT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Count of explicit climbing sends with route identity. (`verified_send_count`)
- **Required eligibility:** explicit send data and route identity
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** split field numClimbSends may mean different things; verify
- **Type:** template/concept; catalog story family `achievement`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2144).

#### TEMPLATE-144 · `template-climb_falls`

- **Headline/title:** THE ATTEMPTS YOU LEARNED FROM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Count of explicitly recorded reliable climbing falls. (`verified_fall_count`)
- **Required eligibility:** explicit reliable fall counters
- **Required evidence:** activity_index, activity_fit_samples.
- **Claim guard:** avoid blame/shaming
- **Type:** template/concept; catalog story family `surprise`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2160).

#### TEMPLATE-145 · `template-climb_vertical`

- **Headline/title:** YOUR VERTICAL MOVEMENT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total valid recorded ascent. (`ascent_sum`)
- **Required eligibility:** valid ascent and climbing subtype
- **Required evidence:** activity_index.
- **Claim guard:** not number of completed routes
- **Type:** template/concept; catalog story family `terrain`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2176).

#### TEMPLATE-146 · `template-climb_longest`

- **Headline/title:** THE SESSION YOU STUCK WITH
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** not skill
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2191).

#### TEMPLATE-147 · `template-climb_month`

- **Headline/title:** THE MONTH YOU LIVED ON THE WALL
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Month with the highest relevant activity count/concentration. (`month_mode`)
- **Required eligibility:** >=8 sessions
- **Required evidence:** activity_index.
- **Claim guard:** recorded month
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2206).

#### TEMPLATE-148 · `template-climb_type`

- **Headline/title:** YOUR KIND OF CLIMB
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity distribution across validated sport subtypes. (`subtype_share`)
- **Required eligibility:** reliable type classification
- **Required evidence:** activity_index.
- **Claim guard:** bouldering vs rope
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [carabiner](#image-carabiner)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2221).

### Cardio (8)

#### TEMPLATE-149 · `template-cardio_sessions`

- **Headline/title:** A YEAR OF SHOWING UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** >=4 sessions
- **Required evidence:** activity_index.
- **Claim guard:** generic cardio umbrella
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2236).

#### TEMPLATE-150 · `template-cardio_minutes`

- **Headline/title:** YOU KEPT MOVING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** valid duration
- **Required evidence:** activity_index.
- **Claim guard:** recorded minutes
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2251).

#### TEMPLATE-151 · `template-cardio_zone`

- **Headline/title:** TIME WITH THE HEART RACING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** HR>=75%
- **Required evidence:** activity_index.
- **Claim guard:** do not infer health improvements
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2266).

#### TEMPLATE-152 · `template-cardio_top_mode`

- **Headline/title:** HOW YOU MOVED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Activity distribution across validated sport subtypes. (`subtype_share`)
- **Required eligibility:** >=8 sessions and subtype
- **Required evidence:** activity_index.
- **Claim guard:** differentiate stair, boxing, dance
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2281).

#### TEMPLATE-153 · `template-cardio_week`

- **Headline/title:** THE ROUTINE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of calendar weeks containing eligible activity. (`active_weeks`)
- **Required eligibility:** >=8 weeks
- **Required evidence:** activity_index.
- **Claim guard:** recorded activity
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2296).

#### TEMPLATE-154 · `template-cardio_longest`

- **Headline/title:** YOUR LONGEST CARDIO SESSION
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** >=3 sessions
- **Required evidence:** activity_index.
- **Claim guard:** duration only
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2311).

#### TEMPLATE-155 · `template-cardio_calorie`

- **Headline/title:** THE ENERGY YOU SPENT MOVING
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of usable recorded calorie estimates. (`calorie_sum`)
- **Required eligibility:** >=90% recorded calorie coverage
- **Required evidence:** activity_index.
- **Claim guard:** estimates not exact physiology
- **Type:** template/concept; catalog story family `volume`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2326).

#### TEMPLATE-156 · `template-cardio_peak`

- **Headline/title:** YOUR BIGGEST RECORDED PEAK
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Highest usable recorded activity heart rate. (`max_hr`)
- **Required eligibility:** >=4 heart-rate tracked sessions
- **Required evidence:** activity_index.
- **Claim guard:** not maximal HR medical assessment
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2341).

### Year & Health (20)

#### TEMPLATE-157 · `template-year_sessions`

- **Headline/title:** YOU SHOWED UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of eligible recorded sessions/rounds/events. (`session_count`)
- **Required eligibility:** complete activity index; >=1 eligible activity
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `opening`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [kettlebell](#image-kettlebell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2356).

#### TEMPLATE-158 · `template-year_sport_mix`

- **Headline/title:** MORE THAN ONE WAY TO MOVE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded activity counts across sport families. (`sport_distribution`)
- **Required eligibility:** complete index; classified >=95%; >=2 sports
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [shoe](#image-shoe-blue), [crank](#image-crank), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2371).

#### TEMPLATE-159 · `template-year_recorded_hours`

- **Headline/title:** TIME WELL SPENT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Total recorded duration for the scope. (`duration_sum`)
- **Required eligibility:** >=95% valid session duration and full index
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `foundation`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon), [bike-wheel](#image-bike-wheel), [bike-bars](#image-bike-bars)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2386).

#### TEMPLATE-160 · `template-year_active_days`

- **Headline/title:** DAYS YOU MADE TIME TO MOVE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Number of distinct local days containing the activity. (`active_days`)
- **Required eligibility:** index complete and valid local timestamps
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `foundation`; no working measured chart is presented.
- **Image layers:** [stairs](#image-stairs)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2401).

#### TEMPLATE-161 · `template-year_peak_month`

- **Headline/title:** THE MONTH YOU SHOWED UP MOST
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Month with the highest relevant activity count/concentration. (`month_mode`)
- **Required eligibility:** >=12 sessions; leading month >=20% higher than median
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [clock](#image-clock)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2416).

#### TEMPLATE-162 · `template-year_weekday`

- **Headline/title:** YOUR TRAINING DAY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most frequent weekday for eligible activities. (`weekday_mode`)
- **Required eligibility:** >=20 sessions; strong weekday preference
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [clock](#image-clock)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2431).

#### TEMPLATE-163 · `template-year_hour`

- **Headline/title:** YOUR HOUR OF MOVEMENT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Most common activity start-time bucket in local time. (`start_hour_mode`)
- **Required eligibility:** >=20 sessions; dominant time bucket >=45%
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [clock](#image-clock)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2446).

#### TEMPLATE-164 · `template-year_weekly_streak`

- **Headline/title:** YOUR LONGEST RUN OF WEEKS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest consecutive run of active calendar weeks. (`longest_weekly_streak`)
- **Required eligibility:** complete activity index; >=5 consecutive active weeks
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `habit`; no working measured chart is presented.
- **Image layers:** [clock](#image-clock)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2461).

#### TEMPLATE-165 · `template-year_hybrid`

- **Headline/title:** TWO SPORTS, ONE BIG YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Validated two-sport identity based on activity shares. (`dual_sport`)
- **Required eligibility:** top two sports jointly >=65%; each>=20%; count gap <=10 percentage points
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [open-water](#image-open-water), [goggles](#image-goggles), [crank](#image-crank), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2476).

#### TEMPLATE-166 · `template-year_dominant`

- **Headline/title:** THE SPORT YOU RETURNED TO MOST
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sport with a sufficiently strong observed activity-count lead. (`dominant_sport`)
- **Required eligibility:** top sport >=45% AND lead >=15 pp; >=10 sessions; other evidence
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2491).

#### TEMPLATE-167 · `template-year_top_time`

- **Headline/title:** THE SPORT THAT TOOK THE MOST TIME
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sport with the greatest supported recorded duration. (`sport_most_time`)
- **Required eligibility:** per-sport durations >=95%
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `identity`; no working measured chart is presented.
- **Image layers:** [gym-floor](#image-gym-floor), [rope](#image-rope)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2506).

#### TEMPLATE-168 · `template-year_longest_event`

- **Headline/title:** YOUR LONGEST SESSION
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Longest recorded activity duration. (`max_duration`)
- **Required eligibility:** complete index; valid session time
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `peak`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge), [road-ribbon](#image-road-ribbon)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2521).

#### TEMPLATE-169 · `template-year_sport_surprise`

- **Headline/title:** THEN THERE WAS THAT OTHER SPORT
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Eligible secondary sport not already highlighted. (`rare_sport`)
- **Required eligibility:** secondary sport >=3 sessions, not already spotlighted
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `surprise`; no working measured chart is presented.
- **Image layers:** [court](#image-court), [racket](#image-racket)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2536).

#### TEMPLATE-170 · `template-year_activity_pr`

- **Headline/title:** YOUR RECORDED PERSONAL BESTS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Count of explicit, verified personal-record markers. (`verified_pr_count`)
- **Required eligibility:** actual PR flags; no specific type without proof
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `achievement`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2551).

#### TEMPLATE-171 · `template-year_heart_zones`

- **Headline/title:** THE EFFORT BEHIND YOUR YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Recorded time spent in compatible heart-rate zones. (`zone_minutes`)
- **Required eligibility:** >=75% all tracked activity duration has compatible HR zones
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `intensity`; no working measured chart is presented.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2566).

#### TEMPLATE-172 · `template-year_steps`

- **Headline/title:** STEP BY STEP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sum of actual daily step measurements. (`daily_step_sum`)
- **Required eligibility:** >=330 days of actual step measurements; no missing-as-zero
- **Required evidence:** daily_wellness.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `wellness`; no working measured chart is presented.
- **Image layers:** [crosswalk](#image-crosswalk), [shoe](#image-shoe-blue)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2581).

#### TEMPLATE-173 · `template-year_resting_hr`

- **Headline/title:** YOUR HEART BETWEEN SESSIONS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Change in recorded resting HR across supported comparison periods. (`resting_hr_trend`)
- **Required eligibility:** >=20 valid days in each compared period and consent
- **Required evidence:** daily_wellness.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `wellness`; no working measured chart is presented.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2596).

#### TEMPLATE-174 · `template-year_body_battery`

- **Headline/title:** YOUR ENERGY ACROSS THE YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Trend of recorded Body Battery measurements. (`body_battery_trend`)
- **Required eligibility:** >=80% daily BB coverage and explicit opt-in
- **Required evidence:** daily_wellness.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `wellness`; no working measured chart is presented.
- **Image layers:** [orange](#image-orange)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2611).

#### TEMPLATE-175 · `template-year_sleep`

- **Headline/title:** YOUR NIGHTS, RECORDED
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Trend in recorded sleep across supported periods. (`sleep_trend`)
- **Required eligibility:** >=80% valid sleep days and explicit opt-in
- **Required evidence:** daily_wellness.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `wellness`; no working measured chart is presented.
- **Image layers:** [pillow](#image-pillow)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2626).

#### TEMPLATE-176 · `template-year_finale`

- **Headline/title:** YOUR YEAR, YOUR STORY
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Collection of verified facts from the recorded year. (`year_summary`)
- **Required eligibility:** >=1 verified personal fact
- **Required evidence:** activity_index.
- **Claim guard:** Evidence trace, exact period and quality checks required; avoid false population, medical or emotional claims.
- **Type:** template/concept; catalog story family `finale`; no working measured chart is presented.
- **Image layers:** [shoe](#image-shoe-blue), [crank](#image-crank), [dumbbell](#image-dumbbell)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json#L2641).

### More Health & Movement (8)

#### TEMPLATE-177 · `template-extra-recovery`

- **Headline/title:** THE QUIETER DAYS
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Daily stress records with adequate coverage.
- **Required eligibility:** Daily stress records with adequate coverage.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** [bench](#image-bench)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L6).

#### TEMPLATE-178 · `template-extra-hrv`

- **Headline/title:** YOUR NIGHTLY RHYTHM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Supported overnight HRV records; no diagnostic interpretation.
- **Required eligibility:** Supported overnight HRV records; no diagnostic interpretation.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** No photographic image is loaded for this card; content is a metric or chart with code-generated geometry.
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L7).

#### TEMPLATE-179 · `template-extra-hydration`

- **Headline/title:** EVERY SIP ADDS UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Explicitly logged hydration with units and known coverage.
- **Required eligibility:** Explicitly logged hydration with units and known coverage.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** [water](#image-water)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L8).

#### TEMPLATE-180 · `template-extra-nutrition`

- **Headline/title:** FUEL FOR YOUR YEAR
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** An approved nutrition source with actual logged records.
- **Required eligibility:** An approved nutrition source with actual logged records.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** [orange](#image-orange)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L9).

#### TEMPLATE-181 · `template-extra-sleep-timing`

- **Headline/title:** WHEN YOU SWITCHED OFF
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Sleep start/end timestamps with timezone and coverage.
- **Required eligibility:** Sleep start/end timestamps with timezone and coverage.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** [pillow](#image-pillow)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L10).

#### TEMPLATE-182 · `template-extra-sleep-consistency`

- **Headline/title:** FINDING YOUR RHYTHM
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Enough recorded nights for a validated timing distribution.
- **Required eligibility:** Enough recorded nights for a validated timing distribution.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** [pillow](#image-pillow)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L11).

#### TEMPLATE-183 · `template-extra-energy`

- **Headline/title:** YOUR DAILY RECHARGE
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Supported Body Battery samples; no invented recovery score.
- **Required eligibility:** Supported Body Battery samples; no invented recovery score.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** [orange](#image-orange)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L12).

#### TEMPLATE-184 · `template-extra-elevation`

- **Headline/title:** ALL THE WAY UP
- **Current presented data:** `—` / `DATA REQUIRED` (placeholder).
- **Intended metric:** Valid recorded ascent; meaningful outdoor elevation only.
- **Required eligibility:** Valid recorded ascent; meaningful outdoor elevation only.
- **Required evidence:** Source availability and permission must be validated.
- **Claim guard:** Concept only. Source/API support is unconfirmed.
- **Type:** template/concept; catalog story family `concept`; no working measured chart is presented.
- **Image layers:** [ridge](#image-ridge)
- **Source:** [catalog or extension](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs#L13).

## 5. Image library — all 158 file paths

### 5.1 Preferred layered artwork: 35 reusable image subjects / environment fragments

All 35 delivery images below were visually inspected and contain transparency. Use the **WebP** in the app or import the corresponding **PNG source** into Figma. GitHub preview links open the asset page; Raw links open the image bytes. The 35 PNG source paths and 35 WebP paths account for 70 of the 158 image-file paths.

Root-level alternatives and flattened references are catalogued separately below. Photo subjects contain no live typography or metrics. Decorative curves/shapes in examples are generated by code; they are not additional image files or measured routes.

<a id="image-ball"></a>

#### `ball`

- **Description:** Lavender exercise/stability ball with ribbed texture, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** pilates.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/ball.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/ball.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/ball.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/ball.png).

<a id="image-bench"></a>

#### `bench`

- **Description:** Wooden park bench with dark metal arms and legs, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** recovery.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/bench.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/bench.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/bench.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/bench.png).

<a id="image-bike-bars"></a>

#### `bike-bars`

- **Description:** Black drop handlebars with brake levers, isolated horizontally on transparency.
- **Delivery dimensions:** 1536 × 1024 px; transparent WebP.
- **Used by visual families:** cycling.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/bike-bars.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/bike-bars.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/bike-bars.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/bike-bars.png).

<a id="image-bike-wheel"></a>

#### `bike-wheel`

- **Description:** Black road-bike wheel, tire, spokes and hub in three-quarter view, isolated on transparency.
- **Delivery dimensions:** 1024 × 1536 px; transparent WebP.
- **Used by visual families:** cycling.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/bike-wheel.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/bike-wheel.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/bike-wheel.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/bike-wheel.png).

<a id="image-boot"></a>

#### `boot`

- **Description:** Tan hiking boot with red laces and a thick black sole, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** hiking.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/boot.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/boot.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/boot.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/boot.png).

<a id="image-carabiner"></a>

#### `carabiner`

- **Description:** Silver locking carabiner with a red/orange climbing-rope loop, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** climbing.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/carabiner.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/carabiner.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/carabiner.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/carabiner.png).

<a id="image-clock"></a>

#### `clock`

- **Description:** Black twin-bell analogue alarm clock with a cream face, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** calendar, morning.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/clock.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/clock.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/clock.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/clock.png).

<a id="image-court"></a>

#### `court`

- **Description:** Irregular cutout fragment of blue/orange hard court and white line markings.
- **Delivery dimensions:** 1536 × 1024 px; transparent WebP.
- **Used by visual families:** racket.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/court.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/court.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/court.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/court.png).

<a id="image-crank"></a>

#### `crank`

- **Description:** Black/silver bicycle chainring, crank, pedal and chain, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** finale, miniwatt, mix, triathlon.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/crank.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/crank.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/crank.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/crank.png).

<a id="image-crosswalk"></a>

#### `crosswalk`

- **Description:** Irregular fragment of dark wet asphalt and white crossing stripes, lit by warm low sunlight.
- **Delivery dimensions:** 1536 × 1024 px; transparent WebP.
- **Used by visual families:** walking.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/crosswalk.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/crosswalk.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/crosswalk.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/crosswalk.png).

<a id="image-dumbbell"></a>

#### `dumbbell`

- **Description:** Single black hexagonal dumbbell with a silver handle, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** finale, mix, strength.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/dumbbell.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/dumbbell.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/dumbbell.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/dumbbell.png).

<a id="image-elliptical"></a>

#### `elliptical`

- **Description:** Black elliptical exercise machine with pedals, handles and console, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** elliptical.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/elliptical.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/elliptical.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/elliptical.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/elliptical.png).

<a id="image-football"></a>

#### `football`

- **Description:** Weathered black-and-white football/soccer ball, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** team_sports.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/football.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/football.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/football.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/football.png).

<a id="image-goggles"></a>

#### `goggles`

- **Description:** Turquoise swimming goggles with a yellow strap, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** swimming, triathlon.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/goggles.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/goggles.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/goggles.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/goggles.png).

<a id="image-golf-ball"></a>

#### `golf-ball`

- **Description:** White dimpled golf ball in three-quarter view, isolated on transparency.
- **Delivery dimensions:** 1290 × 1219 px; transparent WebP.
- **Used by visual families:** golf.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/golf-ball.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/golf-ball.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/golf-ball.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/golf-ball.png).

<a id="image-golf-club"></a>

#### `golf-club`

- **Description:** Silver golf iron with a black grip, diagonally isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** golf.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/golf-club.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/golf-club.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/golf-club.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/golf-club.png).

<a id="image-green"></a>

#### `green`

- **Description:** Irregular wide cutout of sunlit green grass / putting-green terrain.
- **Delivery dimensions:** 1672 × 941 px; transparent WebP.
- **Used by visual families:** golf, team_sports.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/green.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/green.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/green.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/green.png).

<a id="image-gym-floor"></a>

#### `gym-floor`

- **Description:** Irregular wide cutout of dark rubber gym flooring with warm sunlight.
- **Delivery dimensions:** 1672 × 941 px; transparent WebP.
- **Used by visual families:** cardio, hiit, strength.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/gym-floor.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/gym-floor.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/gym-floor.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/gym-floor.png).

<a id="image-kettlebell"></a>

#### `kettlebell`

- **Description:** Black cast-iron kettlebell with rounded handle, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** hiit.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/kettlebell.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/kettlebell.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/kettlebell.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/kettlebell.png).

<a id="image-mat"></a>

#### `mat`

- **Description:** Partly unrolled mint-green exercise/yoga mat, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** pilates, yoga.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/mat.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/mat.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/mat.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/mat.png).

<a id="image-oar"></a>

#### `oar`

- **Description:** Long black-shaft oar/paddle with a blue blade, isolated diagonally on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** rowing.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/oar.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/oar.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/oar.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/oar.png).

<a id="image-open-water"></a>

#### `open-water`

- **Description:** Irregular portrait cutout of dark-blue open-water waves with bright foam and warm highlights.
- **Delivery dimensions:** 1024 × 1535 px; transparent WebP.
- **Used by visual families:** rowing, triathlon.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/open-water.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/open-water.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/open-water.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/open-water.png).

<a id="image-orange"></a>

#### `orange`

- **Description:** Whole orange with green leaves beside a cut orange half, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** energy, nutrition.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/orange.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/orange.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/orange.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/orange.png).

<a id="image-pillow"></a>

#### `pillow`

- **Description:** Soft white pillow with visible folds and fabric shading, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** sleep.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/pillow.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/pillow.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/pillow.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/pillow.png).

<a id="image-pool-water"></a>

#### `pool-water`

- **Description:** Irregular turquoise pool-water cutout with ripples and dark underwater lane markings.
- **Delivery dimensions:** 1143 × 1376 px; transparent WebP.
- **Used by visual families:** swimming.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/pool-water.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/pool-water.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/pool-water.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/pool-water.png).

<a id="image-racket"></a>

#### `racket`

- **Description:** Blue tennis racket with yellow strings and a yellow-green ball, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** racket.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/racket.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/racket.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/racket.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/racket.png).

<a id="image-ridge"></a>

#### `ridge`

- **Description:** Jagged blue-grey alpine mountain ridge with snowy peaks; transparent sky above, straight source lower edge.
- **Delivery dimensions:** 1536 × 1024 px; transparent WebP.
- **Used by visual families:** climbing, cover, cycling, elevation, hiking, longest, skiing.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/ridge.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/ridge.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/ridge.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/ridge.png).

<a id="image-road-ribbon"></a>

#### `road-ribbon`

- **Description:** Winding S-shaped asphalt road isolated from its surroundings, with transparent background.
- **Delivery dimensions:** 1024 × 1536 px; transparent WebP.
- **Used by visual families:** cover, cycling, longest.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/road-ribbon.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/road-ribbon.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/road-ribbon.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/road-ribbon.png).

<a id="image-rope"></a>

#### `rope`

- **Description:** Black jump rope with two coral-red handles, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** cardio.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/rope.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/rope.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/rope.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/rope.png).

<a id="image-running-track"></a>

#### `running-track`

- **Description:** Curving red athletics-track fragment with white lane lines and transparent surroundings.
- **Delivery dimensions:** 1157 × 1359 px; transparent WebP.
- **Used by visual families:** running.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/running-track.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/running-track.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/running-track.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/running-track.png).

<a id="image-shoe-blue"></a>

#### `shoe-blue`

- **Description:** Cobalt-blue running shoe with warm-white midsole, seen diagonally in three-quarter view; transparent background.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** finale, mix, running, triathlon, walking.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/shoe-blue.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/shoe-blue.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/shoe-blue.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/shoe-blue.png).

<a id="image-skis"></a>

#### `skis`

- **Description:** Crossed white skis with orange tips, black bindings and details, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** skiing.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/skis.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/skis.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/skis.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/skis.png).

<a id="image-stairs"></a>

#### `stairs`

- **Description:** Short flight of grey concrete steps, isolated in perspective on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** active.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/stairs.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/stairs.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/stairs.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/stairs.png).

<a id="image-studio-floor"></a>

#### `studio-floor`

- **Description:** Irregular sunlit beige movement-studio floor fragment with soft dappled shadows.
- **Delivery dimensions:** 1536 × 1024 px; transparent WebP.
- **Used by visual families:** elliptical, pilates, yoga.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/studio-floor.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/studio-floor.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/studio-floor.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/studio-floor.png).

<a id="image-water"></a>

#### `water`

- **Description:** Clear blue-capped sports water bottle surrounded by a splash, isolated on transparency.
- **Delivery dimensions:** 1254 × 1254 px; transparent WebP.
- **Used by visual families:** hydration.
- **Links:** [WebP preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/water.webp) · [Raw WebP](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/layers/water.webp) · [PNG source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/water.png) · [Raw PNG](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/layers/water.png).

### 5.2 Root-level / earlier delivery images: all 36 files

Many root files are byte-identical delivery copies of the preferred layered subjects. They remain available, but the current recap card renderer resolves its 35 subject/environment keys to `assets/layers/…`. Onboarding and loading use root `shoe-blue.webp`. Nine opaque scene photographs, the original pink shoe, the combined golf object and the earlier opaque road/track photographs are alternatives/reference assets, not newly implemented card types.

| File | Description / current role | Dimensions / alpha | Links |
| --- | --- | --- | --- |
| `ball.webp` | Lavender exercise/stability ball with ribbed texture, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/ball.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/ball.webp) |
| `bench.webp` | Wooden park bench with dark metal arms and legs, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/bench.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/bench.webp) |
| `boot.webp` | Tan hiking boot with red laces and a thick black sole, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/boot.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/boot.webp) |
| `carabiner.webp` | Silver locking carabiner with a red/orange climbing-rope loop, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/carabiner.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/carabiner.webp) |
| `clock.webp` | Black twin-bell analogue alarm clock with a cream face, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/clock.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/clock.webp) |
| `crank.webp` | Black/silver bicycle chainring, crank, pedal and chain, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/crank.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/crank.webp) |
| `dumbbell.webp` | Single black hexagonal dumbbell with a silver handle, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/dumbbell.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/dumbbell.webp) |
| `elliptical.webp` | Black elliptical exercise machine with pedals, handles and console, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/elliptical.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/elliptical.webp) |
| `football.webp` | Weathered black-and-white football/soccer ball, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/football.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/football.webp) |
| `goggles.webp` | Turquoise swimming goggles with a yellow strap, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/goggles.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/goggles.webp) |
| `golf.webp` | Combined golf iron, ball and tee cutout. Earlier combined subject; current golf composition uses separate club/ball layers. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/golf.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/golf.webp) |
| `kettlebell.webp` | Black cast-iron kettlebell with rounded handle, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/kettlebell.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/kettlebell.webp) |
| `mat.webp` | Partly unrolled mint-green exercise/yoga mat, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/mat.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/mat.webp) |
| `oar.webp` | Long black-shaft oar/paddle with a blue blade, isolated diagonally on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/oar.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/oar.webp) |
| `orange.webp` | Whole orange with green leaves beside a cut orange half, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/orange.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/orange.webp) |
| `pillow.webp` | Soft white pillow with visible folds and fabric shading, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/pillow.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/pillow.webp) |
| `racket.webp` | Blue tennis racket with yellow strings and a yellow-green ball, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/racket.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/racket.webp) |
| `ridge.webp` | Jagged blue-grey alpine mountain ridge with snowy peaks; transparent sky above, straight source lower edge. Byte-identical to layered WebP. | 1536×1024; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/ridge.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/ridge.webp) |
| `road-ribbon.webp` | Winding S-shaped asphalt road isolated from its surroundings, with transparent background. Byte-identical to layered WebP. | 1024×1536; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/road-ribbon.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/road-ribbon.webp) |
| `road.webp` | Opaque portrait photograph of a winding alpine road among trees and mountains. Historical alternative; current composition uses separate ridge and road-ribbon cutouts. | 1024×1536; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/road.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/road.webp) |
| `rope.webp` | Black jump rope with two coral-red handles, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/rope.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/rope.webp) |
| `scene-court.webp` | Opaque portrait of empty blue/orange hard tennis court with white lines and warm side light. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-court.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-court.webp) |
| `scene-green.webp` | Opaque portrait of an empty sunlit golf green with distant mountains and sunset sky. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-green.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-green.webp) |
| `scene-gym.webp` | Opaque portrait of empty dark rubber gym flooring with warm light from windows. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-gym.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-gym.webp) |
| `scene-pool.webp` | Opaque portrait of turquoise lap-pool lanes at sunset, viewed low over the water. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-pool.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-pool.webp) |
| `scene-rock.webp` | Opaque portrait of a rocky mountain ridge/face with clouds and distant peaks. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-rock.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-rock.webp) |
| `scene-snow.webp` | Opaque portrait of groomed alpine snow and mountain peaks under blue sky. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-snow.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-snow.webp) |
| `scene-studio.webp` | Opaque portrait of a warm beige empty movement studio with sunlit floor and dappled shadows. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-studio.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-studio.webp) |
| `scene-urban.webp` | Opaque portrait of wet city paving/crosswalk at golden hour with skyline. | 941×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-urban.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-urban.webp) |
| `scene-water.webp` | Opaque portrait of dark open-water waves and warm sunset horizon. | 940×1672; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-water.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/scene-water.webp) |
| `shoe-blue.webp` | Cobalt-blue running shoe with warm-white midsole, seen diagonally in three-quarter view; transparent background. Byte-identical to layered WebP. This root path is used by onboarding/loading. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/shoe-blue.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/shoe-blue.webp) |
| `shoe.webp` | Original coral/pink running shoe with warm-white sole; transparent. Earlier color alternative to current blue shoe. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/shoe.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/shoe.webp) |
| `skis.webp` | Crossed white skis with orange tips, black bindings and details, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/skis.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/skis.webp) |
| `stairs.webp` | Short flight of grey concrete steps, isolated in perspective on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/stairs.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/stairs.webp) |
| `track.webp` | Opaque portrait photograph of a curved red running track with white lane lines. Earlier alternative; current running composition uses a transparent track fragment. | 1024×1536; opaque | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/track.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/track.webp) |
| `water.webp` | Clear blue-capped sports water bottle surrounded by a splash, isolated on transparency. Byte-identical to layered WebP. | 1254×1254; transparent | [Preview](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/water.webp) · [Raw](https://raw.githubusercontent.com/nsmet/garmin-wrapped/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/assets/water.webp) |

### 5.3 Flattened reference screenshots and design explorations: all 48 files

These files are visual references with already-baked composition and often fictional text/values. They are not reusable foreground cutouts and are not additional app screens. `layered-preview` captures show example cards; sport poster drafts show earlier concept cards. Older homepage/branding screenshots may differ from the current UI markup.

| Reference file | Description / purpose | Dimensions | Link |
| --- | --- | --- | --- |
| `output/brand-refinement-preview.jpg` | Earlier desktop year-cover composition: warm paper, mountain/road cutouts, orange disk and pink ribbon; branding reference. | 1280×720 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/brand-refinement-preview.jpg) |
| `output/garmin-wrapped-homepage.png` | Earlier complete desktop homepage/connect layout with blue shoe/track poster and key form; not the exact current landing copy. | 1280×984 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/garmin-wrapped-homepage.png) |
| `output/layered-preview/all-sports.png` | Contact sheet of the layered sport artwork across multiple cards. | 1220×2524 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/all-sports.png) |
| `output/layered-preview/desktop-cycling-distance.png` | Desktop / wide live-renderer reference: cycling distance. | 1440×900 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/desktop-cycling-distance.png) |
| `output/layered-preview/desktop-hiit-sessions.png` | Desktop / wide live-renderer reference: hiit sessions. | 1440×900 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/desktop-hiit-sessions.png) |
| `output/layered-preview/desktop-running-hours.png` | Desktop / wide live-renderer reference: running hours. | 1440×900 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/desktop-running-hours.png) |
| `output/layered-preview/desktop-running-sessions.png` | Desktop / wide live-renderer reference: running sessions. | 1440×900 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/desktop-running-sessions.png) |
| `output/layered-preview/desktop-year-summary.png` | Desktop / wide live-renderer reference: year summary. | 1440×900 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/desktop-year-summary.png) |
| `output/layered-preview/mobile-cycling-distance.png` | Mobile portrait live-renderer reference: cycling distance. | 390×844 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/mobile-cycling-distance.png) |
| `output/layered-preview/mobile-hiit-sessions.png` | Mobile portrait live-renderer reference: hiit sessions. | 390×844 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/mobile-hiit-sessions.png) |
| `output/layered-preview/mobile-resting-hr-monthly.png` | Mobile portrait live-renderer reference: resting hr monthly. | 390×844 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/mobile-resting-hr-monthly.png) |
| `output/layered-preview/mobile-running-hours.png` | Mobile portrait live-renderer reference: running hours. | 390×844 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/mobile-running-hours.png) |
| `output/layered-preview/mobile-running-sessions.png` | Mobile portrait live-renderer reference: running sessions. | 390×844 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/mobile-running-sessions.png) |
| `output/layered-preview/mobile-strength-sessions.png` | Mobile portrait live-renderer reference: strength sessions. | 390×844 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/mobile-strength-sessions.png) |
| `output/layered-preview/mobile-year-summary.png` | Mobile portrait live-renderer reference: year summary. | 390×844 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/layered-preview/mobile-year-summary.png) |
| `output/mini-watt-closing-slide.png` | MINI WATT closing promotional slide; cobalt/yellow, crank/track artwork, download CTA and offer details. | 696×792 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/mini-watt-closing-slide.png) |
| `output/mini-watt-credit.png` | Earlier homepage capture showing MINI WATT product credit and blue-shoe poster. | 696×792 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/mini-watt-credit.png) |
| `output/reconnect-preview.png` | Earlier connect/reconnect landing layout with key form and shoe poster; reference rather than canonical current headline. | 941×1314 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/reconnect-preview.png) |
| `output/share-card-picker.jpg` | Share dialog screenshot with portrait preview, card thumbnails, color choices and download button. | 1280×720 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/share-card-picker.jpg) |
| `output/sport-design-drafts/cardio.png` | Flattened art-direction draft with fictional data: Jump rope against gym floor; large session count and energetic colored pulse planes. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/cardio.png) |
| `output/sport-design-drafts/climbing.png` | Flattened art-direction draft with fictional data: Rock face, carabiner/rope and colored climbing holds; session-count poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/climbing.png) |
| `output/sport-design-drafts/cycling.png` | Flattened art-direction draft with fictional data: Road bike/wheel and handlebars against alpine road/mountains; distance poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/cycling.png) |
| `output/sport-design-drafts/elliptical.png` | Flattened art-direction draft with fictional data: Elliptical machine against studio imagery; recorded-hours poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/elliptical.png) |
| `output/sport-design-drafts/golf.png` | Flattened art-direction draft with fictional data: Golf ball/club/flag on green with mountains; rounds poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/golf.png) |
| `output/sport-design-drafts/hiit.png` | Flattened art-direction draft with fictional data: Black kettlebell and gym floor with lightning-like colored planes; session poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/hiit.png) |
| `output/sport-design-drafts/hiking.png` | Flattened art-direction draft with fictional data: Rocky trail, boot/landscape and mountain geometry; distance poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/hiking.png) |
| `output/sport-design-drafts/pilates.png` | Flattened art-direction draft with fictional data: Exercise ball and rolled mat on studio floor; session poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/pilates.png) |
| `output/sport-design-drafts/racket.png` | Flattened art-direction draft with fictional data: Tennis racket and ball over hard-court setting; session poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/racket.png) |
| `output/sport-design-drafts/rowing.png` | Flattened art-direction draft with fictional data: Oar/blade and open-water wake with angular bands; hours poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/rowing.png) |
| `output/sport-design-drafts/running.png` | Flattened art-direction draft with fictional data: Blue running shoe over red track with ribbon geometry; distance poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/running.png) |
| `output/sport-design-drafts/skiing.png` | Flattened art-direction draft with fictional data: Crossed skis and alpine snow/mountain setting; distance poster. | 940×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/skiing.png) |
| `output/sport-design-drafts/strength.png` | Flattened art-direction draft with fictional data: Dumbbells/weight plates on gym floor with stacked geometry; session poster. | 940×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/strength.png) |
| `output/sport-design-drafts/swimming.png` | Flattened art-direction draft with fictional data: Goggles over pool water/lanes; distance poster. | 940×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/swimming.png) |
| `output/sport-design-drafts/team-sports.png` | Flattened art-direction draft with fictional data: Football on playing-field turf with stadium/graphic background; session poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/team-sports.png) |
| `output/sport-design-drafts/triathlon.png` | Flattened art-direction draft with fictional data: Goggles, bicycle wheel and running shoe across linked sport environments; session poster. | 1024×1536 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/triathlon.png) |
| `output/sport-design-drafts/walking.png` | Flattened art-direction draft with fictional data: Walking shoe and city/crosswalk setting with diagonal color bands; distance poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/walking.png) |
| `output/sport-design-drafts/yoga.png` | Flattened art-direction draft with fictional data: Rolled mat in warm studio with calm arches/circles; session poster. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-design-drafts/yoga.png) |
| `output/sport-hours-designs.jpg` | Contact sheet of sport-specific hours-card compositions. | 1280×2688 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-hours-designs.jpg) |
| `output/sport-hours-live.jpg` | Desktop strength-hours card showing hero hours and two supporting measurements. | 1280×720 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-hours-live.jpg) |
| `output/sport-hours-preview.jpg` | Wide contact sheet comparing multiple sport-hours compositions. | 1150×580 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/sport-hours-preview.jpg) |
| `output/style-exploration/one_line-cycling.png` | Alternative continuous sculptural ribbon visual exploration for cycling; flattened concept with fictional statistics, not current UI. | 1586×992 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/one_line-cycling.png) |
| `output/style-exploration/one_line-nutrition.png` | Alternative continuous sculptural ribbon visual exploration for nutrition; flattened concept with fictional statistics, not current UI. | 1586×992 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/one_line-nutrition.png) |
| `output/style-exploration/one_line-sleep.png` | Alternative continuous sculptural ribbon visual exploration for sleep; flattened concept with fictional statistics, not current UI. | 1586×992 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/one_line-sleep.png) |
| `output/style-exploration/one_line-summary.png` | Alternative continuous sculptural ribbon visual exploration for summary; flattened concept with fictional statistics, not current UI. | 941×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/one_line-summary.png) |
| `output/style-exploration/softform-cycling.png` | Alternative soft rounded 3D form visual exploration for cycling; flattened concept with fictional statistics, not current UI. | 1586×992 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/softform-cycling.png) |
| `output/style-exploration/softform-nutrition.png` | Alternative soft rounded 3D form visual exploration for nutrition; flattened concept with fictional statistics, not current UI. | 1586×992 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/softform-nutrition.png) |
| `output/style-exploration/softform-sleep.png` | Alternative soft rounded 3D form visual exploration for sleep; flattened concept with fictional statistics, not current UI. | 1586×992 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/softform-sleep.png) |
| `output/style-exploration/softform-summary.png` | Alternative soft rounded 3D form visual exploration for summary; flattened concept with fictional statistics, not current UI. | 940×1672 | [View](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/output/style-exploration/softform-summary.png) |

### 5.4 Other image files: 4

| File | Description / role | Link |
| --- | --- | --- |
| `track-record-stories/public/social-preview.jpg` | 1200×630 social/SEO image: cream poster, blue shoe, colored track motif, Garmin year headline and MINI WATT credit; contains no personal recap data. | [View / source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/social-preview.jpg) |
| `track-record-stories/public/favicon.svg` | Small SVG site icon; branding/UI asset rather than a card illustration. | [View / source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/favicon.svg) |
| `track-record-stories/source-assets/road-original.png` | Original opaque alpine-road photograph source; historical reference for root road.webp. | [View / source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/road-original.png) |
| `track-record-stories/source-assets/track-original.png` | Original opaque running-track photograph source; historical reference for root track.webp. | [View / source](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/source-assets/track-original.png) |

Image count check: 35 layered WebPs + 35 matching PNG sources + 36 root WebPs + 48 output references + 4 other image files = **158 paths**, representing **135 distinct Git blob contents**. Byte-identical copies are retained as separate available paths. The PNG sources for these 35 subjects are listed in section 5.1; this avoids duplicating the same description for both formats.

## 6. Content coverage and external destinations

- Preserve every runtime card ID and every `template-…` library ID. They identify distinct entries even when a theme overlaps.
- Construct each admitted runtime card from its required data fields, unit, qualifier, caption, sample counts and optional chart payload.
- A template currently presents its placeholder fields only. Its intended metric and eligibility are reference information, not evidence that the calculator is implemented.
- Asset sections enumerate reusable transparent subjects, matching PNG sources, earlier delivery copies, alternate scene photographs, flattened reference captures and other image files separately.
- The 50 interface/state items are coverage entries rather than 50 independent URL pages. State variants include loading/error messages, consent return paths, filtering, source warnings, disclosure content and browser capability differences.
- Garmin API-key creation/replacement, Garmin activity detail pages, the MINI WATT download page, browser download UI and native OS sharing are external destinations. They are not additional Garmin Wrapped screens.

## 7. Primary implementation references

- [track-record-stories/ui/index.html](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ui/index.html)
- [track-record-stories/public/onboarding.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/onboarding.mjs)
- [track-record-stories/public/app.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/app.mjs)
- [track-record-stories/public/metrics.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/metrics.mjs)
- [track-record-stories/public/story-content.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-content.mjs)
- [track-record-stories/public/story-catalog.json](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-catalog.json)
- [track-record-stories/public/story-library.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/story-library.mjs)
- [track-record-stories/public/visual-system.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/visual-system.mjs)
- [track-record-stories/public/layered-art.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/layered-art.mjs)
- [track-record-stories/public/data-poster.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/data-poster.mjs)
- [track-record-stories/public/duration-posters.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/duration-posters.mjs)
- [track-record-stories/public/share-card.mjs](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/public/share-card.mjs)
- [track-record-stories/LAYERED-ART.md](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/LAYERED-ART.md)
- [track-record-stories/ASSETS.md](https://github.com/nsmet/garmin-wrapped/blob/07c1b6052efa0134eca27fd7790426b0061d86e3/track-record-stories/ASSETS.md)

Implementation code takes precedence where older design/provenance documents describe previous layouts or integration status.
