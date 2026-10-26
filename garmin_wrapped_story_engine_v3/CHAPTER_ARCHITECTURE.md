# Chapter architecture, sequencing and editorial rules

## A. Product experience and hierarchy

The experience has three nested editorial layers:

- **Wrapped**: one person's recorded year, scope, factual identity, chapter order and final through-line.
- **Chapter / section**: a coherent topic with a narrative question, distinct dataset and an ordered set of stories. Example: "What did HIIT mean in your year?"; "What were your running breakthroughs?"; "How did your recorded sleep behave?".
- **Story**: one dominant factual insight; optional short supporting copy; specific verified evidence and provenance. A chapter introduction is NOT automatically a story. Headings can be chapter metadata.

A chapter should feel like a mini-documentary: **establish a role → show its scale → discover a personal pattern → reveal its strongest event → offer a surprising twist or conclusion**. Only render the phases supported by reliable evidence. Do not produce count, minutes, calories, longest, shortest in a fixed sequence merely to fill a chapter.

### Proposed chapter taxonomy

| Kind | Chapter key | What it answers | Data/source | Default eligibility | Approximate depth |
|---|---|---|---|---|---|
| Core | `year_overview` | What did the recorded year look like overall? | Complete activity index | At least one activity and usable period | 2–4 |
| Sport | `sport:<key>` | What is this person's actual story in this sport? | Sport-specific metrics and FIT enrichment | Main sport + >=2 distinct verified candidate insights | 3–6 typically; occasionally 7–8 |
| Sport | `other_sports` | Which additional sports added dimension? | Low-volume sport counts and unique highlights | Relevant secondary sport(s), >=1 distinct observation | 1–3 |
| Discovery | `cross_sport` | What surprising contrast emerges across sports? | Comparable metrics from >=2 sports | Real, nontrivial contrast | 1–3 |
| Daily | `everyday_movement` | What happened outside discrete recorded workouts? | Daily steps/activity summaries | Sufficient recorded days | 2–4 |
| Effort | `heart_and_effort` | What did recorded workout intensity look like across sessions? | Activity HR/zone data, sport intensity | Enough HR coverage + user-approved activity health detail | 2–4 |
| Optional | `wellness_recovery` | What patterns appear in recorded energy/stress/HRV? | Body Battery, stress, HRV, RHR | Explicit wellness inclusion + robust day coverage | 2–4 |
| Optional | `sleep` | What story does the recorded sleep tell? | Sleep duration, stages, habits | Explicit sleep inclusion + enough valid nights | 2–4 |
| Core | `finale` | What uniquely defined this recorded year? | Distinct, already verified facts | At least one safe highlight | 1–2 |

`heart_and_effort` is exercise-related and belongs beside sport chapters; daily resting HR / stress / Body Battery belong to wellness. Do not call two overlapping heart-rate metrics different stories. `everyday_movement` step data can include steps taken during running; never say those steps were "in addition" to workouts unless the calculation actually excludes workout steps.

The taxonomy is extensible: a user with genuinely rich multi-sport data can earn a separate route/adventure or achievement chapter; do not manufacture a chapter from one statistic. The 18 sports and their subtypes from V2 use the same `sport:<key>` factory with sport-pack-specific candidate stories.

## B. Chapter planning is done BEFORE selecting a flat list of stories

