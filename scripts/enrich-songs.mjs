#!/usr/bin/env node
/**
 * Fills in cover art, canonical credits and (where it can) lyrics, by asking
 * iTunes and LRCLIB - then writes the result back into songs.json.
 *
 *   npm run songs:enrich            # see what it would change
 *   npm run songs:enrich -- --write # actually change it
 *
 * Run at your desk, never at build time and never from the page. The whole
 * design of this page is that it cannot fail on the one night it matters, and
 * that means no third party is in the request path when she opens it. What
 * these APIs produce is *text in a committed file*, which is a very different
 * dependency from a fetch.
 *
 * Nothing you have filled in yourself is ever overwritten - your own `artist`,
 * your hand-pasted `lyrics`, your `note`. This only fills blanks, so it is safe
 * to re-run after adding a song.
 *
 * iTunes Search needs no key and no auth. `artworkUrl100` comes back at 100px
 * and the size is just a path segment, so it is rewritten to 600x600 - the disc
 * renders at up to 13rem and 100px looked like a thumbnail of a record sleeve.
 *
 * LRCLIB needs no key either, and is the reason this fills in as much as it
 * does: it is community-contributed rather than scraped, so the romanised Hindi
 * these songs are actually listened to in is covered where a lyrics site is
 * not. It replaced lyrics.ovh, which found four of twelve.
 *
 * It asks callers to identify themselves in a User-Agent. That costs nothing
 * and is only civil towards a free service, so one is set below.
 *
 * A miss is still normal, and just leaves the sheet's empty state in place. It
 * is also, deliberately, the preferred outcome over a bad hit - see `pick`.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = 'public/songs/songs.json';
const WRITE = process.argv.includes('--write');

/**
 * Take native-script lyrics when no romanisation exists, rather than leaving
 * the song blank.
 *
 * Off by default because the sheet should read in one script. Four of these
 * songs (Kho Gaye, Samjhawan, Sahiba, Vhalam) are on LRCLIB only in Devanagari,
 * Gurmukhi and Gujarati, and mixing those into a set that is otherwise romanised
 * makes the drawer look broken rather than multilingual.
 */
const ANY_SCRIPT = process.argv.includes('--any-script');

const ITUNES = 'https://itunes.apple.com/search';
const LRCLIB = 'https://lrclib.net/api/search';

/** LRCLIB asks that clients say who they are. */
const UA = 'birthday-bloom/0.0.0 (https://github.com/frsmit/Flower-Shop)';

/**
 * How far an LRCLIB entry's runtime may sit from the iTunes one and still be
 * believed to be the same recording, in seconds.
 *
 * This is the single check that stops a wrong song getting in, and it is not
 * theoretical: searching LRCLIB for Saathiya returns exactly one entry with
 * words in it, filed under the right film, and it is the Tamil original - 80
 * seconds short of the Hindi recording. Title and artist both agreed. Only the
 * clock disagreed.
 *
 * Five is loose enough for the usual fade-out and tag differences between two
 * rips of the same track, and far tighter than the gap between two songs.
 */
const DURATION_TOLERANCE_S = 5;

/** Be a good citizen: iTunes is undocumented about limits, so go one at a time. */
const GAP_MS = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/**
 * How long an mp3 actually runs, in seconds, without shelling out to ffprobe.
 *
 * Worth the forty lines because it is a *better yardstick than iTunes*. iTunes
 * knows the canonical release; what matters is the file that will actually
 * play, and the two are not always the same recording. Raabta is the case:
 * the download is the 243-second single edit, iTunes describes the 289-second
 * album version, and a timed sheet fetched against 289 drifts steadily and
 * then runs forty seconds past the end of the audio.
 *
 * Reads the Xing/Info frame count where there is one (these files are VBR, so
 * there usually is) and falls back to size over bitrate for constant-rate
 * files. Returns null if it cannot tell, and the caller then falls back to
 * iTunes rather than guessing.
 */
