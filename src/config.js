import { DEFAULT_POEM, parsePoem } from './lib/poem.js';

/**
 * Everything you'll want to tweak, with the personal bits pulled out into
 * environment variables so they don't have to live in the repo.
 *
 * IMPORTANT, so nobody relies on this for the wrong thing: `VITE_*` variables
 * are inlined into the JavaScript bundle at build time. They keep values out of
 * your *source*, which is what makes a public repo safe to use - they do NOT
 * hide anything from a visitor. Every string below ends up readable in the
 * shipped bundle. Treat this page as public no matter how it's configured.
 *
 * Local: copy .env.example to .env and fill it in (.env is gitignored).
 * Deployed: set the same names as GitHub Actions secrets - see the workflow.
 */

// `import.meta.env` doesn't exist when Node imports this file directly (the
// Express server does), so fall back to process.env there.
const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : (typeof process !== 'undefined' && process.env) || {};

/** Treats blank and whitespace-only values as "not set". */
const pick = (value, fallback) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed === '' ? fallback : trimmed;
};

/**
 * An explicit UTC offset, deliberately. The old version built the date from
 * local calendar parts at build time - which is midnight on whatever machine
 * ran the build. GitHub Actions runners are UTC, so a CI build would have put
 * "midnight" at 5:30am India time. Pinning the offset makes the instant the
 * same no matter where it's built.
 */
const DEFAULT_TARGET = '2026-09-27T00:00:00+05:30';

function resolveTarget(raw) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    console.warn(`[config] VITE_BIRTHDAY_DATE "${raw}" isn't a valid date; using the default.`);
    return new Date(DEFAULT_TARGET);
  }
  return parsed;
}

const name = pick(env.VITE_BIRTHDAY_NAME, 'Bestie');

export const defaultConfig = {
  // Who we're waiting for.
  name,

  // The big day. Keep the offset on the end so it doesn't drift with the builder.
  targetDate: resolveTarget(pick(env.VITE_BIRTHDAY_DATE, DEFAULT_TARGET)).toISOString(),

  // How long the celebration screen stays up after midnight (hours).
  celebrationWindowHours: Number(pick(env.VITE_CELEBRATION_HOURS, '24')) || 24,

  greeting: 'Something lovely is blooming',
  subGreeting: 'and it opens on the twenty-seventh of September',

  // Shown once the timer hits zero.
  birthdayTitle: pick(env.VITE_BIRTHDAY_TITLE, 'Happy Birthday'),

  /**
   * Her age, and the first thing on the birthday page: it stands there alone
   * for a moment and then burns away into embers before the greeting arrives.
   *
   * Unset is a normal state, not a missing one - plenty of people would rather
   * their age were not the largest thing on the screen. Left blank the page
   * simply opens on the greeting, exactly as it did before, and nothing about
   * the scroll below it changes.
   *
   * Kept as a string on purpose. It is drawn, not counted with, and this way
   * a value that isn't a number can't quietly become NaN in the middle of the
   * one screen nobody is going to be watching when it renders.
   */
  birthdayAge: pick(env.VITE_BIRTHDAY_AGE, null),
  /**
   * The wish, on the sheet of paper at the very end of the day.
   *
   * Set apart from birthdayMessage on purpose. That one sits under the title
   * at the top and is read in a second; this is the last thing on the page and
   * arrives a word at a time, so it is written to be read slowly and can
   * afford to be longer and more said-out-loud than a greeting.
   */
  birthdayWish: pick(
    env.VITE_BIRTHDAY_WISH,
    'May this year be gentle with you. May it be full of small good mornings, the kind of quiet that feels like rest, and everything you have been hoping for without ever saying it out loud.',
  ),

  birthdayMessage: pick(
    env.VITE_BIRTHDAY_MESSAGE,
    'You made another trip around the sun look effortless. Here is to a year that smells like fresh flowers.',
  ),

  // ---- the sealed envelope -------------------------------------------------
  // SHA-256 of the passphrase. Generate one with:
  //     npm run key -- "your secret phrase"
  // Empty or unset removes the gate entirely and lands straight on the countdown.
  secretHash: pick(env.VITE_SECRET_HASH, null),

  // Shown under the input, so she has a chance without you having to tell her.
  secretHint: pick(env.VITE_SECRET_HINT, 'her favourite flower, all one word'),
  sealedTitle: 'A letter for you',
  sealedInvite: 'whisper the word and the seal will give',
  sealedRefusal: 'the seal holds. try once more?',

  // What the letter says once it unfolds.
  letterOpening: pick(env.VITE_LETTER_OPENING, `Dearest ${name},`),
  letterBody: pick(
    env.VITE_LETTER_BODY,
    'something has been growing here since long before today, and it is nearly ready. Come back often - it is counting.',
  ),
  letterSignoff: pick(env.VITE_LETTER_SIGNOFF, 'with love'),

  // ---- the poem ----------------------------------------------------------
  // One line unlocks per day, each carried in by a butterfly that then stays on
  // the page. The LAST line is the birthday's own and never unlocks early, so
  // write it as the closing one.
  //
  // The schedule counts back from the end, which means the length sets when it
  // starts: 28 lines begin unlocking 28 days out, 12 lines begin 12 days out.
  // Change the length freely - but the defaults below were written for a long
  // wait, and a couple of them ('look how the garden is filling up') will read
  // oddly if there are only three butterflies on screen.
  //
  // Put your own in VITE_POEM, one line each, separated by real newlines or by
  // ' | '. See .env.example.
  poem: parsePoem(env.VITE_POEM, DEFAULT_POEM),

  // Little notes that rotate above the timer while we wait.
  whispers: [
    'the petals are still counting',
    'a garden is being arranged',
    'the candles are being polished',
    'somewhere, a cake is rising',
    'the roses were told to be on time',
    'wishes are being wrapped',
  ],
};

export default defaultConfig;
