/**
 * Twelve songs for the last twelve days - and the arithmetic that decides how
 * many of them she has.
 *
 * The poem is one line a day for the whole month; this is the closer. It opens
 * twelve days out, one song at a time, so the last stretch of the wait has a
 * second thing arriving in it that the countdown digits can't convey.
 *
 * Deliberately parallel to poem.js and deliberately separate from it: the two
 * schedules have different shapes. The poem holds its final line back for the
 * birthday itself, because a poem wants a last word. The songs do not - all ten
 * are hers by the last day of the wait, so that when the day arrives she has a
 * full record to play rather than an eleventh song and a promise.
 *
 * No clock is read and no state is stored here. Same reason as poem.js: this
 * module is reached from config.js, which the Express server imports directly.
 */

// Not imported from useCountdown.js on purpose - that pulls in React hooks,
// which have no business being loaded on the server. Same as poem.js.
const DAY = 24 * 60 * 60 * 1000;

/** How many days out the first song lands. Also the number of songs. */
export const SONG_DAYS = 12;

/**
 * How many songs are unlocked right now.
 *
 * The set runs BACKWARDS, and the birthday is the last to land, not the first:
 * her song 12 arrives twelve days out and her song 1 arrives on the day itself.
 * So the array is stored in arrival order - position 1 is the first to unlock,
 * the final position is the birthday's - and her own numbering survives only in
 * the filenames. See the note at the top of songs.json.
 *
 * `total` days out gives you the first, and the birthday gives you the last:
 * with twelve songs, day 12 unlocks one and the 27th unlocks all twelve.
 *
 * `complete` behaves exactly as it does for the poem, and for the same reason -
 * past the celebration window the caller aims `target` at next year, and
 * without it every song would be taken back the morning after her birthday.
 */
export function songsUnlocked(target, now, total, complete = false) {
  if (!total || total < 1) return 0;
  if (complete) return total;

  const daysLeft = Math.ceil((target - now) / DAY);

  // No +1, deliberately: the birthday itself is what completes the set. There
  // used to be one, so the last song landed on the final day of the WAIT and
  // the 27th added nothing - right for a schedule that front-loads, wrong for
  // this one, where the whole point is that the twelfth day hands her the song
  // the other eleven were counting towards. `complete` covers the day itself.
  return Math.min(total, Math.max(0, total - daysLeft));
}

/** Which day of the twelve a song belongs to, counting up. */
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
 * transcribing twelve songs by hand is exactly the sort of job that gets abandoned
 * halfway and shouldn't take the feature down with it.
 */
export function parseSongs(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.songs) ? raw.songs : [];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const src = typeof entry.src === 'string' ? entry.src.trim() : '';
      if (!src) return null;

      // A song carries `lyrics`, or `timed`, or neither - and where it has
      // `timed`, the plain sheet is read back off it rather than stored twice.
      // Two copies of the same words in a hand-edited file is a standing
      // invitation to correct a typo in one of them.
      const timed = parseTimed(entry.timed);
      const own = parseLyrics(entry.lyrics);

      return {
        src,
        title: typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : 'Untitled',
        artist: typeof entry.artist === 'string' ? entry.artist.trim() : '',
        cover: typeof entry.cover === 'string' && entry.cover.trim() ? entry.cover.trim() : null,
        note: typeof entry.note === 'string' ? entry.note.trim() : '',
        timed,
        lyrics: own.length ? own : timed.map((line) => line.text),
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

/** `[mm:ss.xx]`, the one thing an LRC line is required to have. */
const STAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/**
 * An LRC sheet as `[{ at, text }]`, in time order.
 *
 * Same tolerance as `parseLyrics` about its input - an array of lines or one
 * string - because it comes from the same hand-edited file.
 *
 * Lines with no timestamp are dropped rather than kept untimed. That is what
 * an LRC file's `[ar:]` and `[ti:]` header is, and a header is not a lyric.
 * One line may carry several stamps, which is how the format says "this line
 * again, later", and each becomes its own entry.
 *
 * A stamp with no words is kept, not discarded: that is the instrumental
 * break, and it is what makes the highlight let go of the last line of a verse
 * instead of sitting lit through eight bars of nothing.
 */
export function parseTimed(raw) {
  const lines = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/\r?\n/) : [];
  const out = [];

  for (const line of lines) {
    const text = String(line);
    const stamps = [...text.matchAll(STAMP)];
    if (!stamps.length) continue;

    const body = text.replace(STAMP, '').trim();
    for (const [, mins, secs, frac] of stamps) {
      // '.5' is five tenths, not five thousandths, so pad rather than parse.
      const fraction = frac ? Number(frac.padEnd(3, '0')) / 1000 : 0;
      const at = Number(mins) * 60 + Number(secs) + fraction;
      if (Number.isFinite(at)) out.push({ at, text: body });
    }
  }

  return out.sort((a, b) => a.at - b.at);
}

/**
 * Which timed line is the current one at `seconds`, or -1 before the first.
 *
 * Binary search, which is more than sixty lines strictly need - but this is
 * called on every `timeupdate`, several times a second, for as long as she
 * leaves the tab open, and a scan is the kind of thing that is free until the
 * day somebody pastes in a nine-minute qawwali.
 */
export function activeLine(timed, seconds) {
  if (!Array.isArray(timed) || !timed.length || !Number.isFinite(seconds)) return -1;

  let low = 0;
  let high = timed.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (timed[mid].at <= seconds) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return found;
}
