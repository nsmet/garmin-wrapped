# Original asset provenance

## Editorial sport scenes — 27 October 2026

Nine people-free photographic scene backgrounds were generated with the built-in `image_gen` tool for the approved sport story direction. They are delivered as `public/assets/scene-{gym,pool,water,studio,urban,snow,green,court,rock}.webp`, encoded with `cwebp -q 83 -m 6 -sharp_yuv -metadata none`. Existing `track.webp` and `road.webp` are also used as scene photographs. The photographs contain no baked-in text or graphic shapes; the renderer combines them with independent equipment cutouts and animated Canvas geometry. The images are shared only where the environments suit the sports, with sport-specific palettes, subjects and motifs.

Shared prompt: “Create a premium sports editorial PHOTO BACKGROUND ONLY, portrait 9:16 composition for a mobile annual recap. Photorealistic, high contrast, richly textured, beautifully lit, aesthetically consistent with a bold graphic sports campaign. Leave a quieter darker area toward upper left for overlaid live text, and rich detail below and toward right. This is only a background: no geometric overlays, no typography, no text, no logo, no watermarks. Absolutely no people, faces, limbs, silhouettes or equipment.” Individual scenes were an empty dark training gym, outdoor lap pool, open water, sunlit movement studio, urban crosswalk, alpine ski slope, golf green, hard tennis court, and mountain rock face.

## Blue running shoe — 24 October 2026

`public/assets/shoe-blue.webp` replaces the coral/pink shoe throughout onboarding, loading, live stories, collages, thumbnails and exports. It was recolored with the built-in `image_gen` editing tool, preserving the original shoe design, warm-white midsole and transparent background. The complete edit prompt and source path are recorded in `source-assets/shoe-blue.json`. It uses a new filename so existing browser caches receive the blue version immediately. The original asset remains available in the source collection.

## Layered road ribbon — 24 October 2026

`public/assets/road-ribbon.webp` is an original transparent road-only photographic cutout generated with the built-in `image_gen` tool. Its complete generation prompt and source path are recorded in `source-assets/road-ribbon.json`. Delivery is 1024 × 1536 pixels, 471,630 bytes, encoded with the same WebP settings below and lossless alpha. The renderer combines it with the independent existing mountain cutout and code-drawn geometry; it never uses a flattened road-and-mountain scene. The existing opaque `road.webp` remains in the historical asset collection and is no longer loaded by the renderer.

## Expanded cutout collection

22 additional original transparent photographic cutouts were generated with the built-in image_gen tool for this iteration: shoe, crank, stairs, bench, pillow, clock, kettlebell, dumbbell, goggles, mat, orange, water, boot, oar, ball, elliptical, skis, golf, racket, football, carabiner and rope. These are neutral sports equipment, landscapes and everyday objects without people, branding or identity cues. Generation source paths are retained in `source-assets/v2-manifest.json`; delivery WebPs are in `public/assets/`. All foreground/background graphics are original Canvas code, not flattened into the photos. Asset proportions are preserved during responsive composition.

Generated with the built-in image_gen tool on 2026-10-22. No reference-image pixels, Olympic/FIFA assets, or third-party photos are included. The original delivery PNG/JPEG files are preserved in Git history, including commit `e997ed4b2230dead57ea68d5b85cbea8e30e11cc` under `dist/assets/`. They are not duplicated in the public build.

## Production delivery encoding

On 2026-10-23 all 25 photographic assets were encoded as WebP with libwebp `cwebp` 1.6.0 (libsharpyuv 0.4.2). RGB quality is 88 with sharp chroma conversion; alpha is lossless. Metadata was removed. No cropping, resizing, recoloring, or composition changes were made. The existing resolution supports the 1080-pixel portrait export without reducing source detail.

```sh
cwebp -q 88 -m 6 -alpha_q 100 -sharp_yuv -exact -metadata none original.png -o public/assets/name.webp
webpinfo -summary -diag public/assets/name.webp
```

Use the same encoder arguments with an original JPEG for road and track. Originals can be recovered without copying historical generated-image folders, for example:

