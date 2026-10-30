# Current direction: one dot per activity (October 2026)

The recap now follows the *Garmin Wraped — One dot per activity* design canvas (89 cards). Navy ground, Sora type, and light that comes only from the dots: bright data dots, exactly as many as the card's legend says, and faint guide dots that draw the sport (track, wheel, court, dial). Each card enters with rising titles, counting heroes and dots that fly in (from the previous card's dots when navigating); ambient loops continue while reading. Reduced motion shows the settled card; pause freezes everything; hidden tabs and open dialogs stop rendering.

- Portrait screens show the card as designed, fitted between the header and the caption/controls. Wide screens (tablet landscape, desktop) put the type in a left column and the dot artwork, scaled up, in a right column.
- Exports are the full 360 × 640 card at 3× (1080 × 1920) with branding, year, caption and data notice. Original keeps the navy and sport colours; Paper, Cobalt and Ember recolour type and dots by role so highlights stay distinct.
- The design library shows all 89 cards with two fictional sample years, next to the 184 concept templates (guide dots only, no data).
- [DOT-DESIGN.md](DOT-DESIGN.md) maps every card to its story and admission rule.

## App screens (canvas page "App screens")

The intro, connect form, key help, loading, share, health consent, chapters and data & privacy screens follow the same language (`public/screens.css`):

- One shared dot globe (`public/entry-field.js`, `#entry-field`): 572 dots coloured by the fictional sample year's sports, plus faint guide dots. Screens place an empty `.gw-orb` anchor where the globe belongs and the field glides between anchors, so the intro globe travels into the connect page and on to loading without a cut.
- Intro (`entry-intro.js`): scattered dots under "Your Garmin, wrapped.", the dots gather into the globe under "One dot per activity.", then the globe moves beside the form. Skip, Escape and reduced motion end it at once; a watchdog ends it after 10 s.
- Connect: beside the form the real card visuals play in turn (`public/entry-reel.mjs`: running track → bike wheel → swim → climbing wall → mountain → moon → heart → HRV wave), the same dots flowing from one shape into the next, with a label and step dots under them. The reel forms out of the intro globe's dots. Reduced motion shows the running visual, still.
- Loading: the importer's own progress messages drive the step list; each received activity lights one dot on the globe (up to 572). Failures mark the step that stopped and offer a retry.
- Share is a full-screen sheet: the actual 1080 × 1920 export as the preview, the card strip, colourway chips and a saved confirmation. Health cards show their own preview in the consent dialog.
- Dialogs are navy panels; on phones the key help, privacy and consent dialogs open as bottom sheets.

The sections below describe the previous poster direction and no longer apply to any screen.

# Approved direction

The 18 sport poster concepts are saved as visual references in `output/sport-design-drafts/` (open `index.html` for the gallery). They are static examples with fictional statistics; the live recap uses the restored design.

Heart-rate and HRV monthly charts show the recorded values and source counts, with high and low callouts where available. The live recap and portrait exports use the same chart renderer.

The user's supplied reference combines extreme editorial sport-poster type, colorful modernist geometry and photography. Preserve this direction as the baseline for later work.

The homepage leads with “Your Garmin year, wrapped” and explicitly introduces an end-of-year recap for Garmin. The connection panel explains sport highlights and share cards, with current-year-so-far coverage visible before the key field. A numbered strip describes the annual overview, sport stories and downloadable highlights. Preserve this direct product framing alongside the condensed type, warm paper, cobalt action and photographic track composition.

