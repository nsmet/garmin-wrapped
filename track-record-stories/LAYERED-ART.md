# Layered recap artwork and motion

The sport-poster concepts in `../output/sport-design-drafts/` are the art-direction references. They are flattened examples, not images shown to a user. The actual recap is composed live from separate transparent PNG sources in `source-assets/layers/` and alpha-preserving optimized WebP delivery files in `public/assets/layers/`, colored vector shapes and vector paths. No opaque rectangular scene is used. The track, gym floor, pool, open water, crosswalk, grass, court, studio floor, bicycle wheel, handlebars, golf ball and club were generated as separate transparent cutouts for this implementation. The other equipment and landscapes reuse the project's original transparent photographic subjects, converted losslessly from its WebP delivery assets to PNG. Mountain and road lower edges are clipped to curved masks when drawn. The foreground and background never contain baked-in text or metrics.

The renderer draws, in order: paper color; moving disk and color planes; environment PNG; an optional second landscape PNG; rear vector strokes; one or more equipment PNGs; foreground strokes; still typography and measured charts. Each PNG has its own transform. The line geometry is decorative, not a recorded route, number of laps, or training data. The large headlines use self-hosted Anton and support text uses Space Grotesk.

## Composition and timing

Each sport has a chapter clock so consecutive cards do not restart the underlying movement. A slow sinusoid moves the disk by up to 16 units in the 1000-unit artwork coordinate system. For ungrounded scenes the environment moves horizontally up to 9 units and vertically up to 5; equipment moves independently up to 9 units and rotates by less than 0.02 radians. Where two or three objects are present, each has a different phase and moves by up to 6 units. Grounded objects and their floor stay still. Paths and rings change position or radius slowly; they are drawn behind and in front of the photo, making the subject sit within the design. The incoming and outgoing layers fade and slide independently during navigation; the background reveals with a diagonal sweep, or a circular reveal for quiet chapters. Captions, numbers and data charts never move.

Mobile places the text above the artwork inside the measured safe area; wider screens put text on the left and art on the right. Photos retain their proportions. The same renderer and time-independent layout are used for the live card, chapter thumbnails and 1080×1920 share image. Pause, hidden tabs, dialogs and reduced motion use the existing story controls; reduced motion stops the animation and resolves transitions immediately.

## Sport inventory

| Sport | Independent photographic layers | Vector layers and motion |
| --- | --- | --- |
| Running | curved red track; blue shoe | Blue disk and pink/orange sweeping ribbons; three lane curves move over and under the shoe. The track and shoe drift on separate paths. |
| Cycling | mountain ridge; road; wheel; handlebars | Yellow disk, pink band and orbit rings; the road and mountains move in counterpoint while the two bike parts drift on offset phases. |
| HIIT | rubber gym floor; kettlebell | Blue lightning plane and yellow disk; diagonal line work slides across a grounded floor and weight. |
| Strength | rubber floor; dumbbell | Alternating stepped pink/yellow planes move gently behind a stationary weight, with fine diagonal rules in front. |
| Walking | crosswalk; shoe | Offset color steps progress diagonally; the street fragment shifts slowly beneath the independently moving shoe. |
| Hiking | ridge; boot | Mountain-shaped planes and contour curves pass behind and in front of the boot; ridge and boot drift at different rates. |
| Swimming | pool-water fragment; goggles | Wide lane ribbons and three curved strokes slide past the goggles, with the water moving more slowly. |
| Rowing | open-water fragment; oar | Concentric ripple arcs expand subtly; the oar and water drift independently against a diagonal color band. |
| Yoga | studio-floor fragment; rolled mat | Nested arches, a pink arch and a yellow circle sway at the slowest pace; mat and floor remain grounded. |
| Pilates | studio floor; ball; mat | Two overlapping colored circles and orbit arcs move slowly; the ball and mat stay grounded. |
| Elliptical | studio floor; elliptical machine | Orbit rings breathe gently around the machine; floor and machine move independently. |
| Skiing | ridge; skis | Alternating slalom bands and curved lines move diagonally; skis float subtly above the slower ridge. |
| Golf | grass; golf ball; club | Concentric target rings expand subtly behind the still grass, ball and club. |
| Racket sports | court fragment; racket | Diagonal court-colored bands and moving rules pass behind and ahead of the racket. |
| Triathlon | open water; goggles; crank; shoe | Three diagonal bands connect the three independently phased equipment cutouts; lane curves weave across them. |
| Team sports | grass; football | Pitch-like bands and linework move behind a stationary ball and ground. |
| Climbing | ridge; carabiner | Ascending stepped planes and lines rise across the landscape; the carabiner moves separately from the ridge. |
| Cardio | gym floor; jump rope | A pulse-shaped plane and front line move around the stationary floor and rope. |

The intro, longest ride and elevation cards use separate ridge/road or ridge layers. Steps, sleep, recovery, morning, energy, nutrition and hydration use their own objects and corresponding step, moon, arch, target, burst or ripple motifs. Heart-rate and HRV cards use abstract pulse or ripple art without a medical photograph. Overview, monthly and health charts use the same type and palette with static data visualization; summary rows carry small colored vector rules. Sport duration, record and weekday cards include faint versions of their own separate art layers behind the chart on phones, and in the spare headline column on wide screens. Chart geometry and health high/low comparisons remain measured data rather than decorative motion.