```sh
git show e997ed4b2230dead57ea68d5b85cbea8e30e11cc:dist/assets/shoe.png > /tmp/shoe.png
cwebp -q 88 -m 6 -alpha_q 100 -sharp_yuv -exact -metadata none /tmp/shoe.png -o public/assets/shoe.webp
```

| Delivery files | Dimensions | Transparency |
| --- | --- | --- |
| `ball.webp`, `bench.webp`, `boot.webp`, `carabiner.webp`, `clock.webp`, `crank.webp`, `dumbbell.webp`, `elliptical.webp`, `football.webp`, `goggles.webp`, `golf.webp`, `kettlebell.webp`, `mat.webp`, `oar.webp`, `orange.webp`, `pillow.webp`, `racket.webp`, `rope.webp`, `shoe.webp`, `skis.webp`, `stairs.webp`, `water.webp` | 1254 × 1254 | Alpha preserved |
| `ridge.webp` | 1536 × 1024 | Alpha preserved |
| `road.webp`, `track.webp` | 1024 × 1536 | Opaque |

The complete image library decreased from **34,862,098 bytes (33.25 MiB) to 6,752,326 bytes (6.44 MiB), an 80.63% reduction**. The largest delivery image is 567,696 bytes. Validation decoded every WebP, checked unchanged dimensions and alpha presence, compared every alpha sample against its original (all 23 alpha planes are pixel-identical), and confirmed all 25 renderer asset paths exist. Representative originals and WebPs were also compared visually over the site background.

## ridge

Delivered file: public/assets/ridge.webp

Prompt:

Use case: photorealistic-natural. Asset type: transparent photographic cutout for an original editorial sports website. Create a spectacular jagged alpine mountain ridge with sharp rocky detail, snow pockets and dark blue-gray foreground rock, seen from a slightly low viewpoint. Landscape composition 3:2, mountains fill the entire bottom edge; one main pointed summit right of center, lower mountains extend to both edges. Remove all sky: truly transparent background above the naturally irregular mountain silhouette. Premium outdoor editorial photography, crisp cold morning light, subtle analogue film grain. No people, no type, no icons, no logos, no colored graphics. This is a photo layer that will sit over vivid flat poster geometry.

## road

Delivered file: public/assets/road.webp

Prompt:

Use case: photorealistic-natural. Asset type: original full-bleed photographic layer for an editorial sports recap website. A dramatic narrow paved cycling road sweeps in a large elegant S curve from the bottom foreground up into distant alpine slopes, low camera, strong vanishing point. Rich forest greens, blue distant mountains, warm morning sun, natural asphalt texture, no cars, no people, no buildings, no brands. Portrait composition 2:3. Leave some dark empty vegetation in upper-left for typography. Premium candid outdoor editorial photograph with slight analogue grain, believable natural details. No typography or graphic overlays.

## track

Delivered file: public/assets/track.webp

Prompt:

Use case: photorealistic-natural. Asset type: original sports photography for a bold graphic website. Extreme close, high oblique view of the sweeping curved lanes of an outdoor coral red athletics running track, thin crisp white lane lines receding in perspective, blue-green infield visible at the upper far side, warm directional morning light and fine rubber texture. No people, no numbers, no text, no signs, no logos, no stadium branding. Portrait 2:3 crop, strong cinematic editorial photography, subtly grainy. The curved white lines are the subject, not a stadium panorama.

## Homepage social preview

`public/social-preview.jpg` is a 1200 × 630 JPEG: the "Your Garmin year, wrapped." headline on navy, with three real story cards fanned on the right (hiking in front, running and cycling behind). The cards are renders of the busy fictional sample year (`renderShareCard` on `sample-full-hiking-sessions`, `sample-full-running-sessions` and `sample-full-cycling-sessions`), saved as 540 × 960 JPEGs in `source-assets/social-cards/`. The layout source is `source-assets/social-preview.html` (Sora from `public/assets/fonts/`); render it at 1200 × 630 after fonts and images load, then export as JPEG at quality 85. It contains no personal recap data. It is used by the Open Graph and Twitter metadata and application structured data.

