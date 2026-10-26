# Sport-specific chapter playbooks — editorial content only

These playbooks do **not** specify design/card appearance. They identify **different stories worth telling** within a sport chapter. All candidates must pass the V2 metric contracts and actual Garmin/FIT availability tests. A sequence is *possible*, not mandatory. For each chapter choose independent facts that actually characterize the user, usually moving from identity and scale through a habit or technique to a standout moment and an earned personal takeaway.

| Sport family | Opening context | Scale & commitment | Personal fingerprint | Peak or achievement | Possible twist | Important data gate |
|---|---|---|---|---|---|---|
| **Running** | Relative role among recorded sports | Sessions, time, distance | Weekday, month, typical pace or cadence | Verified longest run, comparable fastest effort, recorded PR | Trail vs road; speed vs consistency | Never compare pace without comparable distances/conditions; GPS/pace validity |
| **Cycling** | Top or secondary sport; indoor/outdoor subtype | Ride count, saddle hours, distance | Climbing preference, training intensity, indoor/outdoor split | Longest ride, biggest verified climb, valid power peak | More indoor hours but outdoor distance, or vice versa | Power/cadence sensor availability, elevation/route integrity, indoor distance not travel |
| **HIIT** | Frequency relative to other sports | Sessions, total minutes | Median length, weekly pattern, HR-zone distribution | Longest meaningful workout, verified top HR-intensity session | More sessions than running but less time; seasonal surge | Exclude accidentally short sessions; don't infer workout difficulty from HR alone |
| **Strength** | Weight-room share of year | Sessions, sets, reps (where recorded) | Common exercise category, regularity | Largest credible comparable volume, progression when like-for-like | Variety of movement vs focus on one exercise | Ensure exercise taxonomy and weights are correctly recorded; not all devices capture weight |
| **Walking** | Recorded walking as part of year | Distance, time, sessions | Neighborhood-free weekday cadence or time of day | Longest verified walk | Walking volume compared with formal workouts, without double-counting | Distinguish walk activities from daily steps |
| **Hiking** | Outdoor adventure role | Trails, time, elevation gain | Duration vs vertical preference | Biggest ascent, longest hike, highest recorded altitude | Shorter route with much more climbing | GPS/elevation coverage; highest altitude is not necessarily a summit |
| **Swimming** | Pool/open-water split | Sessions, time, distance | Stroke mix or lengths, average pool pace | Longest swim, fastest comparable interval | Most meters in pool despite fewer sessions | Correct pool lengths, units, stroke detection and open-water accuracy |
| **Rowing** | Indoor/outdoor rowing mix | Time, distance, stroke total | Stroke-rate consistency, time-of-day | Longest row, best valid 500m segment | Strokes vs distance contrast | Unit conversion and machine-derived distance validation |
| **Yoga** | Consistency of practice | Sessions and time | Favorite day/time, regularity | Longest practice or consistency milestone | Recurrence compared with other gentle movement | No claims about improved flexibility, anxiety or medical benefit |
| **Pilates** | Frequency of practice | Sessions/time | Regularity and typical duration | Longest credible session or consistent block | Seasonal adherence shift | Do not infer core strength gains from number of workouts |
| **Elliptical** | Its role in cardio mix | Workouts, time, estimated distance | Heart-rate or weekday pattern | Longest valid workout | Frequency during periods of less running, without inferred injury | Device-derived distance and HR completeness |
| **Skiing/snowboarding** | Number of snow days/activities | Time, vertical descent | Seasonality, run distribution | Maximum verified descent/highest recorded point | Longest day wasn't biggest descent | Correct lift vs downhill motion; no unsafe GPS disclosure |
| **Golf** | Rounds/course variety | Rounds, holes, play time | Favorite course by frequency (private), distribution | Best comparable round *if score logged* | Time spent vs rounds played | No scores, strokes or handicaps without valid source data |
| **Racket sports** | Tennis/padel/pickleball subtype | Sessions and play time | Favorite weekday, session duration | Longest verified match/session | Switching between racket disciplines | No inferred match outcome, points or winners from basic activity recordings |
| **Triathlon** | Mixed-sport event role | Events and verified leg time | Relative swim/bike/run composition | Best comparable event or leg | Strength of one discipline vs duration allocation | Count multisport parent once; leg and transition data valid |
| **Team sports** | Football/basketball/etc. subtype | Sessions, time | Weekly rhythm, intensity | Longest match or validated top intensity session | Team sport vs solo sport share | No goals, match wins or performance scores without external verified data |
| **Climbing** | Indoor/outdoor or boulder/roped | Sessions, time, verified climbs | Typical session, category frequency | Highest verified grade/send when explicitly tracked | Attempts vs completed routes | Never invent grades or sends from an unstructured activity label |
| **General cardio** | Broad training category | Time and session frequency | HR intensity/time-of-day | Longest workout or significant consistency | Role as complement to other sports | Don't absorb typed sports into cardio, avoid double-counts |

## Section-depth tiers

- **Headline sport / rich data:** 3–6 independent stories, possibly more if genuine variety; at least one qualitative habit or peak if available.
- **Headline sport / sparse data:** an honest count/volume spotlight; no fabricated arc. Its eligibility can be increased once later FIT/metric enrichment produces more facts.
- **Supporting sport / rich data:** 2–4 stories if it has an independently compelling chapter.
- **Supporting sport / sparse data:** one truthful cameo inside `other_sports`.
- **Unrecorded sport:** zero stories; do not mention unless user explicitly adds context outside Garmin.

## Chapter-specific selection rules

- Pick the **most relevant verified hero statistic**, not necessarily calories or count.
- Never make every sport section follow exactly `sessions → minutes → calories → longest`; the stats should reveal a personal trait or discovery.
- If an athlete has cycling power, swimming pace, running cadence or strength reps, those can be deeper stories. Missing advanced fields must not penalize their recap; duration, consistency, and verified peaks are usually enough.
- If available data could support both `longest session` and `shortest session`, *shortest* is rarely editorially interesting. Admit it only when recordings are complete, comparisons meaningful, and there is a real interpretation beyond a trivial minimum.
- Sports where the athlete has no GPS (HIIT, indoor cycling, strength) remain first-class citizens; they should not lose section depth simply because they cannot make a route story.
- Privacy follows measurement sensitivity, irrespective of sport category: precise routes and sensitive physiology are private by default.
