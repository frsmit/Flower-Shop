/**
 * A clock offset for previewing, driven by `?at=` in the URL.
 *
 * The whole payoff of this page - the butterflies lifting off, the confetti,
 * the closing line - runs exactly once, unattended, at midnight, and cannot be
 * re-run if something about it is wrong. Waiting to find out is the one testing
 * strategy that has no second attempt, so the clock has to be movable.
 *
 * It offsets the clock rather than freezing it: time still flows from wherever
 * you land, so you can sit a few seconds before midnight and watch the handoff
 * happen for real, at the real speed, instead of inspecting two static states
 * either side of it.
 *
 *   ?at=2026-09-27T00:00:00+05:30   an instant (keep the offset - see below)
 *   ?at=+22d                        relative to now
 *   ?at=-1d12h                      compound, and backwards
 *
 * Deliberately not restricted to dev builds. The point is to preview the real
 * deployed bundle on the real host, which is the only place the fonts, the
 * timezone handling and the build-time config are all the ones she'll get.
 * Nothing is being protected by leaving it out: `VITE_*` values are inlined
 * into the bundle, so the poem is readable in the shipped JavaScript either way
 * - see the note in config.js.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const UNITS = { s: SECOND, m: MINUTE, h: HOUR, d: DAY, w: WEEK };

/**
 * `+90m`, `-2d`, `+1d12h30m`. The sign is required, which is what keeps this
 * from ever having to guess whether `2026` was meant as a year or as seconds.
 */
export function parseOffset(value) {
  const shape = /^([+-])((?:\d+(?:\.\d+)?[smhdw])+)$/i.exec(value.replace(/\s+/g, ''));
  if (!shape) return null;

  let total = 0;
  for (const [, amount, unit] of shape[2].matchAll(/(\d+(?:\.\d+)?)([smhdw])/gi)) {
    total += Number(amount) * UNITS[unit.toLowerCase()];
  }
  return shape[1] === '-' ? -total : total;
}

/**
 * How far the clock has been moved, in ms, and the instant it was moved to.
 *
 * Resolved once, against a single reading of the real clock: recomputing the
 * skew per tick would re-anchor 'now' every second and the preview would never
 * actually advance.
 */
function resolve(raw) {
  const none = { skew: 0, previewing: false, at: null };
  if (typeof raw !== 'string' || raw.trim() === '') return none;

  /*
   * A query string decodes '+' as a space, so ?at=+22d typed straight into the
   * address bar arrives here as ' 22d' - and an offset with no sign is refused
   * on purpose, so it would have fallen through to date parsing and failed
   * silently. A leading space is only ever the plus somebody typed.
   */
  const value = /^\s/.test(raw) ? `+${raw.trim()}` : raw.trim();
  const anchor = Date.now();

  const offset = parseOffset(value);
  if (offset !== null) {
    return { skew: offset, previewing: true, at: anchor + offset };
  }

  const instant = new Date(value).getTime();
  if (Number.isNaN(instant)) {
    console.warn(
      `[preview] ?at=${value} isn't a date or an offset like +22d, so the clock is left alone.`,
    );
    return none;
  }

  // A bare '2026-09-27' is read as UTC midnight, which is 5:30am in India and
  // therefore lands on the wrong side of the handoff you were trying to watch.
  if (!/[Tt]/.test(value)) {
    console.warn(
      `[preview] ?at=${value} has no time, so it's UTC midnight - not local. Add T00:00:00+05:30 to be sure.`,
    );
  }

  return { skew: instant - anchor, previewing: true, at: instant };
}

function readParam() {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('at');
  } catch {
    return null;
  }
}

const state = resolve(readParam());

/** True when the clock has been moved, so the page can say so out loud. */
export const previewing = state.previewing;

/** The instant we were sent to, for labelling the preview. */
export const previewAt = state.at;

/** The app's clock. The only difference from `Date.now()` is the offset. */
export const now = () => Date.now() + state.skew;

if (previewing) {
  console.warn(
    `[preview] clock moved to ${new Date(state.at).toString()} - this is NOT the live page.`,
  );
}

export default now;