function mp3Seconds(file) {
  if (!existsSync(file)) return null;

  try {
    const buf = readFileSync(file);
    let at = 0;

    // Step over an ID3v2 tag: four sync-safe bytes, seven bits each.
    if (buf.slice(0, 3).toString('latin1') === 'ID3') {
      at = 10 + (((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f));
      if (buf[5] & 0x10) at += 10; // footer
    }

    // Find the first frame sync within a reasonable window.
    const limit = Math.min(buf.length - 4, at + 200000);
    while (at < limit && !(buf[at] === 0xff && (buf[at + 1] & 0xe0) === 0xe0)) at += 1;
    if (at >= limit) return null;

    const versionBits = (buf[at + 1] >> 3) & 0x03;
    const rate = RATES[versionBits]?.[(buf[at + 2] >> 2) & 0x03];
    if (!rate) return null;

    const mpeg1 = versionBits === 3;
    const bitrate = (mpeg1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[(buf[at + 2] >> 4) & 0x0f] * 1000;
    const perFrame = mpeg1 ? 1152 : 576;

    // Xing (VBR) or Info (CBR) sits at a fixed offset inside the first frame,
    // and its frame count is the only honest answer for a variable-rate file.
    const channelMode = (buf[at + 3] >> 6) & 0x03;
    const xingAt = at + 4 + (mpeg1 ? (channelMode === 3 ? 17 : 32) : channelMode === 3 ? 9 : 17);
    const tag = buf.slice(xingAt, xingAt + 4).toString('latin1');

    if ((tag === 'Xing' || tag === 'Info') && buf[xingAt + 7] & 0x01) {
      const frames = buf.readUInt32BE(xingAt + 8);
      if (frames > 0) return (frames * perFrame) / rate;
    }

    if (!bitrate) return null;
    return ((statSync(file).size - at) * 8) / bitrate;
  } catch {
    return null;
  }
}

/**
 * Roughly, is this text written in the Latin alphabet?
 *
 * Counts letters only, so punctuation, digits and the stray parenthesised
 * "(x2)" in a transcription do not drag the score around. A romanised Hindi
 * sheet scores 100, a Devanagari one scores 0, and the threshold is only there
 * for the handful that carry an English line in the chorus.
 */
/**
 * Words worth comparing two records by - so "Singham" and "Singham (Original
 * Motion Picture Soundtrack)" are recognisably the same film.
 */
const STOPWORDS = new Set([
  'original', 'motion', 'picture', 'soundtrack', 'ost', 'from', 'the', 'and',
  'deluxe', 'edition', 'version', 'single', 'vol', 'feat', 'music',
]);

const tokens = (value) =>
  new Set(
    String(value ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );

/**
 * Does this candidate agree with iTunes about anything beyond its title?
 *
 * Only asked of the rungs that search on title alone, where nothing else
 * constrains the result. Saathiya is why it exists: LRCLIB has exactly one
 * entry under that title, it is romanised, and it is 309 seconds against
 * iTunes' 311 - so both of the other checks wave it through. It is an Odia
 * song. What gives it away is that it agrees with nothing else: its album is
 * "Saathiyaa" where the recording we want is off "Singham", and it shares not
 * one performer.
 */
function corroborates(hit, found) {
  const shares = (a, b) => [...a].some((word) => b.has(word));
  // The album, and pointedly not the artist. Sharing a performer proves very
  // little in a catalogue this incestuous: Pritam wrote the Raabta in Agent
  // Vinod and the Raabta in Raabta, they are four seconds apart, and an
  // artist test waves the wrong one straight through. The film is the thing
  // that actually separates them - which is what the manifest's own `search`
  // field has been saying all along.
  return shares(tokens(hit.albumName), tokens(found.album));
}

/**
 * Some uploads put the timed sheet in the plain field, so the words arrive
 * wearing "[00:18.88]". Also drops the bare musical notes an LRC file uses to
 * mark an instrumental break, which are a cue for a karaoke player and just
 * litter in a drawer.
 */
/**
 * A timed sheet, but only if its timings could belong to this recording.
 *
 * The duration gate above trusts LRCLIB's `duration` field, and plenty of
 * entries simply do not have one - so a sheet for a different cut can walk
 * straight through it. The sheet itself gives a second, harder answer: its
 * last cue cannot be later than the song. Raabta is the case - the download is
 * the 243-second edit and the sheet's last line lands at 4:41.
 *
 * Words that overrun are kept, timings that overrun are dropped, and the song
 * falls back to a plain sheet. A verse the edit does not contain is a harmless
 * thing to be able to read; a highlight drifting further out of step with every
 * line is not.
 */
function usableSync(synced, seconds) {
  const text = typeof synced === 'string' ? synced.trim() : '';
  if (!text || !seconds) return text;

  let last = 0;
  for (const [, mins, secs] of text.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:]\d{1,3})?\]/g)) {
    last = Math.max(last, Number(mins) * 60 + Number(secs));
  }

  return last > seconds + DURATION_TOLERANCE_S ? '' : text;
}

function clean(text) {
  return text
    .replace(/^[ \t]*(?:\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\][ \t]*)+/gm, '')
    .split(/\r?\n/)
    .filter((line) => !/^[\s♪♫]+$/.test(line) || line.trim() === '')
    .join('\n')
    .trim();
}

