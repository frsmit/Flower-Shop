/**
 * The poem, and the arithmetic that decides how much of it she has earned.
 *
 * One line unlocks per day of the wait, each one carried in by a butterfly that
 * then stays on the page - so the countdown is legible as a filling garden and
 * not only as four digits. The final line is the birthday's own and never
 * unlocks early; it lands when the celebration screen does.
 *
 * Everything here is a pure function of (target, now). No clock is read, no
 * state is stored - which is what lets this work on a static host with no
 * server, the same way the countdown already does.
 */

// Deliberately not imported from useCountdown.js. This module is reached from
// config.js, which the Express server imports directly - and useCountdown.js
// pulls in React hooks, which have no business being loaded on the server.
const DAY = 24 * 60 * 60 * 1000;

/**
 * Accepts either real newlines or ' | ' between lines, because this arrives
 * from a `VITE_*` variable and a 28-line value in a .env file is miserable to
 * edit either way - whichever one your editor makes easy is fine.
 */
export function parsePoem(raw, fallback = []) {
  if (Array.isArray(raw)) {
    const cleaned = raw.map((line) => String(line).trim()).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  }
  if (typeof raw !== 'string') return fallback;

  const cleaned = raw
    .split(/\r?\n|\s*\|\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

  return cleaned.length ? cleaned : fallback;
}

/**
 * How many lines are readable right now.
 *
 * Counting from the *end* rather than the start is deliberate: the schedule
 * stays correct whatever the poem's length. A 12-line poem simply starts
 * unlocking 12 days out instead of 28, and the last line still lands on the day
 * itself.
 *
 * There is one more day-slot in the wait than there are lines to fill it - the
 * run from 'total days left' down to 'one day left', plus the birthday - so one
 * slot has to come up empty. It is the first one, on purpose: a quiet day at the
 * very start, before she has even been sent the link, costs nothing, whereas the
 * last day before her birthday is the worst possible one to have nothing arrive.
 *
 * `complete` short-circuits the schedule and hands over the whole poem. It is
 * true from the moment the birthday arrives, and it never goes back to false -
 * which matters more than it looks. Past the celebration window the caller aims
 * `target` at next year's date so the digits keep meaning something, and this
 * function would then see ~364 days left and count all the way back to zero:
 * every line she spent a month collecting would stop being readable the morning
 * after, the one day she is most likely to come back and reread it. So once the
 * poem has been earned it stays earned. The trade is that a visitor in some
 * later year finds it already whole instead of watching it drip a second time,
 * which is the cheaper of the two losses by a long way.
 */
export function unlockedCount(target, now, total, complete = false) {
  if (!total || total < 1) return 0;
  if (complete) return total;

  // Whole days still to go. 27.4 days left is still 'day 28 of the wait', so ceil.
  const daysLeft = Math.ceil((target - now) / DAY);

  // total - 1: the closing line belongs to the birthday, not to the wait.
  return Math.min(total - 1, Math.max(0, total - daysLeft));
}

/**
 * The line's number, for labelling it - counting up from the first, the way you
 * would number the pages of something written a day at a time.
 *
 * Not 'days remaining', which was the first thing tried and read backwards:
 * the oldest butterfly on the page would have carried the largest number.
 */
export function dayOfLine(index) {
  return index + 1;
}

/**
 * A cheap integer hash, so a butterfly keeps its spot across reloads.
 *
 * Math.random() would move the whole garden every refresh, which reads as a
 * glitch rather than as life - the point is that she recognises where yesterday's
 * butterfly settled.
 */
function noise(index, salt) {
  let x = Math.imul(index + salt * 0x2545f491, 0x9e3779b1);
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

/**
 * Where a butterfly sits, and what it looks like. Deterministic in `index`.
 *
 * Two zones, both chosen to keep the middle of the page clear for the text:
 * the bougainvillea hedge along the bottom, and the two drapes in the top
 * corners. Every fourth butterfly takes a corner so they don't all pile into
 * the hedge, and the corners alternate.
 */
export function butterflySpot(index) {
  const a = noise(index, 1);
  const b = noise(index, 2);
  const c = noise(index, 3);

  const corner = index % 4 === 0;
  const right = Math.floor(index / 4) % 2 === 1;

  return {
    zone: corner ? 'corner' : 'hedge',
    // Corners keep to their own side; hedge butterflies spread across the width
    // but stay out of the very centre, where the ring and the whisper sit.
    x: corner
      ? (right ? 74 + a * 22 : 4 + a * 22)
      : 5 + ((index * 37) % 90) + (a - 0.5) * 6,
    // Corner: percent from the top. Hedge: a fraction of the hedge's own height,
    // so they ride it up and down as it resizes instead of drifting off it.
    y: corner ? 7 + b * 26 : 0.12 + b * 0.62,
    scale: 0.72 + c * 0.5,
    tilt: (a - 0.5) * 34,
    palette: Math.floor(b * 3) % 3,
    // Staggered so the garden breathes unevenly, the way a real one does.
    flutter: 3.2 + c * 2.8,
    offset: a * -4,
  };
}

/**
 * The fallback poem, used when VITE_POEM is not set.
 *
 * Deliberately impersonal. Anything written for a particular person belongs in
 * .env, which is gitignored - this file is committed, and on a free GitHub Pages
 * plan the repo serving the page has to be public. Keep this one generic enough
 * that a stranger reading the repo learns nothing about anybody.
 */
export const DEFAULT_POEM = [
  'Somewhere a chrysalis decided that today was close enough.',
  'The garden has been keeping a secret all week.',
  'Something here has been counting longer than you have.',
  'Every good book you love, you love loudly, in the margins.',
  'There is a shelf in you where the good days are kept.',
  'Butterflies choose their flowers slowly, then entirely.',
  'Ordinary Tuesdays are worth rereading too.',
  'If you were a season, you would be the last warm week of one.',
  'Some things are read. Some are recited.',
  'A page turned too fast to stop.',
  'Look how the garden is filling up.',
  'Stories are safer when someone else is keeping them.',
  'Small careful things, always something new on them.',
  'The best mornings arrive without being asked.',
  'The garden is louder than it was.',
  'Nothing here needed to be understood quickly.',
  'Some people arrive somewhere. Some bloom there.',
  'There are poems that rhyme and poems that simply mean it.',
  'A room can feel like it had been expecting you.',
  'Whole summers get named after someone.',
  'Forgiveness usually arrives earlier than it should.',
  'Whatever this year has been carrying, it can wait a day.',
  'A long novel is worth being slow with.',
  'Nothing here was hurried. That was the point.',
  'The perfect words were never really required.',
  'Tomorrow the whole garden opens at once.',
  'One more sleep. Everything here has been waiting.',
  'Happy birthday. Every wing here came to say the same thing.',
];
