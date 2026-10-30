/* The "one dot per activity" globe behind the intro, connect and loading screens.
   One shared canvas (#entry-field). Screens place an empty anchor element (.gw-orb) where the
   globe should sit; the field follows that anchor and glides between anchors, so the globe
   travels from the intro to the form to the loading screen without a cut.
   Colours follow the fictional 572-activity sample year (one dot per activity, by sport). */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  // [sport accent, activities] for the fictional sample year
  const SAMPLE = [['#FFB35C', 126], ['#6FA8FF', 88], ['#FFD86B', 61], ['#FF79B0', 48], ['#7FE0A8', 31], ['#6FD8FF', 30], ['#FF7A4D', 24], ['#9FF0D8', 22], ['#FFA64D', 20], ['#E8F56A', 18], ['#9BE36A', 16], ['#FF6B7A', 15], ['#C3B2FF', 14], ['#8FB8FF', 12], ['#E2F2FF', 11], ['#C8F56A', 10], ['#FF9A6B', 9], ['#FF8C7A', 9], ['#E3B8FF', 8]];
  const GUIDE = '#5B6C98', GUIDES = 520;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const out3 = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  function rng(seed) { let s = seed % 2147483647 || 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  const sprites = {};
  function sprite(hex, core) {
    const key = hex + (core ? '*' : ''); if (sprites[key]) return sprites[key];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), n = parseInt(hex.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, core ? 'rgba(255,255,255,1)' : `rgba(${rgb},1)`); gr.addColorStop(.28, `rgba(${rgb},1)`); gr.addColorStop(.5, `rgba(${rgb},.32)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (sprites[key] = c);
  }
  function makeDots() {
    const r = rng(11), cols = [];
    for (const [c, n] of SAMPLE) for (let i = 0; i < n; i++) cols.push(c);
    for (let i = cols.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cols[i], cols[j]] = [cols[j], cols[i]]; }
    const ga = Math.PI * (3 - Math.sqrt(5)), pts = [], n = cols.length;
    for (let i = 0; i < GUIDES; i++) { const y = 1 - i / (GUIDES - 1) * 2, rr = Math.sqrt(1 - y * y), th = ga * i + .4; pts.push({ x: Math.cos(th) * rr * .99, y: y * .99, z: Math.sin(th) * rr * .99, g: 1, c: GUIDE, d: r() * .5, u: r(), v: r(), ph: r() * TAU }); }
    // Fill order is shuffled so a loading globe fills evenly instead of pole to pole.
    const order = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let i = 0; i < n; i++) { const y = 1 - i / (n - 1) * 2, rr = Math.sqrt(1 - y * y), th = ga * i; pts.push({ x: Math.cos(th) * rr, y, z: Math.sin(th) * rr, g: 0, c: cols[i], d: r() * .5, u: r(), v: r(), ph: r() * TAU, ang: r() * TAU, arr: -1, i: order[i] }); }
    return { pts, n };
  }

  function create(canvas) {
    const ctx = canvas.getContext('2d'), { pts, n } = makeDots(), reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, clock = 0, frames = 0, paused = false, visible = true;
    // target: what the screen asks for; from: values when the target last changed
    let target = { anchor: null, gather: 1, alpha: 1, spin: .16, fill: 1, mode: 'globe' }, from = null, t0 = 0, dur = 0, cur = null;
    // Reel mode (connect screen): entry-reel.mjs plays the card visuals. It starts from wherever the
    // globe's dots last were, so the globe turns into the first visual instead of cutting.
    const seen = { n: pts.length, x: new Float32Array(pts.length), y: new Float32Array(pts.length), r: new Float32Array(pts.length), a: new Float32Array(pts.length), c: pts.map(p => p.c), g: pts.map(p => p.g) };
    let reel = null, reelFrom = null, reelStart = 0;
    // bright data dots first (the reel lists its shapes the same way), then the faint guide dots
    const byKind = pts.map((p, i) => i).sort((a, b) => pts[a].g - pts[b].g);
    const snapshot = () => ({ n: seen.n, x: Float32Array.from(byKind, i => seen.x[i]), y: Float32Array.from(byKind, i => seen.y[i]), r: Float32Array.from(byKind, i => seen.r[i]), a: Float32Array.from(byKind, i => seen.a[i]), c: byKind.map(i => seen.c[i]), g: byKind.map(i => seen.g[i]) });
    function startReel() { reelFrom = snapshot(); reelStart = clock; }
    function size() {
      const w = innerWidth, h = innerHeight, d = Math.min(2, devicePixelRatio || 1);
      if (w === W && h === H && d === dpr) return false;
      W = w; H = h; dpr = d; canvas.width = Math.round(W * d); canvas.height = Math.round(H * d); return true;
    }
    function goal() {
      const a = target.anchor, r = a && a.isConnected ? a.getBoundingClientRect() : null;
      const box = r && r.width ? r : { left: W * .5 - Math.min(W, H) * .3, top: H * .5 - Math.min(W, H) * .3, width: Math.min(W, H) * .6, height: Math.min(W, H) * .6 };
      return { cx: box.left + box.width / 2, cy: box.top + box.height / 2, R: Math.min(box.width, box.height) / 2, gather: target.gather, alpha: target.alpha };
    }
    function still() { return paused || reduced.matches; }
    function values(now) {
      const g = goal();
      if (!from || still()) { cur = g; return g; }
      const k = ease((now - t0) / dur);
      cur = {}; for (const key in g) cur[key] = from[key] + (g[key] - from[key]) * k;
      return cur;
    }
    function render(now) {
      size(); if (!W) return;
      const L = values(now), spin = target.spin, ds = (W < 600 ? .9 : 1) * clamp(Math.sqrt(L.R / 127), 1, 1.9), fill = target.fill;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      if (target.mode === 'reel' && reel) {
        reel.frame(clock - reelStart, L, reelFrom, reduced.matches, (x, y, rad, a, c, g) => {
          a *= L.alpha; if (a <= .01 || rad <= .05) return;
          ctx.globalAlpha = Math.min(1, a);
          ctx.drawImage(sprite(c, !g && rad > 2.5), x - rad * 1.6, y - rad * 1.6, rad * 3.2, rad * 3.2);
        });
        ctx.globalAlpha = 1; frames++; canvas.dataset.frames = String(frames); canvas.dataset.mode = 'reel';
        return;
      }
      canvas.dataset.mode = 'globe';
      const a0 = spin * clock + .6, ca = Math.cos(a0), sa = Math.sin(a0), cb = Math.cos(.35), sb = Math.sin(.35), t = clock;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca, y2 = p.y * cb - z1 * sb, z2 = p.y * sb + z1 * cb, k = 4 / (4 + z2), ka = .5 + .5 * clamp((1 - z2) / 2, 0, 1);
        const ox = L.cx + x1 * L.R * k, oy = L.cy - y2 * L.R * k;
        const sx = p.u * W + Math.sin(t * .25 + p.ph) * 10, sy = p.v * H + Math.cos(t * .2 + p.ph) * 8;
        const e = ease((L.gather - p.d * .45) / .55);
        let x = sx + (ox - sx) * e, y = sy + (oy - sy) * e, a, rad;
        if (p.g) { a = .42 * (.35 + .65 * e) * (e > .02 ? ka : 1); rad = 1.15 * (.8 + .2 * e) * (e > .5 ? k : 1) * Math.min(ds, 1.4); }
        else {
          const tw = .55 + .45 * Math.sin(t * 1.3 + p.ph);
          a = (e < .05 ? .62 * tw : 1) * (.25 + .75 * e) * (e > .3 ? ka : 1); rad = 3 * ds * (.55 + .45 * e) * (e > .3 ? k : 1);
          if (fill < 1) {
            if (p.i >= fill * n - 1e-6) { p.arr = -1; seen.a[i] = 0; continue; }
            if (p.arr < 0) p.arr = still() ? -1e9 : now;
            const f = out3((now - p.arr) / 1100), dd = L.R * 2.4, fx = L.cx + Math.cos(p.ang) * dd, fy = L.cy + Math.sin(p.ang) * dd * .8;
            x = fx + (x - fx) * f; y = fy + (y - fy) * f; rad *= 1 + .9 * (1 - f); a *= .3 + .7 * f;
          }
        }
        a *= L.alpha; seen.x[i] = x; seen.y[i] = y; seen.r[i] = rad; seen.a[i] = Math.min(1, Math.max(0, a)); if (a <= .01) continue;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(sprite(p.c, !p.g && rad > 2.5), x - rad * 1.6, y - rad * 1.6, rad * 3.2, rad * 3.2);
      }
      ctx.globalAlpha = 1; frames++; canvas.dataset.frames = String(frames);
    }
    function busy(now) { return from && now - t0 < dur || pts.some(p => p.arr > 0 && now - p.arr < 1100); }
    function loop(now) {
      raf = 0; if (!visible || document.hidden) return;
      const dt = Math.min(last ? now - last : 16, 50);
      if (!still()) clock += dt / 1000;
      if (now - last >= 30 || !last) { last = now; render(now); }
      if (!still() || busy(now)) raf = requestAnimationFrame(loop);
    }
    function wake() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(loop); } }
    function redraw() { if (visible) render(performance.now()); wake(); }
    addEventListener('resize', redraw, { passive: true });
    document.addEventListener('visibilitychange', wake);
    reduced.addEventListener('change', () => { clock = reduced.matches ? 40 : clock; redraw(); });
    if (reduced.matches) clock = 40;
    return {
      // Move the globe to a new anchor. duration 0 jumps.
      to(next, duration = 1200) {
        const now = performance.now();
        if (cur && duration > 0) from = { ...values(now) }; else from = null;
        if (next.mode === 'reel' && target.mode !== 'reel') startReel();
        target = { ...target, ...next }; t0 = now; dur = Math.max(1, duration); redraw();
      },
      // Register the card reel (entry-reel.mjs). If the reel is already wanted, it takes over now.
      useReel(r) { reel = r; if (target.mode === 'reel') startReel(); redraw(); },
      fill(value) { target.fill = clamp(value, 0, 1); redraw(); },
      setPaused(value) { paused = !!value; canvas.dataset.paused = String(paused); redraw(); },
      show(value) { visible = !!value; canvas.hidden = !visible; if (visible) redraw(); else { cancelAnimationFrame(raf); raf = 0; } },
      get frames() { return frames; }
    };
  }
  let shared = null;
  window.GWField = {
    get() {
      if (shared) return shared;
      const canvas = document.getElementById('entry-field');
      if (!canvas || !canvas.getContext) return null;
      try { shared = create(canvas); } catch { shared = null; }
      return shared;
    }
  };
})();
