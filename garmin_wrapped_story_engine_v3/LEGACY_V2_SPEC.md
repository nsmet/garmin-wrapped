# Garmin Wrapped — Story Engine V2 (story-only handoff)

**Purpose:** Build a deterministic, explainable editorial engine that turns an individual's recorded Garmin activities into a hyper-personalized year-in-sport narrative. **This handoff deliberately excludes graphic design, animations, UI components, design tokens and page layouts.** It defines content, calculations, eligibility, sequencing and data contracts only. A renderer can consume the output separately.

**Artifacts:** `catalog/sport_registry.json` (18 sport families), `catalog/story_catalog.json` (176 candidate story definitions), CSV equivalent, `contracts/metric_contract.json`, `contracts/story_output.example.json`, reference planner and tests, plus this source-of-truth specification.

**Important validation context:** The provided single-account Garmin audit for 2025 found 141 activities: HIIT 60, running 52, strength 13, indoor cycling 12, indoor rowing 4. Full-year activity pagination completed. Activity summaries contained sport type, distance, duration, elevation, heart-rate and related fields; sample ZIP/FIT files contained activity data. This proves availability on that account, **not** universal values, a commercial license, or every Garmin metric. Some sampled wellness data was missing. The Garmin Personal API is a personal access route, not approval for a public multi-user product.

## 1. North star: the story is the product

The engine should answer: *What did this specific person actually do? Which sports mattered most? What were their standout moments, recurring habits, surprising contrasts, and what can we say with confidence?* The output must sound like recognition, not a fitness report card. If two users have different records, both the story **selection** and **sequence** should change. If the same data is processed twice with the same catalog and rules, output should be reproducible.

Non-negotiable invariants:

1. **Only recorded facts or faithfully qualified comparisons.** No inferred motives, injuries, competition rankings, health improvements, friends, weather, or gender. Never equate one account's sparse Garmin history with everything the person did.
2. **One editorial point per story.** Each selected story has a clear hook, one principal claim and optional short explanation. The final summary may mention several verified facts.
3. **Data presence controls story selection.** No placeholders, invented zeroes, or reassurance screens inside the recap.
4. **Sport-first personalization.** Every sufficiently represented sport may receive dedicated stories; a prominent sport gets a deeper chapter, and underrepresented sports get a short mention or no story.
5. **Absence is not rest.** Days with no recorded workouts are not necessarily rest days; no measurement is not zero, and a null sensor field does not prove unsupported Garmin functionality.
6. **Separate factual truth, interpretation and copy.** Calculations are tested; candidate ranking is explainable; copy is templated and validated. Generative copy is optional later, not necessary.
7. **No forced scene count.** Make an honest, varied recap even if shorter. Don't add filler to hit a quota.
8. **Privacy by default.** Raw GPS and sensitive wellness stay private; default share output contains only share-safe derived claims.

## 2. End-to-end story production flow

```text
Approved input / Garmin adapter
  → full-year activity index with pagination proof
  → canonical classification + deduplication
  → multi-sport session/leg accounting
  → data-quality ledger + coverage ledger
  → base metric registry (year + individual sports)
  → *first-pass* identity and notable activity discovery
  → selective detail/FIT enrichment for high-value candidates
  → sport-specific metric calculators and revalidation
  → candidate generation from story catalog
  → evidence gates and omission reasons
  → significance scoring + editorial deduplication
  → favorite-sport / multi-sport narrative assignment
  → story chapter construction and overall dramatic arc
  → claim grammar / localization / privacy validation
  → JSON story plan with alternatives and reasoning trace
```

The engine **does not** authenticate to Garmin, store tokens, create images, animate scenes or render UI. It receives versioned, normalized data from an external acquisition layer and returns content/evidence only. Full-year pagination can use Garmin's known-working 20-item pages, but pagination details belong to the adapter.

### 2.1 Ingestion and activity identity

- Use review period `[year-01-01 00:00, next-year-01-01 00:00)` in **local timezone**, with explicit conversion to UTC. For 2026 prior to Dec 31 use a `partial_year` qualifier; do not produce full-year language.
- Deduplicate based on source activity ID and supported revision/parent relationships. A multisport parent activity is counted once in total activity count, while its run/bike/swim leg metrics can contribute to their respective sport totals **without counting additional sessions**. Separate `participation`, `event_count`, `leg_count`, `discipline_time`.
- Manual activities remain eligible for count and duration if credible; sensor-dependent metrics are ineligible unless recorded. Device errors and impossibly large values are quarantined, not used as records.
- Apply explicit sport mapping registry. Preserve raw Garmin `activityType.typeKey`, ID, FIT sport/subSport and original activity metadata internally. Unknown classifications stay `other/unknown` and don't silently become cardio.
- Store `indexComplete` independent from `fieldCoverage`. Having all 141 activities doesn't guarantee all distances/HR values are present.
- Preserve `recording_origin` and GPS/trainer differences; indoor cycling distance is trainer-reported, not physical travel.