function isRomanised(text) {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (!letters.length) return false;
  return letters.filter((c) => /[A-Za-z]/.test(c)).length / letters.length >= 0.6;
}

async function itunes(term) {
  const url = `${ITUNES}?term=${encodeURIComponent(term)}&entity=song&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const { results } = await res.json();
    const hit = results?.[0];
    if (!hit) return null;
    return {
      artist: hit.artistName ?? '',
      album: hit.collectionName ?? '',
      track: hit.trackName ?? '',
      // The yardstick every LRCLIB candidate is held against.
      seconds: hit.trackTimeMillis ? Math.round(hit.trackTimeMillis / 1000) : null,
      // The size is a path segment, not a query param.
      cover: hit.artworkUrl100 ? hit.artworkUrl100.replace(/\/100x100bb\.jpg$/, '/600x600bb.jpg') : null,
    };
  } catch {
    return null;
  }
}

async function lrclib(params) {
  const url = `${LRCLIB}?${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    const hits = await res.json();
    return Array.isArray(hits) ? hits : [];
  } catch {
    return [];
  }
}

/**
 * The best candidate out of a search, or nothing.
 *
 * Three filters, in order, and the order is the point:
 *
 * 1. It has to have words. LRCLIB carries entries that are registered but
 *    empty, so `hits[0]` is not safe - Tum Se Hi has twenty hits and the first
 *    has nothing in it. `instrumental` entries are skipped rather than counted
 *    as a miss, because they answer a different question honestly.
 *
 * 2. It has to last as long as the recording iTunes knows about. This is what
 *    catches a different song wearing the same title. See DURATION_TOLERANCE_S.
 *    If iTunes gave no runtime there is nothing to check against, and the check
 *    is skipped rather than failed - being unable to verify is not evidence.
 *
 * 3. Of what survives, a romanised sheet wins. Both exist for several of these
 *    and only one of them matches the rest of the manifest. Sajde is the case
 *    that makes this load-bearing rather than cosmetic: at the correct runtime
 *    there are two entries, and the one that is not romanised is a different
 *    song entirely.
 *
 * Returning null is a perfectly good outcome. The player has a real empty state
 * and she will never know it was meant to be full; a wrong sheet, she would
 * read.
 */
function candidates(hits, found, constrained) {
  const out = [];

  for (const hit of hits) {
    if (hit?.instrumental) continue;
    const text = typeof hit?.plainLyrics === 'string' ? clean(hit.plainLyrics) : '';
    if (!text) continue;
    if (
      found.seconds &&
      Number.isFinite(hit.duration) &&
      Math.abs(hit.duration - found.seconds) > DURATION_TOLERANCE_S
    ) {
      continue;
    }
    out.push({
      id: hit.id,
      text,
      synced: usableSync(hit.syncedLyrics, found.seconds),
      romanised: isRomanised(text),
      corroborated: corroborates(hit, found),
      // Whether a name, and not just a title, was holding this search down.
      constrained,
    });
  }

  return out;
}

/**
 * One choice, made over everything every search turned up.
 *
 * Deliberately not per-search-and-take-the-first: which rung happens to fire
 * first is an accident of how iTunes spelled the title, and letting an accident
 * decide is how the wrong Raabta got in. Gathering first means the right sheet
 * wins even when a worse one was found earlier.
 *
 * Agreeing with iTunes about the album is the strongest signal there is here,
 * so it is preferred outright. Where nothing agrees - a sheet filed under a
 * compilation, which is common and innocent - a hit that at least came back
 * from a search naming a performer is still trustworthy. A hit with neither is
 * nothing but a title match, and a title match is what Saathiya was.
 */
function choose(all) {
  const seen = new Set();
  const usable = all.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return ANY_SCRIPT || c.romanised;
  });

  return (
    usable.find((c) => c.corroborated) ??
    usable.find((c) => c.constrained) ??
    null
  );
}

/**
 * Lyrics from LRCLIB, narrowing the search a rung at a time.
 *
 * Two things vary, and both have to. The credit iTunes hands back is a full one
 * - "Pritam, KK & Sunidhi Chauhan" - while LRCLIB is indexed by whoever
 * uploaded the track, who typically wrote one name. And the *title* iTunes
 * hands back is the canonical one, which is not always what an uploader typed:
 * the romanised Raabta is filed under "Raabta", and searching iTunes' "Raabta
 * (Kehte Hain Khuda Ne)" finds only Devanagari.
 *
 * So the ladder walks from most constrained to least: the canonical title with
 * the full credit, then the lead name, then the title as it appears in the
 * manifest, then title alone. The last two rungs have nothing but a title
 * holding them down, so they are run `strict` and have to corroborate.
 */
