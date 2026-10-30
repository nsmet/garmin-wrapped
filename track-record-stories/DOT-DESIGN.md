# Dot design inventory (89 cards)

Source: Design canvas *Garmin Wraped — One dot per activity* (23 boards, 89 cards; each board shows a busy 572-activity sample year and a low-count sample year). Every card is implemented by `public/dot-engine.mjs` (geometry, ported from the design's GWDots engine v2) and `public/dot-spec.mjs` (story → card mapping).

Feedback round 1 (29 Oct 2026): hours cards use a sport-specific outline (track, chainring, interval timer, kettlebell, footprint, boot, pool, oar, mat, ring, elliptical, skis, golf ball, racket, three rings, pitch, carabiner, heart, star) filled with one dot per stated unit; cycling and strength sessions fill a bike's wheels and a dumbbell outline; running distance traces a shoe and cycling distance traces a bike. Grey dots show the unfilled part of each outline. The dot key sits under the caption instead of under the number.

Feedback round 2 (30 Oct 2026): the hiking outline is an ankle-high hiking boot (laces to hooks, toe cap, lugged sole) instead of a tall ski-boot shaft; climbing hours fill the holds of a route up a wall from the ground up (rope and quickdraws as guides) instead of a carabiner; both elliptical cards use one side-view trainer rig (flywheel, upright, console, swinging handles, foot plates). Sessions animate it, with each session riding the pedal orbit, and hours fill that orbit. Multisport sessions use two counter-rotating rings, with every dot inside their overlap. The HRV strands share one column grid and a column-driven wave, so a shorter last strand stays parallel. Weekday captions no longer add an "Activity dates use …" line.

How the cards reach people:

- **Recap**: a card appears only when the existing pipeline admits its story (column *Live when*). Values, captions and chart items come from the story; the mapping reads displayed numbers back and never calculates metrics.
- **Design library → Dot design previews**: all 89 cards × both fictional sample years (178 previews), labelled *Fictional sample · design preview*. This is where variants the pipeline cannot produce are visible.
- **Concept templates** (184, unchanged catalogue) use a guide-only dot drawing with *Data required*.

| # | Board | Title | Story id | Layout | Live when | Preview-only / differences |
|---|---|---|---|---|---|---|
| 001 | 01 · Year overview | Your year in motion. | `cover` | sphere | Any recorded activity. |  |
| 002 | 01 · Year overview | The whole year, in view. | `year-summary` | ring | Any recorded activity. |  |
| 003 | 01 · Year overview | Your year. Your sports. | `sport-mix` | mix | Any recorded activity. |  |
| 004 | 01 · Year overview | Every month, a different pace. | `year-calendar` | months | Any recorded activity. BUSIEST / hero month only when months are comparable (complete import); the month in progress can lead and is then labelled BUSIEST · SO FAR; ties are lit together and the hero keeps the year. | Low-count design leaves early months blank; live data shows 0h for complete empty months and – for unknown/future months. |
| 005 | 02 · Running | Runs, on repeat. | `running-sessions` | motif: snake on the track | At least one activity of the sport. |  |
| 006 | 02 · Running | Hours in your stride. | `running-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 007 | 02 · Running | A year, on foot. | `running-distance` | flow | Distance sports only; distance present on every activity. |  |
| 008 | 02 · Running | Your running day. | `running-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 009 | 02 · Running | Your longest run. | `running-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 010 | 03 · Cycling | Back in the saddle. | `cycling-sessions` | shape: bike wheels / dumbbell outline | At least one activity of the sport. |  |
| 011 | 03 · Cycling | Hours in the saddle. | `cycling-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 012 | 03 · Cycling | The kilometres rolled. | `cycling-distance` | flow | Distance sports only; distance present on every activity. |  |
| 013 | 03 · Cycling | Your ride day. | `cycling-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 014 | 03 · Cycling | Your longest ride. | `cycling-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 015 | 04 · HIIT | Intervals. On repeat. | `hiit-sessions` | motif | At least one activity of the sport. |  |
| 016 | 04 · HIIT | The interval hours. | `hiit-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 017 | 04 · HIIT | Your HIIT day. | `hiit-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 018 | 05 · Strength | A year under load. | `strength-sessions` | shape: bike wheels / dumbbell outline | At least one activity of the sport. |  |
| 019 | 05 · Strength | Hours on the training floor. | `strength-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 020 | 05 · Strength | Your lifting day. | `strength-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 021 | 06 · Walking | Walks worth counting. | `walking-sessions` | motif | At least one activity of the sport. |  |
| 022 | 06 · Walking | Time on your feet. | `walking-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 023 | 06 · Walking | Your walking footprint. | `walking-distance` | flow | Distance sports only; distance present on every activity. |  |
| 024 | 06 · Walking | Your walking day. | `walking-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 025 | 06 · Walking | Your longest walk. | `walking-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 026 | 07 · Hiking | The hiking chapter. | `hiking-sessions` | motif | At least one activity of the sport. |  |
| 027 | 07 · Hiking | Hours on the trail. | `hiking-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 028 | 07 · Hiking | The trail adds up. | `hiking-distance` | flow | Distance sports only; distance present on every activity. |  |
| 029 | 07 · Hiking | Your hiking day. | `hiking-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 030 | 07 · Hiking | Your longest hike. | `hiking-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 031 | 08 · Swimming | Back to the water. | `swimming-sessions` | motif | At least one activity of the sport. |  |
| 032 | 08 · Swimming | Hours in the water. | `swimming-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 033 | 08 · Swimming | Your year in the water. | `swimming-distance` | flow | Distance sports only; distance present on every activity. |  |
| 034 | 08 · Swimming | Your swimming day. | `swimming-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 035 | 08 · Swimming | Your longest swim. | `swimming-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 036 | 09 · Rowing | Return to the row. | `rowing-sessions` | motif | At least one activity of the sport. |  |
| 037 | 09 · Rowing | Hours at the oars. | `rowing-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 038 | 09 · Rowing | The rowing distance. | `rowing-distance` | flow | Distance sports only; distance present on every activity. |  |
| 039 | 09 · Rowing | Your rowing day. | `rowing-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 040 | 09 · Rowing | Your longest row. | `rowing-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 041 | 10 · Yoga | Room for the mat. | `yoga-sessions` | motif | At least one activity of the sport. |  |
| 042 | 10 · Yoga | Hours on the mat. | `yoga-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 043 | 10 · Yoga | Your yoga day. | `yoga-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 044 | 11 · Pilates | Pilates in practice. | `pilates-sessions` | motif | At least one activity of the sport. |  |
| 045 | 11 · Pilates | Hours of Pilates. | `pilates-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 046 | 11 · Pilates | Your Pilates day. | `pilates-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 047 | 12 · Elliptical | Another turn. | `elliptical-sessions` | motif | At least one activity of the sport. |  |
| 048 | 12 · Elliptical | Hours in the ellipse. | `elliptical-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 049 | 12 · Elliptical | Your elliptical day. | `elliptical-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 050 | 13 · Skiing & snowboarding | A season on snow. | `skiing-sessions` | motif | At least one activity of the sport. |  |
| 051 | 13 · Skiing & snowboarding | Hours on snow. | `skiing-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 052 | 13 · Skiing & snowboarding | Distance on snow. | `skiing-distance` | flow | Distance sports only; distance present on every activity. |  |
| 053 | 13 · Skiing & snowboarding | Your snow day. | `skiing-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 054 | 13 · Skiing & snowboarding | Your longest snow session. | `skiing-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 055 | 14 · Golf | Rounds on record. | `golf-sessions` | motif | At least one activity of the sport. |  |
| 056 | 14 · Golf | Hours on the course. | `golf-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 057 | 14 · Golf | Your golf day. | `golf-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 058 | 15 · Racket sports | Back on court. | `racket-sessions` | motif | At least one activity of the sport. |  |
| 059 | 15 · Racket sports | Hours on court. | `racket-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 060 | 15 · Racket sports | Your court day. | `racket-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 061 | 16 · Triathlon / multisport | More than one discipline. | `triathlon-sessions` | motif | At least one activity of the sport. |  |
| 062 | 16 · Triathlon / multisport | Hours across disciplines. | `triathlon-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 063 | 16 · Triathlon / multisport | Your multisport distance. | `triathlon-distance` | flow | Distance sports only; distance present on every activity. |  |
| 064 | 16 · Triathlon / multisport | Your multisport day. | `triathlon-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 065 | 16 · Triathlon / multisport | Your longest multisport activity. | `triathlon-longest` | top3 | 2+ sessions, complete import, distance on every activity. | Single-activity variant is preview-only: the pipeline needs 2+ activities. |
| 066 | 17 · Team sports | Part of the team. | `team_sports-sessions` | motif | At least one activity of the sport. |  |
| 067 | 17 · Team sports | Hours in the game. | `team_sports-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 068 | 17 · Team sports | Your team-sport day. | `team_sports-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 069 | 18 · Climbing & bouldering | Back to the wall. | `climbing-sessions` | motif | At least one activity of the sport. |  |
| 070 | 18 · Climbing & bouldering | Hours at the wall. | `climbing-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 071 | 18 · Climbing & bouldering | Your climbing day. | `climbing-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 072 | 19 · Cardio & fitness | Cardio on the calendar. | `cardio-sessions` | motif | At least one activity of the sport. |  |
| 073 | 19 · Cardio & fitness | Hours of cardio. | `cardio-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 074 | 19 · Cardio & fitness | Your cardio day. | `cardio-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 075 | 20 · Other activities | The rest of your repertoire. | `other-sessions` | motif | At least one activity of the sport. |  |
| 076 | 20 · Other activities | Hours beyond the usual. | `other-hours` | shape: sport outline | Duration present on every activity of the sport. |  |
| 077 | 20 · Other activities | Your activity day. | `other-weekday` | week | 8+ sessions and a single most frequent weekday. | Low-count variant (1–3 sessions) is preview-only: the pipeline needs 8+ sessions. |
| 078 | 21 · Everyday movement + sleep | Small steps. Big picture. | `steps-total` | galaxy | Daily step records. |  |
| 079 | 21 · Everyday movement + sleep | Your biggest recorded step day. | `steps-peak` | stairs | Daily step records. |  |
| 080 | 21 · Everyday movement + sleep | Off the clock. | `sleep-median` | moon | 30+ nights of sleep (health, export consent). |  |
| 081 | 22 · Heart and effort | Your highest recorded HR. | `max-hr` | heart | Activities with a usable max HR (health, export consent). |  |
| 082 | 22 · Heart and effort | Your heart at work. | `activity-hr` | pulseRing | Activities with an average HR (health, export consent). |  |
| 083 | 22 · Heart and effort | Your heart rate, month by month. | `activity-hr-monthly` | monthLine | Activity HR averages (health, export consent). HIGH/LOW only for comparable months. |  |
| 084 | 22 · Heart and effort | Your resting heart rate. | `resting-hr` | breath | 30+ days of resting HR (health, export consent). |  |
| 085 | 22 · Heart and effort | Resting HR, month by month. | `resting-hr-monthly` | monthLine | 2+ months with 10+ resting-HR days (health, export consent). |  |
| 086 | 22 · Heart and effort | Your overnight HRV. | `hrv-median` | wave | 30+ nights of overnight HRV (health, export consent). |  |
| 087 | 22 · Heart and effort | HRV through the year. | `hrv-monthly` | monthLine | 2+ months with 10+ HRV nights (health, export consent). | Design shows HIGH/LOW; the pipeline does not rank HRV months, so live cards omit them. |
| 088 | 23 · Finale + MINI WATT | That’s your track record. | `finale` | sphere | Always closes a recap. |  |
| 089 | 23 · Finale + MINI WATT | Keep the watts coming. | `mini-watt` | road | Only after an admitted cycling chapter; promotional, never exported. |  |
| 090 | Added · Everyday movement | One floor at a time. | `floors-total` | shape: stairwell | Daily floor records with at least one floor climbed (`movement.floorsAscended.value`). | Not in the original canvas; added after feedback. |