### 2.2 Data-quality and completeness model

For **each metric**, represent:

| Evidence state | Meaning | Can create a numerical claim? |
|---|---|---|
| `verified` | Source data valid and required coverage met | Yes |
| `qualified` | Strong partial evidence; copy must constrain period or subset | Only with explicit qualification |
| `partial` | Some valid measurements but insufficient for total/trend | Usually no; use individual-event stories if valid |
| `absent` | Source explicitly contains no records for this measure | No |
| `unavailable` | Endpoint inaccessible or source permission denied | No |
| `unverified` | Could not verify semantics or calculate properly | No |
| `invalid` | Conflicting/corrupt/outlier records | No |

No substitution of missing values with `0`. A numeric value of `0` is legitimate *only if the data source recorded the zero and measurement semantics allow it*. All story claims require `observed_count`, `eligible_count`, `coverage`, `time_window`, `units`, `source_fields`, `calculation_version`, `quality_flags` and `confidence`.

**Suggested default gates (overridable per metric after research/testing):** annual totals require full activity index + 95% usable source fields; per-sport totals >=90% or 95% depending sensitivity; HR zone stories >=75% of tracked sport duration with compatible zones; comparisons need truly like-for-like segments and >=6 samples in each period; daily wellness year-wide stories need >=80% valid days (and avoid imprecise extrapolation). For *individual* records, one verified extreme among a **complete search space** suffices; a successful single sample does not prove a year's longest/fastest.

**Do not extrapolate** from 80% data into unobserved 20% to make impressive annual totals. For partials, either omit, or say “Across 243 recorded days…” only when that text is meaningful and explicit.

### 2.3 Metric families and calculation notes

These are conceptual metric APIs, not assertions that every Garmin account returns them. Registry keys:

- **Core:** `session_count`, `active_days`, `duration_sum`, `distance_sum`, `sport_distribution`, `subtype_share`, `active_weeks`, `active_months`, `longest_weekly_streak`, `max_distance`, `max_duration`, `max_sessions_day`, `max_elevation`, `ascent_sum`, `calorie_sum`.
- **Habits:** `weekday_mode`, `start_hour_mode`, `month_mode`, `season_mode`, `weekly_consistency`, `rare_sport`, `dual_sport`, `dominant_sport`, `sport_most_time`.
- **Effort:** `zone_minutes`, `upper_zone_minutes`, `max_hr`, `resting_hr_trend`, `intra_session_recovery`, `prepost_body_battery`, `body_battery_trend`, `sleep_trend`, `daily_step_sum`.
- **Sport-specific technical:** `cadence_distribution`, `power_curve`, `best_comparable_pace`, `matched_pace_change`, `matched_speed_change`, `stroke_sum`, `stroke_rate_distribution`, `pace500m`, `pace100m`, `pool_length_distribution`, `swolf_pattern`, `reps_sum`, `sets_sum`, `max_recorded_load`, `matched_load_progress`, `top_exercise`, `verified_send_count`, `verified_fall_count`, `round_score_distribution`, `best_comparable_round`, `match_results`, `leg_time_distribution`, `transition_time_sum`, `leg_count`, `leg_sport_mix`.
- **Geospatial:** `route_coverage`, `distinct_course_count`, `walking_distance`; all coordinates are sensitive and never part of default shared content.
- **Achievements:** `verified_pr_count`, `verified_results`, `recorded_run_count` (only where subtype metadata means actual runs/laps).

**Examples of strict semantics:** running pace = moving duration / valid distance (and present units), indoor trainer cycling distance is not literal geographic distance, HR peak is *highest recorded* not physiological maximum, exercise max weight is not 1RM, a PR flag identifies a Garmin-recognized personal record but does not identify its event/distance automatically, ski descent is not elevation gain. Heart-rate zone thresholds can change during the year, so zone aggregation must be versioned or framed as Garmin's recorded zones.

