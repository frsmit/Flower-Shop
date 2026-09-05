/**
 * Ten songs for the last ten days - and the arithmetic that decides how many
 * of them she has.
 *
 * The poem is one line a day for the whole month; this is the closer. It opens
 * ten days out, one song at a time, so the last stretch of the wait has a
 * second thing arriving in it that the countdown digits can't convey.
 *
 * Deliberately parallel to poem.js and deliberately separate from it: the two
 * schedules have different shapes. The poem holds its final line back for the
 * birthday itself, because a poem wants a last word. The songs do not - all ten
 * are hers by the last day of the wait, so that when the day arrives she has a
 * full record to play rather than a ninth song and a promise.
 *
 * No clock is read and no state is stored here. Same reason as poem.js: this
 * module is reached from config.js, which the Express server imports directly.
 */

// Not imported from useCountdown.js on purpose - that pulls in React hooks,
// which have no business being loaded on the server. Same as poem.js.
const DAY = 24 * 60 * 60 * 1000;

/** How many days out the first song lands. Also the number of songs. */
export const SONG_DAYS = 10;

/**
 * How many songs are unlocked right now.
 *
 * `total` days out gives you the first, and the last day of the wait gives you
 * the last: with ten songs, day 10 unlocks one and day 1 unlocks all ten.
 *
 * `complete` behaves exactly as it does for the poem, and for the same reason -
 * past the celebration window the caller aims `target` at next year, and
 * without it every song would be taken back the morning after her birthday.
 */
export function songsUnlocked(target, now, total, complete = false) {
  if (!total || total < 1) return 0;
  if (complete) return total;

  const daysLeft = Math.ceil((target - now) / DAY);

  // +1 so the final day of the wait is the one that completes the set, rather
  // than leaving the tenth song stranded on the birthday itself.
  return Math.min(total, Math.max(0, total + 1 - daysLeft));
}

/** Which day of the ten a song belongs to, counting up. */
export function dayOfSong(index) {
  return index + 1;
}

/**
 * Normalises a manifest into the shape the player expects, and drops anything
 * that couldn't play.
 *
 * `src` is the only required field. A song with no title still plays; a song
 * with no audio is just a broken tile, so it doesn't get to exist. Lyrics are
 * optional throughout - the player has a real empty state for them, because
 * transcribing ten songs by hand is exactly the sort of job that gets abandoned
 * halfway and shouldn't take the feature down with it.
 */
export function parseSongs(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.songs) ? raw.songs : [];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const src = typeof entry.src === 'string' ? entry.src.trim() : '';
      if (!src) return null;

      return {
        src,
        title: typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : 'Untitled',
        artist: typeof entry.artist === 'string' ? entry.artist.trim() : '',
        cover: typeof entry.cover === 'string' && entry.cover.trim() ? entry.cover.trim() : null,
        note: typeof entry.note === 'string' ? entry.note.trim() : '',
        lyrics: parseLyrics(entry.lyrics),
      };
    })
    .filter(Boolean)
    .slice(0, SONG_DAYS);
}

/**
 * Lyrics as an array of lines. Accepts an array or one big string, because a
 * hand-edited JSON file is much easier to live with if you can paste a block of
 * text into a single field with '\n' in it.
 *
 * Blank lines are kept - they're the verse breaks, and collapsing them turns a
 * song into a paragraph.
 */
export function parseLyrics(raw) {
  if (Array.isArray(raw)) return raw.map((line) => String(line).trimEnd());
  if (typeof raw === 'string') return raw.split(/\r?\n/).map((line) => line.trimEnd());
  return [];
}