1. **Profile the year:** compute full-year completeness and sport standings using separate session count and credible total recorded duration; get selected favorite (if any).
2. **Generate eligible candidates:** evaluate all sport and general story types against evidence requirements. For each candidate, persist metric key, quantity, unit, comparator, quality state, share policy, sports scope, and source provenance.
3. **Determine chapter candidates:** calculate a chapter `meaningScore` from relevance (session share, duration share, chosen favorite), evidence richness (distinct supported metric families), and standout strength (validated personal peaks). Eligibility always precedes scoring.
4. **Assign headline chapters:** choose 1–2 by default, possibly 3 for genuinely balanced multi-sport years. The count winner need not be the duration winner. A user-selected favorite is editorial preference, not proof of dominance. For the verified 2025 sample, HIIT 60 and running 52 are co-headlines; do NOT assert HIIT is subjectively favorite.
5. **Choose supporting sport treatment:** dedicated chapter when it has >=2 substantive evidence-distinct stories and meaningful relevance; otherwise place at most one vivid cameo in `other_sports`. A single exceptionally strong secondary-sport feat may merit its own chapter even when its session count is low, but only with verified exceptional evidence.
6. **Select optional non-sport chapters:** include everyday movement / heart-effort / wellness / sleep only with distinct valid stories and applicable user consent. No section labeled "Sleep" if there are no observed nights.
7. **Budget total narrative:** prefer ~14–26 stories in a data-rich year, often ~10–18 in a typical dataset. No hard minimum or upper bound; an actual 30-story experience requires exceptional diversity and low redundancy. Allocate more depth to *rich* headline sports and standout events. Re-score the planned deck for repetition and fatigue.
8. **Sequence chapters:** overview → headline sport(s) → meaningful supporting/cross-sport story → everyday movement / effort → optional recovery → optional sleep → finale. Shift `cross_sport` between related sports when it adds a useful contrast; don't require the same ordering for everyone. Keep chapter topics coherent.
9. **Compose chapter arcs:** apply phase sequencing below; keep peak/reveal near the chapter end, not a repetitive list of totals.
10. **Global editorial pass:** enforce claim ownership, remove duplicate or false inferences, make transitions semantically coherent, ensure eventual finale selects the most distinctive *already verified* facts, localize, and apply share-privacy constraints.

## C. Within-chapter story progression

Every `sport:<key>` chapter carries an `editorialQuestion`, optional `thesis`, and ordered stories in phases:

1. `position` — *Why is this sport part of my year?* Count, relative place, or explicitly chosen favorite. Not a compulsory separate intro card; the first story can be the first real count insight.
2. `scale` — *How much of this did I do?* The most revealing among duration, distance, aggregate sessions, recorded calories or total reps. Prefer a meaningful metric the reader has not already seen. Do NOT repeat the same count hero claim already used in the overview.
3. `pattern` — *What did my behavior look like?* Typical session length, weekly recurrence, preferred timing, intensity distributions, sport subtype split, monthly consistency. Requires actual sample sizes and valid historical period.
4. `peak` — *Which particular event stands out?* Longest valid run, biggest cycling ascent, confirmed PR, longest relevant HIIT session, peak HR zone duration, strongest verified comparable performance. Avoid arbitrary "shortest session" (accidental recording, warmup, device interruptions) unless meaningful, quality-gated and contextualized.
5. `twist` — *What would I not have guessed?* Nontrivial contrasts such as more sessions in one sport but more time in another, unexpectedly even weekday pattern, distance split across cycling subtypes; no astrology-style athlete labels or made-up personality traits.
6. `payoff` — *What is the earned takeaway?* A single punchy, evidenced synthesis. A payoff can be the peak or twist itself; do not insert a filler "You did great!" story.

**Phase order:** `position → scale → pattern → peak → twist/payoff`, but the editor may present a surprising verified peak before scale as a cold open, then contextualize it. A phase can be absent; 2 independent stories suffice for a compact legitimate sport section when the sport matters. Do not fill missing stages with low-interest data.

### What 5 eligible HIIT stories might look like (NO invented figures)

- Position: "HIIT was your most-recorded sport: **60 sessions**" (supported by actual 2025 counts).
- Scale: "You accumulated **[computed and verified] hours** of HIIT." (only when derived from all valid HIIT durations; illustrative placeholder, never renderer output).
- Pattern: "Your typical HIIT session lasted **[computed median] minutes**" (if enough valid session durations, beware of unusually short recordings).
- Peak: "Your longest verified HIIT session lasted **[computed maximum]**" (only after filtering corrupt/outlier sessions).
- Twist: "In HIIT you spent **[verified share]** in high HR zones" (requires consistent zones and coverage); OR "Your HIIT time exceeded your running time even though session counts were close" if true.

These need not all appear. If time and zone facts are weak, choose consistency or a strong recorded strength/HIT exercise pattern instead. Most sessions is a claim, not a verdict on favorite sport.

### Running, cycling and other sports

The same arc uses **different metrics from different sport packs**, not HIIT values relabeled:

