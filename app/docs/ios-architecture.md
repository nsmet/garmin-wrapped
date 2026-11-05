# iOS architecture recommendation

Decision/research updated 5 November 2026 after the user deferred Android and asked whether fully native iOS would be preferable for performance and graphics.

**Preferred direction: keep Expo/React Native for the native app and domain pipeline, and replace the recap WebView with a native Skia renderer backed by Metal on iOS.** A measured iPhone prototype is required before switching the production rendering path. The current bundled Three.js/Canvas implementation remains the functional and visual reference; a native renderer has not been implemented or benchmarked in this environment.

## Why this fits MiniWatt

The onboarding, key storage, import coordinator, privacy/coverage/read-card screens and share sheet already use native iOS views/APIs. The graphics surface is the part embedded in a WebView. Expo does not mean the whole app is a website.

The current Three.js path uses an orthographic camera and screen-space point sprites. Globe/shape motion is projected in the pure geometry engine; the GPU shader draws radial dot falloff and blending. The fictional fixture has 89 shareable scenes, ranging from 8 to 968 total dots in the reviewed engine; high-count imports can select units up to an activity-dot target of 2,400, plus guide dots. This is a strong fit for native Skia batches, shaders, paths and text. It does not require rewriting the app as a 3D game or replacing every native screen.

Keeping the website's JavaScript normalizers, calculation, eligibility and story selection avoids a second implementation of the Garmin data rules. Keep those functions unchanged, and feed only their validated presentation output into native drawing. The reviewed geometry/layout/spec/domain files contain roughly 1,600 densely written lines, with many sport-specific behaviors and thresholds; a full language port must reproduce and revalidate them.

| Approach | Strength | Cost / limitation | Recommendation |
| --- | --- | --- | --- |
| Expo + bundled WKWebView/Three.js | Existing close visual parity, shared web algorithms, working Canvas fallback | WebView lifecycle and serialization/export transfer; rendering limits must be measured on phones | Keep as reference/fallback while native work is verified |
| Expo + native Skia/Metal drawing | Native GPU surface and image export, native controls, existing tested JS domain rules retained | Port the drawing/layout adapter and animation scheduling; verify font metrics, blending, dot meanings and exports on devices | Preferred next renderer for this app |
| SwiftUI + custom Metal renderer | Maximum direct control of GPU buffers, shaders, frame scheduling and Apple-specific integration | New UI/session/sharing implementation and a careful port or separately hosted JS domain engine; largest parity/release burden | Choose if native-only requirements or measurements justify custom GPU control |

A SwiftUI label alone does not make graphics fast: drawing thousands of individual SwiftUI views per frame would be the wrong architecture. A full native implementation should use one MTKView/batched Metal scene, with SwiftUI for controls. Similarly, the Skia renderer should use batched point sprites/atlas or runtime shader drawing, not one React component and state update per dot.

## Native renderer boundary

1. Preserve native Expo import, session/privacy controls, immutable web baseline and the presentation contract. No changes to the website or its deployment.
2. Build the native scene from the same card spec, unit selection, colors, geometry and dot semantics. Cache immutable geometry; avoid per-frame allocation and React reconciliation per point. Send only the small animation state/transforms needed for frame updates.
3. Use native Skia text/font loading with the original licensed font outlines; verify metrics against the reference. Preserve additive radial sprites, guide/data dot distinction, clipping, morphs and reduced motion.
4. Generate 1080 × 1920 exports through the same native drawing path and write bytes directly to app cache. Keep native per-card health authority and metadata checks. This can remove the current DOM/base64 export transfer.
5. Keep readable native text/controls and accessibility descriptions separate from GPU artwork. Pause the render clock for modals/background and release surfaces on teardown.

Use the Expo SDK-supported Skia release first. Expo's current SDK page recommends `@shopify/react-native-skia` 2.14.0. Upstream has since moved to the `react-native-skia` package and a v3 Graphite backend; that is not proof of compatibility with this app's pinned SDK. V2 remains maintained and already supports a Metal backend. Do not silently upgrade to a new native graphics stack before an iOS build/device gate.

## Evidence required before choosing the shipping renderer

Measure the current WebView and native candidate on the same physical iPhone in release-like builds, using identical synthetic presentation inputs. Cover sparse/dense scenes, all 89 shareable fixture stories, morph transitions, four colorways, reduced motion and consecutive PNG exports. Measure frame-time distribution/stalls, interaction latency, peak/retained memory and energy over at least 15 minutes. Compare every story/PNG against the reference and preserve exact data-dot meaning.

There is no measured claim that the current viewer is too slow, nor that a full Swift rewrite will outperform a well-designed native Skia renderer for these scenes. This Linux environment has no Xcode, Metal runtime or physical iPhone; native compilation, GPU profiling and a reliable final performance choice require those external resources. Existing app work is preserved while that gate remains open.

Sources checked on 5 November 2026:

- [Expo Skia SDK support](https://docs.expo.dev/versions/latest/sdk/skia/).
- [Upstream React Native Skia renderer/backends and maintained v2](https://github.com/wcandillon/react-native-skia).
- [Apple Metal overview and profiling tools](https://developer.apple.com/metal/).
- [React Native host-view rendering](https://reactnative.dev/architecture/render-pipeline).
- App-local `vendor/public/{dot-scene,dot-engine,dot-card,dot-spec,metrics,story-model}.mjs` source review.