## App icon and favicon

The icon is the MINI WATT bolt (the miniwatt.app logo) sampled into glowing dots on the navy ground, yellow (#FFD98A) at the centre to amber (#FE9A0C) at the tips. Larger sizes use a finer dot grid so the hollow outline bolt reads; small sizes use a coarser grid so it survives at 16–32 px.

- `public/favicon.svg`: the 8-column dot grid as SVG, used for browser tabs.
- `public/favicon-32.png`: PNG fallback for browsers without SVG favicons.
- `public/apple-touch-icon.png`: 180 × 180, square (iOS applies its own mask).

The source is `source-assets/brand-icons.html`: open it with `?size=N` (and `&round=0` for a square tile) and screenshot the N × N icon to export a PNG.


## Layered poster assets (28 October)

The independent transparent PNG sources are in `source-assets/layers/`; alpha-preserving WebP copies in `public/assets/layers/` are loaded by the app to keep downloads small. Existing equipment and landscape files were decoded losslessly from the existing alpha WebPs. New PNG fragments were created with the built-in image generation tool from the saved sport poster concepts or the matching existing scene as an art-direction reference: curved running track, gym floor, pool water, open water, crosswalk, grass, court, studio floor, bicycle wheel, bicycle handlebars, golf ball and golf club. The prompts asked for isolated photorealistic fragments, real transparency, no people, logos, text or rectangular backgrounds; the track, court and studio fragments additionally asked for the entire organic silhouette inside the canvas. The bicycle and golf prompts requested only the named object. The individual source images and animation treatment are catalogued in `LAYERED-ART.md`.

The built-in image-generation prompts used the following shared instructions: make a separate photorealistic transparent PNG layer for an animated editorial sports poster, compositable over colored geometry, with no people, text, logos, equipment other than the named subject, or rectangular scene. The named reference images were used for art direction. Individual requests were:

| PNG | Reference | Subject and framing requested |
| --- | --- | --- |
| `running-track.png` | `output/sport-design-drafts/running.png` | A complete red track fragment with three white lanes, seen from above at an angle; a sweeping ribbon with textured organic edges and tapered ends fully inside the image. |
| `gym-floor.png` | `public/assets/scene-gym.webp` | A dark textured rubber gym-floor patch in low perspective and warm directional light, with an irregular top edge. |
| `pool-water.png` | `public/assets/scene-pool.webp` | Turquoise pool water with receding lane lines and an irregular, rippling outline; no horizon. |
| `open-water.png` | `public/assets/scene-water.webp` | Dark blue rippling water with crisp sunlight reflections and a natural watery silhouette; no horizon. |
| `crosswalk.png` | `public/assets/scene-urban.webp` | Wet asphalt and white crosswalk stripes in oblique perspective, with an irregular contour. |
| `green.png` | `public/assets/scene-green.webp` | A low patch of lush fairway grass in perspective with an irregular grass edge, no mountains or sky. |
| `court.png` | `public/assets/scene-court.webp` | A complete isolated blue and orange hard-court patch with white markings and gritty texture, in low perspective, inside the image bounds. |
| `studio-floor.png` | `public/assets/scene-studio.webp` | An isolated irregular patch of warm stone studio floor with dappled sunlight and leaf shadows, in low perspective. |
| `bike-wheel.png` | `output/sport-design-drafts/cycling.png` | A complete black road-bike front wheel with tire, rim, spokes and disc rotor, at a slight three-quarter angle, without frame or handlebars. |
| `bike-bars.png` | `output/sport-design-drafts/cycling.png` | Black road-bike drop handlebars and brake levers at a three-quarter angle, without wheel or frame. |
| `golf-ball.png` | `output/sport-design-drafts/golf.png` | A single white dimpled golf ball seen slightly from above in directional light. |
| `golf-club.png` | `public/assets/golf.webp` | A complete silver golf iron, head and shaft, seen diagonally, without a ball or tee. |
