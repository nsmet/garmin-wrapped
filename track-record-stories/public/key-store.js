/* The one thing Garmin Wrapped keeps in the browser: the visitor's own Garmin Personal API key,
   and only after they tick "Remember my key on this device" (consent under the ePrivacy rules).
   This is the only file allowed to touch browser storage (scripts/check.mjs enforces it).
   Recaps, activity and health records always stay in memory. */
(() => {
  'use strict';
  const NAME = 'garmin-wraped:key';
  const storage = () => { try { return window.localStorage; } catch { return null; } };
  const valid = value => typeof value === 'string' && value.length >= 16 && value.length <= 4096 && !/\s/.test(value);
  const get = () => { try { const value = storage()?.getItem(NAME); return valid(value) ? value : ''; } catch { return ''; } };
  window.GWKeyStore = Object.freeze({
    name: NAME,
    get,
    has: () => !!get(),
    save(key) { try { if (valid(key)) storage()?.setItem(NAME, key); } catch {} },
    forget() { try { storage()?.removeItem(NAME); } catch {} }
  });
})();
