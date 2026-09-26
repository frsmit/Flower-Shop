#!/usr/bin/env node
/**
 * Writes public/photos/photos.json from the BIRTHDAY_PHOTOS secret.
 *
 *   npm run photos:write
 *
 * The photographs live in Google Drive rather than in this repo, which has to
 * be public for Pages to serve it. Only their links travel, and those travel as
 * an Actions secret, so the repo never names them. The deployed photos.json is
 * still fetched by the page, so the links and captions are readable by anyone
 * with the site's URL - the secret keeps them out of the source, not out of
 * the site. Same caveat as every VITE_* value.
 *
 * One photo per line, in the order she sees them, caption after a '|':
 *
 *   https://drive.google.com/file/d/1AbC.../view?usp=sharing | the chai place
 *   https://drive.google.com/file/d/1XyZ.../view
 *
 * Blank lines and lines starting with '#' are ignored. Any other https URL that
 * serves an image directly is passed through untouched.
 *
 * Every link is fetched before anything is written, and one that doesn't come
 * back as an image fails the build. That is the whole point of running this in
 * CI: usePhotos reads a broken manifest as "no photographs", which is a real
 * state, so a photo whose sharing was never switched on would otherwise deploy
 * green and simply be missing.
 *
 * Unset is allowed and writes nothing: it is a build with no photographs, and
 * the page ends on the flower bed instead.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PHOTO_MAX } from '../src/lib/photos.js';

const MANIFEST = 'public/photos/photos.json';

// Long edge, in pixels. Drive resizes on its side, so a 4MB camera original
// arrives at a few hundred KB on her phone.
const SIZE = 1600;

const raw = (process.env.BIRTHDAY_PHOTOS ?? '').trim();

if (!raw) {
  const message = 'BIRTHDAY_PHOTOS is not set - building without photographs.';
  // In Actions this surfaces as a yellow annotation on the run, not a line
  // buried in the log, because unset looks exactly like it worked.
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `[photos] ${message}`);
  process.exit(0);
}

const fail = (lines) => {
  console.error(`\n${lines.map((l) => `[photos] ${l}`).join('\n')}\n`);
  process.exit(1);
};

/**
 * Turns a Drive share link into an address that serves the picture itself.
 * A share link opens Drive's viewer page, which is HTML, not an image.
 */
function toImageUrl(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    return { error: 'is not a link' };
  }

  if (/(^|\.)photos\.(app\.goo\.gl|google\.com)$/.test(url.hostname)) {
    return { error: 'is a Google Photos link - those open an album page, not an image. Use Drive.' };
  }

  if (/(^|\.)(drive|docs)\.google\.com$/.test(url.hostname)) {
    const id = url.pathname.match(/\/d\/([\w-]{10,})/)?.[1] ?? url.searchParams.get('id');
    if (!id) return { error: 'is a Drive link with no file id in it - use the link to one photo, not a folder.' };
    return { src: `https://lh3.googleusercontent.com/d/${id}=w${SIZE}` };
  }

  if (url.protocol !== 'https:') return { error: 'is not https' };
  return { src: url.href };
}

async function isImage(src) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(src, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
        // Some hosts turn away a request with no browser-ish user agent.
        headers: { 'user-agent': 'Mozilla/5.0 (birthday-bloom photo check)' },
      });
      const type = res.headers.get('content-type') ?? '';
      await res.body?.cancel();
      if (res.ok && type.startsWith('image/')) return { ok: true };
      // A photo that isn't shared comes back as a sign-in page, not a 404.
      if (attempt === 2) return { ok: false, why: `got ${res.status} ${type || 'no content type'}` };
    } catch (error) {
      if (attempt === 2) return { ok: false, why: error.message };
    }
  }
}

const entries = raw
  .split(/\r?\n/)
  .map((line, i) => ({ line: line.trim(), number: i + 1 }))
  .filter(({ line }) => line && !line.startsWith('#'));

const problems = [];
const photos = entries.map(({ line, number }) => {
  const bar = line.indexOf('|');
  const link = (bar === -1 ? line : line.slice(0, bar)).trim();
  const caption = bar === -1 ? '' : line.slice(bar + 1).trim();
  const { src, error } = toImageUrl(link);
  if (error) problems.push(`line ${number}: "${link}" ${error}`);
  return { src, caption, number };
});

if (photos.length > PHOTO_MAX) {
  problems.push(`${photos.length} photos listed; the page shows at most ${PHOTO_MAX}.`);
}
if (problems.length) fail(['BIRTHDAY_PHOTOS has problems:', ...problems]);

const checks = await Promise.all(photos.map((p) => isImage(p.src)));
const broken = photos
  .map((p, i) => ({ ...p, ...checks[i] }))
  .filter((p) => !p.ok)
  .map((p) => `line ${p.number}: ${p.why}`);

if (broken.length) {
  fail([
    `${broken.length} of ${photos.length} photo(s) did not load as an image:`,
    ...broken.map((b) => `  ${b}`),
    '',
    'Usually the Drive sharing: Share -> General access -> Anyone with the link.',
    'Failing on purpose - otherwise this deploys green with those photos missing.',
  ]);
}

mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(
  MANIFEST,
  `${JSON.stringify({ photos: photos.map(({ src, caption }) => (caption ? { src, caption } : { src })) }, null, 2)}\n`,
);

console.log(`[photos] ${photos.length} photo(s) checked and written to ${MANIFEST}.`);