**Important FIT evidence:** Garmin documents FIT Activity `session`, `lap` and `record` messages with optional GPS, HR, power and other sensor measurements; multisport FIT activities can have multiple sessions/legs. A FIT message *definition* does not prove non-null measured samples, so verify values, timestamps, units and plausible distributions before using technical stories. See: https://developer.garmin.com/fit/file-types/activity

## 3. The 18 sport packs (3 flagship + 15 other common categories)

These are curated widely used Garmin sport families, **not a verified top-18 popularity ranking**. Garmin officially lists far more activity profiles, varying by device. Unmapped activity types are not silently dropped: they may use the generic fallback story pack until a dedicated pack is introduced. See https://support.garmin.com/en-GB/?faq=WIQlsZcN1K0cAyJDxPKzx6 and https://support.garmin.com/en-PH/?faq=7VN0kr7nxn4u4q4S18YDw8 .

| Sport pack | Distinctive stories to prioritize | Specialist requirement |
|---|---|---|
| **Running** | total distance, longest run, comparable pace, best weeks, hills, cadence, HR zones, running routes | GPS and cadence only where validated; trail/treadmill as subtypes |
| **Cycling** | hours, distance, longest ride, total ascent, watts, cadence, indoor vs outdoor, routes | power sensor required for watts; separate indoor vs outdoor |
| **HIIT** | sessions, zone 4–5 minutes, HR peaks, recorded interval patterns, recovery between bouts, weekly ritual | actual HR intervals/structured workout necessary |
| Strength training | reps, sets, exercise patterns, matched load progression, heaviest *recorded* set | actual exercise-level data, not just generic strength label |
| Walking | recorded distance, longest walk, walking habits, timing, routes | avoid duplicating daily steps into recorded walk totals |
| Hiking | biggest hike, elevation, ascent, trails, seasonality | valid GPS and altitude |
| Swimming | pool vs open water, length count/distance, time, pace/100m, strokes, SWOLF | pool metadata, stroke/sensor fields; water types not comparable |
| Rowing | rows, 500m pace, strokes, cadence, indoor vs water | pace/strokes must be actually measured |
| Yoga | mat time, routine, frequency, preferred day, longer sessions | no assumption of stress reduction or mindfulness outcome |
| Pilates | sessions, mat time, consistent weeks and times | don't infer skill/fitness improvement |
| Elliptical | recorded minutes, HR zones, session length, consistency | sensor-dependent effort metrics |
| Skiing & snowboarding | snow days, vertical, highest altitude, winter season, subtype | downhill descent vs cross-country ascent different metrics |
| Golf | rounds, course diversity, time, score if scorecards available | score and course info **not proven** in Personal API audit |
| Racket sports | tennis/padel/pickleball etc., time on court, heart rate, favored format | scores/wins not implied by activity logs |
| Triathlon / multisport | event count, swim/bike/run splits, transition times, event effort | correct FIT multi-session handling and no double count |
| Team sports | recorded sessions, time, HR, distance if reliable GPS | no imaginary matches, wins or goals |
| Climbing & bouldering | sessions, time, validated sends and falls, longest outing | require precise event semantics and coverage |
| Cardio & fitness | general cardio time, stair/jump-rope/boxing subtypes, HR, consistency | generic fallback without inventing a modality |

**Subtype handling:** sport family decides high-level identity; subtype may create deeper stories (trail vs road running; gravel/MTB vs road/indoor cycling; pool vs open-water swimming; erg vs rowing outdoors). Do **not** count subtypes as additional sports in high-level sport diversity. If a subtype is more defining than its parent, call it out explicitly: “Gravel defined your cycling year,” after verifying the classification and number of activities. A user could identify with an independent sport label such as gravel cycling; this is an editorial label over the same underlying canonical sport family.

**Catalog size:** 156 sport-specific candidate definitions plus 20 universal stories = **176**. Each entry includes sport, factual metric key, qualification/eligibility guideline, story family, sample hook, caveat and privacy default. Many are dormant for most accounts by design. The catalog is the menu, not a checklist that every user sees. Every human-readable gate must be ported to a typed validator before production.

## 4. Favorite sport detection — a critical product feature

Never automatically treat the top raw count as the user's subjective *favorite*. Prefer claims we can prove: **“Your most recorded sport,” “Your longest total training time,” “Your most consistent sport,”** or ask the user what they'd like featured. Use `favoriteSport` only when explicitly user-selected. User-selected preference can guide chapter priority, but **must not change factual metrics**.

### 4.1 Separate rankings, never force one answer

Calculate by sport family:

