# Garmin Wrapped — Story Engine V3 (chapter-first, content-only)

**Source of truth for chapter structure and story sequencing.** Use `CHAPTER_ARCHITECTURE.md` for the full algorithm, eligibility rules, section plans, examples, and acceptance tests. Use `LEGACY_V2_SPEC.md` for metric semantics, data quality, sport registry, deduplication, evidence requirements and content safety *except where this V3 architecture explicitly replaces V2's flat narrative sequencing.*

## Core contract

**A Wrapped is a sequence of meaningful CHAPTERS. Each chapter is an ordered sequence of evidence-backed STORIES.** Chapters are not visual templates and stories are not chart widgets. The Story Engine emits story claims, supporting evidence, editorial roles, chapter positioning and omissions. No image instructions, color palettes, animation directives, layouts or component names.

```text
Garmin adapter / FIT normalization
 -> year index and measurement quality ledger
 -> metric calculation (global, sport, daily wellness, sleep)
 -> candidate story production and rigorous evidence gating
 -> athlete identity and chapter eligibility
 -> chapter planning (theme, message, story budget)
 -> within-chapter story selection and ordering
 -> across-chapter deduplication, contrast, callbacks and climax
 -> factual copy, privacy and final validation
 -> versioned Chapters[] with Stories[] and private omission trace
```

## Non-negotiable requirements

1. A headline sport gets its own multi-story chapter when enough independent valid insights exist; do not reduce it to a single count if richer metrics are available.
2. A sport is not subjective 'favorite' just because it has the most sessions. Distinguish most-recorded, most-time, chosen favorite, two co-headline sports, and a mixed year.
3. A chapter has a clear question and progression: **position → scale → pattern → peak → reveal/payoff**. Skip phases with no meaningful evidence. More than one story can share a phase only if claims are substantially different.
4. Default sections include sporting overview, sport chapters, supporting sports, cross-sport discoveries, everyday movement, optional heart/effort, optional wellness/recovery, optional sleep, and finale. Omit unsupported chapters, not replace with fabricated filler.
5. Distinguish recorded activity minutes from daily active minutes; sports are classified consistently; no silent double-counting of multisport legs and parent sessions.
6. Sport chapter depth is driven by evidence richness and relevance, not by a fixed 3–6-slide design quota. Shorten or combine to avoid a three-card wall of trivial numbers.
7. Aggregate claims require complete relevant coverage; individual-session claims require a valid session plus a complete candidate search for an 'of the year' superlative.
8. Wellness/HRV/sleep stories require applicable consent; raw health data stays private and unsupported medical inferences are forbidden.
9. A fact or derived metric cannot be the hero claim twice in the deck. Bookend references can intentionally echo it if they add no new false assertion.
10. Output chapter-first JSON and include enough reasoning trace that a developer can test *why* each story and chapter appeared or was omitted.

## Files

- `CHAPTER_ARCHITECTURE.md` — full detailed handoff.
- `catalog/chapter_registry.json` — chapter identity, admission and story arcs.
- `catalog/story_chapter_map.json` — chapter and narrative-phase hints for all 176 V2 candidate story definitions; hints are *not* evidence gates.
- `contracts/chapter_output.schema.json` — structured, renderer-independent output contract.
- `reference/plan_chapters.mjs` — count-only + injected verified-candidate example planner (NOT a Garmin data client or complete metric engine).
- `tests/chapters.test.mjs` — deterministic section behavior tests.
- `examples/` — audit-grounded sparse counts example and clearly fictional richer-data example.

## Implementation milestones

1. Implement versioned normalized metric outputs with explicit quality and provenance.
2. Implement all V2 story definitions as typed guards/calculators, with sport-specific rules.
3. Implement Chapter Eligibility & Ranker; reserve chapter budgets from candidate richness, not mere session counts.
4. Implement within-chapter arc composition and uniqueness/deconfliction across chapters.
5. Implement structured copy and opt-in/privacy controls independent of renderer.
6. Test (i) 2025 HIIT + running dual-headline case, (ii) cycling-dominant and multisport cases, (iii) sparse/missing sleep/HRV, (iv) partial year, (v) huge sport diversity, (vi) activity/FIT conflicts and GPS privacy.

**Boundary:** Garmin Personal API test data validates a single personal-account prototype. Commercial multi-user connectivity and full-history licensing must be resolved separately; this engine should remain transport-agnostic.