- Mobile-first immersive web stories, not a dashboard or native app.
- Each story adapts to its viewport: wide screens place type beside artwork or charts; portrait screens stack the composition. Live content reserves the measured header and footer space. Charts, labels and dialogs scale with the available space, and very short screens can scroll without cropping the controls. Keep exports portrait at 1080×1920. The shared grid lives in `public/poster-layout.mjs` and viewport rules in `public/responsive.css`.
- Phones (under 600 px wide) keep the recap chrome slim so the card gets the height: wordmark with a small borderless share icon on the right, the progress bar under it, a chapter row with the dot key, and a one-line footer holding only “a MINI WATT product”. The caption block, Back, Pause, the Share card text button and the menu are hidden there; Back and Next become invisible tap zones over the card (left third back, the rest forward) next to swiping. On phones the card is stacked in three blocks, each scaled on its own (`cardFrame` in `public/dot-card.mjs`): the headline block (title, hero number, unit) fills the width at the 16 px gutter; the artwork keeps its place around the centre line and takes the remaining width and height (12 px from the screen edge); a grid or row designed under the artwork follows at the text scale. Hero numbers are no longer capped by the artwork's position, captions read at 10.5 px or more, and chart labels are 15% larger (checked collision-free on every card design and both sample years; 20% collides on the duration cards). Share cards keep 20 px clear for the floating share prompt. Rules live at the end of `public/recap.css`; the reference frames are “Phone · recap story” on the design canvas.
- Sport stories focus on one supported measurement; annual overview and closing cards bring the overall totals together. Huge condensed type, decisive empty areas, saturated orange/coral/magenta/blue/yellow/mint, black and warm white.
- Original photographic layers, large circles, angled bands and flowing routes. Color changes by chapter; typography and navigation remain consistent.
- Continuous, restrained ambient loops on the shapes and travelling markers. Fluid motif transformations between chapters. Numbers and captions stay still while reading.
- No automatic progression. Respect reduced motion, pause, keyboard controls and hidden tabs.
- Standalone portrait share cards use the same renderer as the sequence.
- The closing card opens a picker for every shareable card in the recap. Exports use a clean portrait composition with small branding, year, story copy and the required data notice; omit progress bars, chapter counters and navigation. Offer Original, Paper, Cobalt, Orange and Mint color choices. Color changes apply to typography and artwork without recoloring photography or changing chart meanings. Health consent applies only to the selected card and expires on switching cards or closing the picker.
- Athlete-neutral imagery by default. No gender inference, no mandatory gender field.
- Chapter admission depends on actual data coverage and privacy rules. Demo values are labeled fictional in the story and every export.
- The supplied reference is art-direction inspiration, not an asset to slice or reproduce. No Olympic/FIFA branding.

The fictional demo now runs the production planner over one explicitly fictional record fixture. Its activity counts, durations, active days, sports and monthly totals agree. The sequence opens with overall totals, an activity-count donut with a complete sport legend, and a twelve-month heat map with peak/quietest comparisons. Sport chapters follow, then available steps and opt-in health stories, and a compact year receipt.

Sport introductions use their own equipment cutout and sport-specific headline. Recorded hours use a typographic time composition, distance uses a track/road photo crop where appropriate, longest distances use ranked comparison bars, and weekday patterns use an actual seven-day distribution. Charts remain still; duration dials move slowly; grounded weights and mats do not float. The same equipment is no longer reused for every measurement in a sport. Annual charts use no decorative equipment imagery or travelling paths.

Monthly heat intensity uses recorded minutes when every activity has duration; otherwise it explicitly uses session counts. Complete empty months have zero recorded activity; unknown coverage and future months are blank, with different labels. The current month says “so far”. Peak/quietest comparisons include only completed months and preserve ties. The full chart data is available to screen readers and the shared portrait renderer.

The library covers every supplied story candidate, with empty metrics and source conditions. It is an art-direction catalogue, separate from recap eligibility. Eight extra concepts cover recovery, HRV, hydration, nutrition, sleep timing/consistency, energy and elevation; their API support is not assumed.

Visual vocabulary: track loops, gear teeth, stepped bands, folded planes, crescents, radial bursts, weight stacks, lanes, ripples, arches, balance circles, slalom stripes, targets, courts, triads, pitches, climbing holds, pulses and citrus rays. Photography sits between two halves of the same animated path. Typography remains still. Motion frequency is calmer for sleep and recovery.

The 24 October visual refinement constrains every chapter palette to the eight brand anchors: warm paper, ink, warm white, cobalt, orange, pink, mint and yellow. The footer uses each chapter's own paper/ink pairing instead of a dark photographic gradient. Photos retain their natural proportions. Mobile headline and metric sizes fit above the artwork, including short screens and long library titles.

Landscape compositions use independent transparent mountain and road subjects: rear geometry → mountain fragment → intervening ribbon → floating road → foreground path. The opaque alpine-road scene is retained only as historical source material and is no longer rendered. Cycling distance uses diagonal road geometry; cycling introductions retain gear geometry. Track photography remains a single masked photo fragment.

Motion profiles are deterministic per story, with individual phase, pace, direction and transition duration. Ambient cycles use smooth periodic motion; open-path markers fade at their endpoints. Lane counts and marker positions interpolate during transitions. Incoming art settles after outgoing art clears, over diagonal color sweeps or slower circular reveals for quiet chapters. Charts and values stay still; the duration dial alone has ambient motion. Adjacent slides preload. Pause, reduced-motion changes during transitions, hidden tabs and open dialogs stop animation without losing the selected story. Live cards, thumbnails and exported cards use this same layered renderer.

The start line uses a warm-paper sports poster, oversized condensed headline, original shoe cutout and orange/pink/blue track geometry. The loading interlude shifts to cobalt with yellow type, floating photography, moving lane markers and rotating editorial captions. Motion can be paused, respects reduced motion and pauses in background tabs. Entry, loading and recap remain clearly labeled as a design preview until the Garmin Personal API adapter is implemented. The help panel links directly to Garmin’s key settings and explains key creation and replacement.
