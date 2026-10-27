/* Set the opening state before the page paints; the homepage also works without JS. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || (location.hash && location.hash !== '#connect')) return;
  const root = document.documentElement;
  root.classList.add('entry-intro-active');
  let intro, main, fallback;
  function finish(focus = false) {
    clearTimeout(fallback);
    root.classList.remove('entry-intro-active');
    if (intro) intro.hidden = true;
    if (main) main.inert = false;
    document.removeEventListener('keydown', onKey);
    reduced.removeEventListener('change', onPreference);
    if (focus) document.getElementById('entry-title')?.focus({preventScroll: true});
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); finish(true); }
  }
  function onPreference(event) { if (event.matches) finish(); }
  // A failed main module or missing animation must never trap the visitor.
  fallback = setTimeout(() => finish(), 3200);
  document.addEventListener('DOMContentLoaded', () => {
    if (!root.classList.contains('entry-intro-active')) return;
    intro = document.getElementById('entry-intro');
    main = document.getElementById('onboarding');
    if (!intro || !main) { finish(); return; }
    main.inert = true;
    intro.hidden = false;
    intro.addEventListener('animationend', event => {
      if (event.target === intro && event.animationName === 'intro-exit') finish();
    });
    document.getElementById('intro-skip').addEventListener('click', () => finish(true));
    document.addEventListener('keydown', onKey);
    reduced.addEventListener('change', onPreference);
  }, {once: true});
})();