- Running: role → total running time or distance → cadence/pace or frequency → longest route/fastest comparable effort → notable route/season contrast.
- Cycling: role → saddle time or total distance → indoor/outdoor or ascent profile → longest ride, hardest recorded climb or verified power personal record → terrain/route insight.
- Strength: role → verified workouts → sets/reps/recorded volume → frequently tracked exercises → strongest comparable session, if valid.
- Swimming: role → distance or time → pool vs open water, stroke type → longest swim / comparable pace → consistency.
- Rowing: role → sessions/time → logged strokes or 500m pace → longest/fastest comparable row → sessions pattern.
- Hiking: role → trail time → gain/descent → biggest ascent or longest day → route or terrain insights.
- Yoga/pilates/cardio/racket/team/climbing/skiing/golf/triathlon: use matching existing V2 sport-pack eligible candidates, not speculative stats (e.g. no wins or golf score unless returned).

## D. Claim ownership, deduplication and balancing

- Every candidate receives stable `claimKey = metricFamily + scope + window + comparator + eventIdIfAny`; exactly one chapter owns each hero claim. High-level overview may use `all_sports.session_count`; HIIT chapter may use `hiit.session_count`, but avoid giving 141 total followed by every individual sport count and nothing else.
- A story can reference previous facts as context but cannot re-present them as a new reveal. The finale may intentionally echo a fact to synthesize the year; it must not inflate counts.
- A chapter should contain different metric families: e.g. frequency, effort, habit, peak. Avoid three adjacent distance or session-count cards.
- A metric can be good but not editorially meaningful: calorie totals are often less distinctive than time, a route or a true achievement. Prefer quality over density.
- `meaningScore` may combine relevance, novelty, evidence strength, narrative fit. A scoring model does NOT bypass hard data guards.
- Section-title/callout strings and semantic narrative connectors are allowed. NO animation, color, photograph, icon or UI directives.

## E. Data presence and omissions at TWO levels

First gate individual story candidates, then gate their chapter. Examples:

| Condition | Story decision | Chapter decision |
|---|---|---|
| No cycling activities | No cycling story | Omit `sport:cycling` |
| 12 indoor cycling sessions with durations but no power | Count/time eligible; power ineligible | Cycling chapter can be short; no power claims |
| Strong running data, low HIIT detail | Full running arc; only valid HIIT count(s) | Running gets depth; HIIT stays compact or supporting cameo |
| Daily step readings on scattered dates | No annual total or trend from incomplete coverage | Omit or narrowly qualify `everyday_movement` |
| HRV always 204 | HRV candidates ineligible | `wellness_recovery` can still qualify from verified Body Battery/stress if opted in |
| Sleep records null | No sleep insights | Omit `sleep` entirely |
| No HR sensor | No heart-based story | Other sport stories survive; omit `heart_and_effort` |
| One verified standout cycling route but few rides | Verified personal session story eligible | Feature as supporting chapter or cameo, not a fabricated cycling year |
| 2026 data through October only | Must say year-to-date | Every annual title/claim qualified as partial period |

**Coverage requirements** live in the metric contracts and must be enforced before chapter selection. No missing activity = rest-day claim. No `0` substitution for null. Do not treat a percentage from sparse measurements as a full-year truth. A chapter with one weak metric must be omitted or made a truthful cameo, not padded.

## F. Privacy and consent

- `year_overview`, recorded sport chapters, and count/distance/time-level discoveries may be available in the private recap under the user's authorized activity access.
- Detailed *activity-derived* HR/zone stories are private by default and can be included when the user permits this detail; separate opt-in required before public sharing.
- `everyday_movement` needs appropriate wellness/daily-activity access and valid daily coverage.
- `wellness_recovery` and `sleep` require separate explicit inclusion choices. Medical-adjacent stories never diagnose health, sleep disorders, training quality, illness, menstrual state or pregnancy.
- Never reveal GPS traces, frequent start locations, precise timestamps, sensitive HRV, sleep, stress or weight in a public artifact by default. A renderer must not override private share policies.
- Neither athlete imagery nor personal gender/sex is inferred by the Story Engine.

## G. Example with actual 2025 audit counts (count-only evidence)

Verified source facts: **141 activities:** HIIT **60**, running **52**, strength **13**, indoor cycling **12**, rowing **4**. No actual yearly minutes, calories, pace, longest session or power values in the privacy-redacted audit: do not invent them.

