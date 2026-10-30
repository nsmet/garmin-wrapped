/* Opening sequence: scattered dots → "Your Garmin, wrapped." → the dots gather into a globe →
   "One dot per activity." → the globe glides into place beside the connect form.
   The form never depends on this script: any failure ends the intro and leaves the page usable. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const skip = reduced.matches || (location.hash && location.hash !== '#connect');
  if (!skip) root.classList.add('entry-intro-active');
  const timers = new Set();
  let intro, main, field, finished = skip;
  const later = (callback, delay) => { const id = setTimeout(() => { timers.delete(id); callback(); }, delay); timers.add(id); return id; };
  const connectOrb = () => document.getElementById('connect-orb');

  function finish(focus = false) {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    field?.to({ anchor: connectOrb(), gather: 1, alpha: 1, mode: 'reel' }, focus ? 0 : 700);
    root.classList.remove('entry-intro-active');
    root.classList.add('entry-intro-revealing');
    setTimeout(() => root.classList.remove('entry-intro-revealing'), 1600);
    if (intro) { intro.hidden = true; intro.className = 'gw-intro'; }
    if (main) main.inert = false;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('pagehide', onPageHide);
    reduced.removeEventListener('change', onPreference);
    if (focus) document.getElementById('connect-title')?.focus({ preventScroll: true });
  }
  function onKey(event) { if (event.key === 'Escape') { event.preventDefault(); finish(true); } }
  function onPreference(event) { if (event.matches) finish(); }
  function onPageHide() { finish(); }
  function phase(name) { if (!finished) intro.dataset.phase = name; }

  // Independent watchdog: the intro must never depend on the API or main module.
  if (!skip) later(() => finish(), 10000);
  document.addEventListener('DOMContentLoaded', () => {
    field = window.GWField?.get();
    if (skip) { field?.to({ anchor: connectOrb(), gather: 1, alpha: 1, mode: 'reel' }, 0); return; }
    intro = document.getElementById('entry-intro');
    main = document.getElementById('onboarding');
    const introOrb = document.getElementById('intro-orb');
    if (!intro || !main || !field || !introOrb) { finish(); return; }
    main.inert = true;
    intro.hidden = false;
    // Scattered across the screen, fading in.
    field.to({ anchor: introOrb, gather: 0, alpha: 0 }, 0);
    field.to({ alpha: 1 }, 1300);
    window.addEventListener('pagehide', onPageHide);
    document.getElementById('intro-skip').addEventListener('click', () => finish(true), { once: true });
    document.addEventListener('keydown', onKey);
    reduced.addEventListener('change', onPreference);
    later(() => phase('one'), 300);
    later(() => phase('one-out'), 3300);
    later(() => { phase('two'); field.to({ anchor: introOrb, gather: 1, alpha: 1 }, 2400); }, 3600);
    later(() => { phase('two-out'); field.to({ anchor: connectOrb(), gather: 1, alpha: 1, mode: 'reel' }, 1300); }, 6400);
    later(() => finish(), 7300);
  }, { once: true });
})();