- `session_share`: fraction of unique recorded sessions (parent multisport events counted once overall, with legs separately tracked).
- `duration_share`: fraction of valid recorded sport duration.
- `active_week_share`: weeks with that sport, compared on an explicitly defined denominator.
- `subtype_share`: subtype breakdown within sport.
- `recency`: descriptive chronology only; no assumption more recent means favorite.

**Identity policy / suggested thresholds:**

1. If top sport >=45% of all activities, at least 10 sessions, and leads runner-up by at least 15 percentage points, name it **clear most-recorded sport**. This is *not* a subjective favorite.
2. If top two each >=20%, together >=65%, and within 10 percentage points, name them **dual headline sports**. Give both substantive chapters rather than crowning a winner.
3. If 3+ sports each represent >=15%, use **multisport / well-rounded year**.
4. Otherwise show a neutral “Your sport mix” narrative or only the sport with sufficient valid details.
5. If user explicitly selects a favorite sport and there are eligible activities in that sport, prioritize its chapter even if its recorded count is lower; do not say the logs prove it was dominant. Include a truthful “your chosen favorite” label.
6. Count and time can disagree. Example: “Most sessions: HIIT. Most hours: Cycling.” That contrast can be a great story, **provided both datasets are complete**.

**Real audit illustration:** HIIT 60/141 (42.6%); running 52/141 (36.9%). Gap ~5.7 percentage points. This is a **two-headliner year**, not enough evidence to insist HIIT was the person's favorite. Together they account for 112/141 (79.4%) of recorded activity. Strength, indoor cycling and indoor rowing deserve secondary, truthful moments when interesting details exist.

### 4.2 Identity is evidence, not psychology

Don't label a user “lazy,” “workaholic,” “obsessed,” “competitive,” “early riser” based on tiny sample counts. Gentle creative phrasing such as “You kept coming back to the track” can be generated if activity frequency warrants it; do not present a personality judgement as fact. A preference for morning workouts must be based on a meaningful number and distribution of local starts.

## 5. Story candidate scoring and selection

Story selection uses **hard factual gates first**, then scoring. No editorial score overrides missing source evidence. A proposed scoring rubric (0–100):

| Signal | Points | Meaning |
|---|---:|---|
| Factual reliability | 25 | Verified source, adequate coverage, unambiguous units |
| Personal relevance | 25 | Top sport, major portion of activity, genuine user interest |
| Notability | 15 | Strong personal peak/outlier or noteworthy pattern |
| Distinctiveness | 15 | Adds information not yet revealed |
| Narrative contribution | 10 | Fits a useful place in story progression |
| Discoverability / delight | 10 | Something user may not have noticed |

Selection constraints:

- Never select duplicate conclusions (annual running distance and “you ran N kilometers” are one claim).
- Penalize consecutive stories repeating sport **and** metric family, but favorite sport deserves multiple distinct stories.
- Reserve 2–4 deep sport-specific stories for each headline sport **if eligible** (larger share of content if meaningful); 0–2 for noteworthy secondary sports; universal stories fill remaining narrative roles.
- Avoid 3 consecutive session-count stories. For a sport chapter, try `introduction → distinctive effort/volume → achievement → unexpected insight` rather than `count → count → count`.
- Story sequence should not require GPS, HR, power, calories, sleep or gender.
- Shareability is not a factual ranking signal. Don't promote questionable numbers solely because they sound spectacular.
- Do not keep selecting near-identical claims from closely related subtypes (e.g. cycling total km followed immediately by indoor bike km); use a subtype contrast if truly meaningful.

Store each exclusion in a **private** `candidate_trace` with code: `MISSING_DATA`, `INSUFFICIENT_COVERAGE`, `INVALID_SOURCE`, `UNSUPPORTED_SEMANTICS`, `SENSITIVE_WITHOUT_CONSENT`, `NOT_DISTINCT`, `NOT_MEANINGFUL`, `SPORT_NOT_REPRESENTED`, `FULL_YEAR_NOT_COMPLETE`, `LOW_CONFIDENCE`, `DUPLICATE_MULTISPORT`, `NOT_IN_TOP_N`.

## 6. Story buildup and flow (content, not graphics)

### Narrative acts

