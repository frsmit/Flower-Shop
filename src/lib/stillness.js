/**
 * "Hold still" - one switch that stops everything moving on the page.
 *
 * Separate from `prefers-reduced-motion`, and deliberately so. That setting is
 * a standing preference expressed to the operating system, months ago, by
 * someone who may not even remember setting it. This is a button she can press
 * on this page, now, because the petals are making it hard to read a poem - and
 * press again when she wants them back.
 *
 * It lives outside React because two very different kinds of thing have to obey
 * it: components, which want a hook, and the raw `requestAnimationFrame` loop
 * driving the petal canvas, which wants a plain subscription. An external store
 * serves both without threading a prop through every component on the page.
 *
 * The flag is mirrored onto `<html data-still>` so the stylesheet can pause
 * every CSS animation in one rule, rather than each component having to know
 * about it.
 */

const KEY = 'birthday-bloom:stillness';

const listeners = new Set();
let still = false;

/** Reflected onto the document so CSS can act on it without a React render. */
function mirror() {
  if (typeof document === 'undefined') return;
  if (still) document.documentElement.dataset.still = 'true';
  else delete document.documentElement.dataset.still;
}

// Read once, at module load, so the very first paint is already correct - a
// page that starts moving and then stops is worse than one that never moved.
if (typeof window !== 'undefined') {
  try {
    still = window.localStorage.getItem(KEY) === 'true';
  } catch {
    /* private mode, or storage blocked: the default of "moving" is fine */
  }
  mirror();
}

export function isStill() {
  return still;
}

export function setStill(next) {
  if (next === still) return;
  still = next;
  mirror();

  try {
    window.localStorage.setItem(KEY, String(still));
  } catch {
    /* it just won't be remembered next visit, which is not worth failing over */
  }

  for (const listener of listeners) listener();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