- `year_overview`: story 1 "141 recorded sessions in 2025"; story 2 "Five sports appeared in your year"; story 3 "HIIT and running accounted for 112 of them" (if used, don't repeat in the next chapter as new fact).
- `sport:hiit`: one strong evidence-based fact "60 recorded HIIT sessions"; additional habit/effort/peak slots are **candidates only**, not output. With this audit-only data, may downgrade the chapter to a spotlight or combine with running identity rather than fabricate three slides.
- `sport:running`: same logic for the **52 runs**.
- `other_sports`: "13 strength sessions, 12 indoor rides and 4 rowing workouts" as a concise supporting fact, or independent standout stories once the normalized per-session values are available.
- `everyday_movement`: conditional on computed valid day coverage and eligible claim(s).
- `wellness_recovery`: optional and conditional on consent, quality and enough evidence.
- `sleep`: **absent** in this account sample, so entirely omitted.
- `finale`: a meaningful recap of the verified 2025 split, ideally with new calculated standout facts when possible.

This illustrates **candidate chapter structure** based on counts only, not an artificially padded multi-story experience. Once real normalized per-session metrics are available, HIIT and running should have deep 3–6-story chapters and other sports may earn their own chapters.

## H. Example with hypothetical rich metrics (fictional; NOT this person's data)

`year_overview` [3 stories]: total activities → proportion of top two sports → sport diversity.

`sport:hiit` [5]: session frequency → time logged → typical duration trend → validated longest session → meaningful high-intensity zone insight.

`sport:running` [5]: distance → habit pattern → notable route → validated long run → verified personal record.

`sport:cycling` [3]: indoor/outdoor mix → time in saddle → standout ride.

`everyday_movement` [2]: step total with adequate coverage → strongest recorded day.

`wellness_recovery` [3 if consented]: Body Battery range → stress distribution → longitudinal contrast (proper coverage).

`sleep` [3 if consented]: number of observed nights → typical sleep duration → consistent bedtime pattern.

`finale` [1–2]: distinctive summary that connects sport versatility and standout moments. Exact number of chapters and stories is flexible.

## I. Output semantics

Each plan includes `schemaVersion`, `period`, `athleteIdentity`, `chapters[]`, `omittedChapters[]`, `candidateTrace` (private), and `generationVersion`. Each chapter includes `chapterId`, `type`, `sportKey` where applicable, `title`, `editorialQuestion`, `thesis`, `order`, `whyIncluded`, `stories[]`, and optional `nextChapterKey` for editorial topic handoff. Each story includes `storyId`, `definitionId`, `phase`, `kind`, `primaryClaim`, `verifiedFacts[]`, `evidenceRefs[]`, `claimKey`, `sharePolicy`, and `whySelected`. See machine-readable schema.

The content-engine output MUST NOT contain visual instructions, predefined media assets, motion or color requirements. Chapter metadata can help an eventual player navigate without forcing a specific presentation.

## J. Acceptance criteria

1. HIIT 60 and running 52 out of 141 => **dual headline**, two candidate sport chapters (only promoted to deep chapters if enough facts).
2. Cyclist with 70% sport time and robust cycling metrics => cycling receives deepest chapter.
3. Sport with no sessions => no chapter for that sport.
4. A two-card meaningful section qualifies; a data-poor single fact is cameo/spotlight and not padded.
5. Missing sleep => no sleep chapter, no sleep placeholders.
6. Multiple valid sport-specific metrics yield **multiple ordered stories in the same sport chapter**, not shuffled across deck.
7. Across-chapter duplicate claim keys are forbidden; cross-sport comparisons use distinct comparator keys.
8. All superlatives require a complete eligible search space; short activity recording cannot be declared the meaningful "shortest" without quality guards.
9. Consent controls wellness/sleep; public export omits private routes and physiological measurements by default.
10. Chapter and story selection deterministic for the same normalized input + config; omitted sections explainable in private trace.
11. Multisport activities not counted twice in annual sessions.
12. A sparse data year gives a shorter recap, never fabricated section depth.
13. All calculated field names, units, and quality are confirmed at the metric/evidence layer, *not* inferred from audit schema presence.
14. The reference selector is explicitly **not** a completed 176-story calculator or live Garmin connector.