| Act | Editorial job | Example story | Rules |
|---|---|---|---|
| **A. Arrival** | Recognize the year and scope | “This was your 2025 in motion” | Mark partial years |
| **B. Identity** | Give the real sporting profile | “You recorded 141 activities across five sports” | Annual index complete |
| **C. Headline sports** | Explore one or two most-represented disciplines | “HIIT dominated the session count; running was close behind” | Don't prematurely declare subjective favorite |
| **D. Deep chapters** | Show a peak or pattern unique to each headline sport | HIIT HR-zone habit, running longest run | Different metric families within a chapter |
| **E. Range / surprise** | Spotlight lesser-known sports or a cross-sport contrast | “And then there were 13 strength sessions” | Real supporting sport data |
| **F. Your exceptional moment** | Strongest well-evidenced highlight | Longest route, actual PR, most elevated ride | Reserve for meaningful, validated peak |
| **G. Reflection** | An optional softer contrast | Most consistent week, step pattern, wellness with consent | Never imply unrecorded days were rest |
| **H. Personal finale** | Summarize what makes this year's mix unique | “60 HIIT sessions. 52 runs. One year.” | 1–3 safe verified facts |

**Narrative variation:** a single-sport athlete receives a deeper sport chapter, perhaps habits → technical insight → peak → record; multi-sport athletes receive richer comparisons and crossover moments. A first-year or sparse user gets a short recap, not a punishing coverage disclaimer. For favorite chosen by user, prioritize that sport near the beginning; if the chosen sport has only two records, use a respectful brief mention instead of invented depth.

**Recommended lengths:** 8–14 main stories for a typical full dataset, 5–8 if sparse, occasionally up to 16 if there are genuinely unique sports or records. These are editorial guidelines, not quotas.

### Example flow — VERIFIED 2025 COUNTS ONLY

1. Opening: “Your 2025 in motion.”
2. Annual recognition: “141 recorded activities.”
3. Diversity: “Five different sports.”
4. Dual identity: “HIIT and running defined most of the year — 112 sessions together.”
5. HIIT chapter: “60 HIIT sessions.”
6. Running chapter: “52 runs.”
7. Supporting sport chapter: “13 strength sessions.”
8. Crossover: “12 indoor rides and four rowing sessions rounded it out.”
9. Finale: “You never moved in just one way.”

This is intentionally brief and repeat-count-heavy because audit summaries did not include actual per-activity metric **values**. Once the normalized data produces verified distance, durations, routes, HR and peaks, the engine should replace several count-only beats with more distinctive stories. **Do not invent specific heart-rate numbers, kilometers, longest route, training schedules or PRs from the audit's field coverage alone.**

### Example flow — hypothetical cyclist with rich FIT data (numbers omitted)

Arrival → year sessions → cycling is clear most recorded → total ride time → biggest outdoor ride → cycling ascent → power peak *only if measured* → indoor vs outdoor contrast → secondary sport moment → activity-time habit → personalized finale. Each fact includes a precise period and confidence.

## 7. Semantic story card types (content contract only)

These are **story functions**, not graphic cards or UI components:

- `opening`: sets the year and scope; no invented performance.
- `identity`: most-recorded sport, hybrid profile, actual sport diversity.
- `sport_intro`: establishes a sport chapter and why included.
- `cumulative`: one correctly totaled quantity (sessions, distance, time, reps).
- `peak`: one validated strongest session/event (longest, highest, most ascent).
- `habit`: weekday, month, start-time or weekly regularity with sample-size gate.
- `trend`: comparable early/late change, qualified and never causal.
- `technical`: pace, cadence, power, strokes, splits, verified workout structure.
- `achievement`: confirmed PR or correctly contextualized sport achievement.
- `contrast`: two sports, two periods, subtype comparison with matched definitions.
- `memory`: named or geographic activity only if verified and user-safe.
- `wellness`: opt-in descriptive sleep/HR/stress/Body Battery data.
- `surprise`: unexpected, data-supported fact not duplicating an earlier story.
- `finale`: distilled 1–3 factual takeaways with a human editorial line.

Content fields (conceptual): `storyId`, `definitionId`, `period`, `sport`, `subtype`, `type`, `act`, `hook`, `primaryClaim`, `supportingCopy`, `verifiedFacts[]`, `evidenceRefs[]`, `qualitySummary`, `sharePolicy`, `alternativeStoryIds[]`, `whySelected`, `locale`, `generationVersion`. **No shapes, colors, animations or image references in this output.**

## 8. Content, localization and privacy

**Copy:** hooks 3–8 words; one hero fact; a single optional explanatory sentence. Friendly, playful and plain language without shaming. NL-BE and EN localizations; meters/km, durations, and plurals formatted using locale. **Never use generic AI embellishment as evidence**: “conquered Everest” requires a correct arithmetic comparison and suitable qualified wording; “faster than 90% of Garmin users” is forbidden without a real comparable population dataset.