async function lyrics(found, title) {
  const canonical = found.track || title;
  if (!canonical && !title) return null;

  const artist = found.artist;
  // Every name in the credit, not just the first. The lead alone is not good
  // enough: iTunes credits Raabta to "Pritam, Shreya Ghoshal & Arijit Singh",
  // and the romanised sheet is filed under the singer, third in that list.
  const names = artist
    ? artist
        .split(/[,&]|\bfeat\.?\b|\bft\.?\b/i)
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const titles = [canonical, title].filter((t, i, all) => t && all.indexOf(t) === i);

  const attempts = [];
  // A real title and a real name, in every combination the credit offers,
  // then the bare titles. `constrained` records which is which.
  for (const t of titles) {
    if (artist) attempts.push([{ track_name: t, artist_name: artist }, true]);
    for (const name of names) {
      if (name !== artist) attempts.push([{ track_name: t, artist_name: name }, true]);
    }
  }
  for (const t of titles) attempts.push([{ track_name: t }, false]);

  const all = [];
  for (const [params, constrained] of attempts) {
    all.push(...candidates(await lrclib(params), found, constrained));
    // Everything agreeing on the album is as good as this gets; stop paying
    // for searches that cannot improve on it.
    if (all.some((c) => c.corroborated && (c.romanised || ANY_SCRIPT))) break;
    await sleep(GAP_MS);
  }

  return choose(all);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const songs = manifest.songs ?? [];
const changes = [];

for (const [i, song] of songs.entries()) {
  // `search` is an optional per-song override, because a bare title is often
  // ambiguous - three films have a song called Raabta - and the film name is
  // the thing that disambiguates it.
  const term = song.search || [song.title, song.artist].filter(Boolean).join(' ');
  process.stdout.write(`${String(i + 1).padStart(2)}. ${String(song.title ?? '?').padEnd(18)} `);

  const found = await itunes(term);
  if (!found) {
    console.log('no iTunes match');
    await sleep(GAP_MS);
    continue;
  }

  // The file that will actually play outranks iTunes' idea of the release.
  // Silent otherwise, but a big disagreement means they are different cuts,
  // and that is exactly when a timed sheet fetched against the wrong one goes
  // quietly out of step - so it is said out loud.
  const local = mp3Seconds(join('public', song.src));
  if (local) {
    const rounded = Math.round(local);
    if (found.seconds && Math.abs(found.seconds - rounded) > DURATION_TOLERANCE_S) {
      process.stdout.write(`[file ${rounded}s vs iTunes ${found.seconds}s] `);
    }
    found.seconds = rounded;
  }

  const notes = [];
  if (!song.cover && found.cover) {
    song.cover = found.cover;
    notes.push('cover');
  }
  if (!song.artist && found.artist) {
    song.artist = found.artist;
    notes.push('artist');
  }

  // Reported on the line but deliberately kept out of `notes`, which is the
  // list of things that would actually be written.
  let missed = '';

  const existing = Array.isArray(song.lyrics) ? song.lyrics : song.lyrics ? [song.lyrics] : [];
  const hasLyrics =
    existing.some((l) => String(l).trim() !== '') ||
    (Array.isArray(song.timed) && song.timed.length > 0);

  if (!hasLyrics) {
    const hit = await lyrics(found, song.title);
    if (hit?.synced) {
      // `timed` and not `lyrics`: the player reads the plain sheet back off the
      // timings, so storing both would put the same words in the file twice.
      song.timed = hit.synced.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
      notes.push(`timed lyrics (${song.timed.length} lines${hit.romanised ? '' : ', NATIVE SCRIPT'})`);
    } else if (hit) {
      song.lyrics = hit.text.split(/\r?\n/).map((l) => l.trimEnd());
      notes.push(`lyrics (${song.lyrics.length} lines${hit.romanised ? '' : ', NATIVE SCRIPT'})`);
    } else {
      missed = '   (no lyrics found)';
    }
  }

  console.log(
    `${found.track} | ${found.artist}` +
      `${notes.length ? `   +${notes.join(' +')}` : '   (nothing to add)'}${missed}`,
  );
  if (notes.length) changes.push(`${song.title}: ${notes.join(', ')}`);
  await sleep(GAP_MS);
}

console.log(`\n${changes.length} entr${changes.length === 1 ? 'y' : 'ies'} would change.`);

if (WRITE) {
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Written to ${MANIFEST}.`);
} else {
  console.log('Dry run. Re-run with --write to apply.');
}
