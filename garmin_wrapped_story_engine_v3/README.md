# Garmin Wrapped — Story Engine V3 (chapter-based narrative architecture)

**Story engine ONLY. No graphic design, styling, image prompts, animation instructions, UI layouts or frontend requirements.**

## What's new compared to V2

The engine plans **chapters/sections first**, then selects and orders **multiple stories within each chapter**. A prominent sport can have a dedicated multi-story HIIT, running, cycling, strength, or other sport chapter. Non-sport chapters for everyday movement, heart/effort, recovery, and sleep are optional and controlled by real data coverage and privacy inclusion. Stories inside a chapter form a coherent arc rather than a disconnected list of totals.

V2's 176 candidate stories, sport registry for 18 families and 24 subtype extensions, metric evidence rules and safety guidance are preserved and reused. V3 *overrides the flat-list sequencing and target length guidance.*

## Read in this order

1. `STORY_ENGINE_SPEC.md` — normative V3 contract.
2. `CHAPTER_ARCHITECTURE.md` — detailed algorithm, chapter gate/selection, narrative buildup, examples, omission rules, and acceptance criteria.
3. `SPORT_CHAPTER_PLAYBOOKS.md` — sport-specific narrative possibilities for all 18 sport families, explicitly gated by source availability.
4. `LEGACY_V2_SPEC.md` — authoritative lower-level metric, source-quality, sport-classification and privacy contracts, except sequencing replaced by V3.
5. `catalog/chapter_registry.json` and `catalog/story_chapter_map.json` — machine-readable section taxonomy and hints for all 176 candidate stories.
6. `contracts/chapter_output.schema.json` — content-only nested chapters/stories JSON schema.
7. `reference/plan_chapters.mjs` — runnable **reference selector**, not a live Garmin client and not full 176-story calculator.
8. `examples/` — real 2025 activity COUNTS only and a deliberately **FICTIONAL** rich-data illustration.

## Run the reference planner

From the unzipped root with Node 18+:

```bash
node reference/plan_chapters.mjs examples/audit_2025_counts.json examples/audit_2025_chapter_plan.json
node reference/plan_chapters.mjs examples/fictional_rich_athlete_input.json examples/fictional_rich_chapter_plan.json
node --test tests/*.test.mjs
```

`audit_2025_counts.json` includes **only verified 2025 aggregate counts** (141 total; HIIT 60, running 52, strength 13, cycling 12, rowing 4). It does not contain enough detail to claim any actual hours, calories, record paces, GPS routes or sleep. The plan deliberately produces count-based sport spotlights and omits missing health sections. The richer example has a prominent `FICTIONAL_NOTICE` and all fictional story text says it is fictional.

## Dependency boundaries

- **Garmin adapter:** collects with permitted access, handles FIT, supplies normalized records and provenance. External to Story Engine.
- **Metric calculators:** must verify individual numeric values, coverage, units and source completeness before marking candidate insights as verified. Defined in spec, NOT fully implemented in reference selector.
- **Story Engine V3:** owns chapter admission, ranking, within-chapter progression, global narrative order, omission reasons, copy/evidence and privacy rules.
- **Presentation system:** can consume the ordered nested chapter JSON and choose how to display it. The engine does not instruct it visually.

### What is runnable today?

The reference planner supports verified aggregate sport counts + injection of **already validated** candidate stories. It shows section construction, chapter ordering, multi-story sport depth, missing-data omission, consent gating, claim-key deduplication and basic privacy enforcement. It is intentionally NOT a 176-story production computation engine. Build actual metric calculators, candidate validation, FIT value coverage and sophisticated ranking separately.

### Production caution

The Garmin Personal API must not be assumed to authorize a public, multi-user commercial integration. This handoff addresses story semantics and is data-source agnostic.