**Health:** distinguish descriptive fitness/HR statistics from medical interpretation. Sleep, weight, fitness age, HRV and menstrual-cycle records are sensitive and never used by default. Even consented medical-adjacent stories should avoid diagnoses. Protect exact activity route coordinates and timestamps in storage and exports; default output must not reveal home, workplace, or common locations. Do not infer gender from user profile or athlete photos. No route export without an explicit privacy review and user authorization.

**Share:** story engine returns `sharePolicy` and `sanitizedClaim`, not an actual image. Share-safe defaults can include sessions, distances, sport counts and user-approved accomplishments. `private_only` includes exact routes and sensitive health. A public-sharing renderer must strip evidence refs and raw data.

## 9. Test plan and acceptance criteria

**Data integrity**
- Full index spanning into prior year; no pagination duplicates.
- Local timezone boundaries, midnight sessions and DST transitions.
- Multisport parent with child legs: correct total sessions and leg distances.
- Manual workouts with distance 0 vs missing field; no artificial HR.
- FIT fields defined but null/no samples: technical story rejected.
- Different sport scales: no aggregate km comparing swimming with running as “best sport.”

**Story eligibility**
- HIIT-only account selects HIIT stories, no running/cycling claims.
- Multi-sport user selects and weights multiple chapters.
- 2025 fixture 60 HIIT vs 52 running yields **dual headline**, not definitive favorite.
- Separate by-session versus by-duration leader when rankings disagree.
- A declared favorite overrides editorial chapter *priority* only, never factual claims.
- No HR and no GPS: core sport narrative still succeeds.
- Partial year is labeled year-to-date; full-year totals not falsely asserted.
- Sparse account gets short credible recap, not filler cards.
- Technical stories refuse incomplete comparisons; raw field names in a FIT definition do not qualify.

**Narrative quality**
- No more than two closely related statistic stories in a row.
- One distinct core fact per story, verified with provenance.
- Dominant sport gets at least two dedicated stories when two meaningful metric families exist.
- A secondary sport gets a chapter only when eligible; no obligatory filler.
- No redundant “you exercised N times” after a universal total unless the selected sport adds new meaning.
- Exactly one introduction and finale, no orphaned chapter intro.
- Deterministic output for stable input and catalog version; log inclusion/exclusion reasons.

**Release readiness:** catalog predicates implemented and tested for every *shipped* definition; provenance schema validated; cross-sport normalizers and FIT parsers tested with more than one Garmin device/account; localization reviewed; privacy review completed; commercial Garmin access separately resolved. The example reference selector demonstrates policy only and does not implement all 176 formulas.

## 10. Implementation plan (no frontend tasks)

**Phase 1 — normalized facts:** map Garmin activity types to 18 families/subtypes, dedup sessions and multisport legs, compute reliable base metrics. Unit tests and quality ledger first.

**Phase 2 — identity engine:** build session/time rankings, detect dominant vs hybrid vs diverse, respect optional chosen favorite, and generate credible chapter allocations.

**Phase 3 — flagship sports:** implement typed selectors/calculators for running, cycling, HIIT, strength, swimming and rowing. Prioritize distance/duration/HR/route/laps/sets where proven.

**Phase 4 — additional sports:** implement remaining packs with simpler safe stories first; advanced golf/score/climbing/triathlon stories remain feature-gated until actual source semantics are verified.

**Phase 5 — narrative director:** derive candidates, score, filter, order, localize, attach privacy and evidence. Save debug trace and deterministic snapshots for a golden-data suite.

**Phase 6 — real-world robustness:** validate full-year imports from distinct devices; graceful fallback for absent data; latency, caching, auditability, user review of chosen favorite, and privacy compliance.

## References / status

- Garmin's published FIT Activity file structure confirms session/lap/record and optional metadata: https://developer.garmin.com/fit/file-types/activity
- Garmin's device activity profile examples (not complete universal catalogs): https://support.garmin.com/en-GB/?faq=WIQlsZcN1K0cAyJDxPKzx6 and https://support.garmin.com/en-PH/?faq=7VN0kr7nxn4u4q4S18YDw8
- Garmin Personal API Swagger (field availability is account/device-dependent): https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
- User-provided 2025 Garmin V4 audit, October 2026. Actual metric values not shared; only aggregated capability data and sports counts.
