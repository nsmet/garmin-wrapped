/* The opening is optional; the form remains usable if any enhancement fails. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || (location.hash && location.hash !== '#connect')) return;
  const root = document.documentElement;
  root.classList.add('entry-intro-active');
  const timers = new Set();
  let intro, main, art, target, finished = false;
  const later = (callback, delay) => {
    const id = setTimeout(() => { timers.delete(id); callback(); }, delay);
    timers.add(id);
    return id;
  };
  function finish(focus = false) {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    root.classList.remove('entry-intro-active', 'entry-intro-revealing');
    if (intro) { intro.hidden = true; intro.classList.remove('intro-playing'); }
    if (main) main.inert = false;
    art?.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', placeArt);
    window.removeEventListener('pagehide', onPageHide);
    reduced.removeEventListener('change', onPreference);
    if (focus) document.getElementById('entry-title')?.focus({preventScroll: true});
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); finish(true); }
  }
  function onPreference(event) { if (event.matches) finish(); }
  function onPageHide() { finish(); }
  function placeArt() {
    if (!art || !target) return;
    const rect = target.getBoundingClientRect();
    const mobile = innerWidth <= 800;
    const scale = mobile ? Math.min(1.5, innerWidth * 1.14 / rect.width) : Math.min(1.35, innerWidth * .64 / rect.width);
    const pose = (x, y, rotation, size) => `translate(${Math.round(innerWidth*x-rect.width/2)}px, ${Math.round(innerHeight*y-rect.height/2)}px) rotate(${rotation}deg) scale(${size})`;
    art.style.setProperty('--intro-art-width', `${rect.width}px`);
    art.style.setProperty('--intro-art-height', `${rect.height}px`);
    art.style.setProperty('--intro-art-first', pose(mobile ? .68 : .79, mobile ? .71 : .62, 9, scale));
    art.style.setProperty('--intro-art-second', pose(mobile ? .64 : .75, mobile ? .71 : .56, -5, scale * 1.03));
    art.style.setProperty('--intro-art-final', `translate(${rect.left}px, ${rect.top}px) rotate(0deg) scale(1)`);
  }
  // Independent watchdog: the intro must never depend on the API or main module.
  later(() => finish(), 8000);
  document.addEventListener('DOMContentLoaded', async () => {
    if (finished) return;
    intro = document.getElementById('entry-intro');
    main = document.getElementById('onboarding');
    target = document.querySelector('.entry-poster .entry-art');
    if (!intro || !main || !target) { finish(); return; }
    main.inert = true;
    intro.hidden = false;
    // Clone the real artwork so its final layout exactly matches the landing page.
    art = target.cloneNode(true);
    art.classList.add('intro-shared-art');
    art.querySelector('img')?.removeAttribute('fetchpriority');
    intro.append(art);
    document.getElementById('intro-year').textContent = String(new Date().getFullYear());
    placeArt();
    window.addEventListener('resize', placeArt, {passive: true});
    window.addEventListener('pagehide', onPageHide);
    document.getElementById('intro-skip').addEventListener('click', () => finish(true), {once: true});
    document.addEventListener('keydown', onKey);
    reduced.addEventListener('change', onPreference);
    const image = art.querySelector('img');
    await Promise.race([
      Promise.allSettled([document.fonts.ready, image?.decode()]),
      new Promise(resolve => later(resolve, 700)),
    ]);
    if (finished) return;
    placeArt();
    intro.classList.add('intro-playing');
    later(() => root.classList.add('entry-intro-revealing'), 4150);
    later(() => finish(), 5600);
  }, {once: true});
})();
