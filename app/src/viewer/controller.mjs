import { cardSpec, recapContext } from "../../vendor/public/dot-spec.mjs";
import {
  cardFrame,
  drawBackground,
  drawText,
  collectDots,
  createDotBuffer,
  drawDots2D,
  snapshotDots,
  TEXT_SETTLE,
} from "../../vendor/public/dot-card.mjs";
import { ease } from "../../vendor/public/dot-engine.mjs";
import {
  loadThree,
  createDotRenderer,
  disposeOffscreen,
} from "./dot-scene.mjs";

export async function loadViewerFonts() {
  if (!document.fonts) return;
  await Promise.all(
    [400, 600, 700, 800].map((weight) =>
      document.fonts.load(`${weight} 40px Sora`),
    ),
  );
  await document.fonts.ready;
  if (!document.fonts.check("800 40px Sora"))
    throw Error("The bundled recap font could not load. Reopen your recap.");
}
export function createViewer({
  container,
  background,
  labels,
  presentation,
  initialIndex = 0,
  onSelect = (index) => {},
  onError = (message) => {},
  onRenderer = (renderer) => {},
}) {
  const stories = presentation.stories,
    context = recapContext(stories),
    specs = stories.map((s) => ({
      ...cardSpec(s, context),
      healthTag: s.health
        ? presentation.exampleOnly
          ? "HEALTH CARD · FICTIONAL DEMO"
          : "HEALTH CARD · ASKS BEFORE SHARING"
        : "",
    }));
  let disposed = false,
    ready = false,
    raf = 0,
    active = true,
    paused = false,
    reduced = false,
    width = 1,
    height = 1,
    ratio = 1,
    dots = null,
    gl = null,
    two = null,
    last = 0,
    lastDraw = 0,
    bgDirty = true,
    textDirty = true;
  const frames = new Map();
  const state = {
    index: Math.min(initialIndex, stories.length - 1),
    from: 0,
    to: 0,
    clock: 0,
    enter: 0,
    fromEnter: 0,
    elapsed: 0,
    progress: 1,
    busy: false,
    morph: null,
  };
  state.from = state.to = state.index;
  const b = background.getContext("2d"),
    t = labels.getContext("2d"),
    buffer = createDotBuffer();
  if (!b || !t) throw Error("Your device could not create a drawing surface.");
  const frame = (i) => {
    if (frames.has(i)) return frames.get(i);
    const result = cardFrame(width, height, {
      mode: "live",
      bounds: { top: 68, bottom: height - 98, left: 0, right: width },
      spec: specs[i],
      ctx: t,
    });
    frames.set(i, result);
    return result;
  };
  const intro = (enter) => (reduced ? null : Math.max(0, state.clock - enter));
  const ambient = (enter) => (reduced ? 30 : Math.max(0, state.clock - enter));
  function fallback() {
    const old = gl;
    gl = null;
    old?.dispose();
    dots?.remove();
    dots = document.createElement("canvas");
    dots.className = "dot-layer dot-points";
    dots.dataset.renderer = "2d";
    dots.setAttribute("aria-hidden", "true");
    background.after(dots);
    two = dots.getContext("2d");
    onRenderer("2d");
    sizeDots();
    draw();
  }
  function mountDots() {
    dots = document.createElement("canvas");
    dots.className = "dot-layer dot-points";
    dots.dataset.renderer = "webgl";
    dots.setAttribute("aria-hidden", "true");
    background.after(dots);
    gl = createDotRenderer(dots, { opaque: true });
    if (!gl) {
      fallback();
      return;
    }
    dots.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        if (!disposed && gl) fallback();
      },
      { once: true },
    );
    onRenderer("webgl");
    sizeDots();
  }
  function sizeDots() {
    if (gl) gl.setSize(width, height, ratio);
    else if (dots && two) {
      dots.width = Math.round(width * ratio);
      dots.height = Math.round(height * ratio);
      two.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }
  function draw() {
    if (disposed || !ready || !stories.length) return;
    try {
      const to = specs[state.to],
        from = specs[state.from],
        target = frame(state.to),
        origin = frame(state.from),
        transition = state.busy && state.from !== state.to,
        k = ease(state.progress);
      if (bgDirty || transition) {
        drawBackground(b, width, height, to, target, null);
        if (transition && k < 1) {
          b.save();
          b.globalAlpha = 1 - k;
          drawBackground(b, width, height, from, origin, null);
          b.restore();
        }
        bgDirty = transition;
      }
      buffer.n = 0;
      if (transition && !from.promo)
        collectDots(buffer, from, {
          t: ambient(state.fromEnter),
          intro: null,
          fade: 1 - ease(state.progress / 0.45),
          frame: origin,
        });
      if (!to.promo)
        collectDots(buffer, to, {
          t: ambient(state.enter),
          intro: intro(state.enter),
          frame: target,
          from: state.morph,
        });
      const clip = target.wide ? target.clip : null;
      if (gl && !gl.draw(buffer, { additive: true, clip })) {
        fallback();
        return;
      }
      if (two) {
        two.clearRect(0, 0, width, height);
        two.save();
        if (clip) {
          two.beginPath();
          two.rect(clip.x, clip.y, clip.w, clip.h);
          two.clip();
        }
        drawDots2D(two, buffer);
        two.restore();
      }
      const entering = intro(state.enter);
      if (
        textDirty ||
        transition ||
        (entering !== null && entering < TEXT_SETTLE + 0.2)
      ) {
        t.clearRect(0, 0, width, height);
        if (transition && !from.promo)
          drawText(t, origin, from, {
            intro: null,
            alpha: 1 - ease(state.progress / 0.3),
          });
        if (!to.promo)
          drawText(t, target, to, {
            intro: transition ? Math.max(0, entering - 0.15) : entering,
          });
        textDirty = false;
      }
    } catch {
      stop();
      onError("The story could not be drawn. Reopen your recap to try again.");
    }
  }
  function tick(now) {
    raf = 0;
    if (disposed || !active || document.hidden || !ready) return;
    const dt = Math.min(last ? now - last : 16, 50);
    last = now;
    if (!paused && !reduced) state.clock += dt / 1000;
    if (state.busy) {
      state.elapsed += dt;
      state.progress = Math.min(1, state.elapsed / 900);
      if (state.progress === 1) finish();
    }
    if (
      state.busy ||
      state.clock - state.enter < TEXT_SETTLE + 0.3 ||
      now - lastDraw >= 32
    ) {
      lastDraw = now;
      draw();
    }
    if (state.busy || (!paused && !reduced)) raf = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function start() {
    if (!disposed && active && !document.hidden && ready && !raf)
      raf = requestAnimationFrame(tick);
  }
  function finish() {
    textDirty = bgDirty = true;
    state.index = state.to;
    state.from = state.to;
    state.busy = false;
    state.progress = 1;
    state.morph = null;
    if (paused || reduced) state.enter = state.clock - 10;
    onSelect(state.index);
  }
  function resize() {
    if (disposed) return;
    const box = container.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    ratio = Math.min(devicePixelRatio || 1, 2);
    frames.clear();
    textDirty = bgDirty = true;
    for (const canvas of [background, labels]) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    b.setTransform(ratio, 0, 0, ratio, 0, 0);
    t.setTransform(ratio, 0, 0, ratio, 0, 0);
    sizeDots();
    draw();
  }
  const visibility = () => {
    if (document.hidden) stop();
    else {
      draw();
      start();
    }
  };
  document.addEventListener("visibilitychange", visibility);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  Promise.all([loadViewerFonts(), loadThree()])
    .then(() => {
      if (disposed) return;
      ready = true;
      mountDots();
      resize();
      onSelect(state.index);
      draw();
      start();
    })
    .catch(() =>
      onError("The bundled recap assets could not load. Reopen your recap."),
    );
  return {
    go(index) {
      if (
        disposed ||
        !ready ||
        state.busy ||
        index < 0 ||
        index >= stories.length ||
        index === state.index
      )
        return false;
      state.morph =
        reduced || paused || specs[state.index].promo
          ? null
          : snapshotDots(specs[state.index], {
              t: ambient(state.enter),
              intro: intro(state.enter),
              frame: frame(state.index),
            });
      state.from = state.index;
      state.to = index;
      state.fromEnter = state.enter;
      state.enter = state.clock;
      state.elapsed = 0;
      state.progress = 0;
      state.busy = true;
      textDirty = bgDirty = true;
      if (paused || reduced) finish();
      draw();
      start();
      return true;
    },
    configure(options) {
      textDirty = true;
      active = options.active;
      paused = options.paused;
      reduced = options.reduced;
      if (paused || reduced) {
        if (state.busy) finish();
        state.enter = state.clock - 30;
      }
      if (!active) stop();
      else {
        draw();
        start();
      }
    },
    resize,
    dispose() {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      gl?.dispose();
      gl = null;
      disposeOffscreen();
      dots?.remove();
      buffer.n = 0;
      specs.length = 0;
      frames.clear();
      for (const canvas of [background, labels])
        canvas.width = canvas.height = 0;
    },
  };
}
