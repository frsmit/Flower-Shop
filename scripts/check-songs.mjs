#!/usr/bin/env node
/**
 * Refuses to let a build ship a manifest that names audio the build hasn't got.
 *
 *   npm run songs:check
 *
 * This exists because of one specific asymmetry in useSongs: a manifest that
 * 404s, and a manifest whose entries 404, are both read as "no music deployed"
 * - which is a legitimate state, the one every clone of this repo is in. So a
 * build with a typo'd filename does not fail. It goes green, Pages publishes,
 * and the music tab simply never appears. Nobody finds out until she opens it.
 *
 * Runs in CI ahead of `vite build`, and is worth running locally before you
 * push - a missing file is a one-character fix now and a silent absence later.
 *
 * No manifest at all is fine and exits 0: that is a build with no music, on
 * purpose, and the player has a real empty state for it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = 'public/songs/songs.json';

if (!existsSync(MANIFEST)) {
  console.log(`[songs] no ${MANIFEST} - building without music.`);
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch (error) {
  // Invalid JSON is the worst case, because it is ALSO indistinguishable from
  // no music at runtime: the fetch resolves, res.json() throws, the catch in
  // useSongs swallows it, and the tab is gone. A trailing comma should not be
  // able to do that quietly.
  console.error(`\n[songs] ${MANIFEST} is not valid JSON: ${error.message}`);
  console.error('[songs] Left alone this deploys green with no music tab at all.\n');
  process.exit(1);
}

const songs = Array.isArray(manifest?.songs) ? manifest.songs : [];

if (!songs.length) {
  console.error(`\n[songs] ${MANIFEST} parsed but lists no songs.\n`);
  process.exit(1);
}

// `src` is relative to public/, so 'songs/x.mp3' lives at 'public/songs/x.mp3'.
// Absolute URLs are somebody else's problem to serve, so they are not checked.
const local = (src) => !/^https?:\/\//i.test(src);
const missing = [];
const covers = [];

for (const entry of songs) {
  const src = typeof entry?.src === 'string' ? entry.src.trim() : '';
  if (!src) {
    missing.push('(an entry with no "src" at all - parseSongs will drop it)');
    continue;
  }
  if (local(src) && !existsSync(join('public', src))) missing.push(`public/${src}`);

  // A missing cover is cosmetic - the disc falls back to a blush face - so it
  // is reported and does not fail the build.
  const cover = typeof entry?.cover === 'string' ? entry.cover.trim() : '';
  if (cover && local(cover) && !existsSync(join('public', cover))) covers.push(`public/${cover}`);
}

if (covers.length) {
  console.warn(`[songs] ${covers.length} cover(s) missing (the disc falls back, no harm):`);
  for (const c of covers) console.warn(`          ${c}`);
}

if (missing.length) {
  console.error(
    `\n[songs] ${missing.length} of ${songs.length} entries name audio this build does not have:\n` +
      missing.map((m) => `          ${m}`).join('\n') +
      `\n\n[songs] Failing on purpose: a 404 here is indistinguishable from "no` +
      `\n        music configured", so this would otherwise deploy green and` +
      `\n        just have no music tab.\n`,
  );
  process.exit(1);
}

const timed = (s) => (Array.isArray(s?.timed) ? s.timed : []).length > 0;
const plain = (s) =>
  (Array.isArray(s?.lyrics) ? s.lyrics : typeof s?.lyrics === 'string' ? [s.lyrics] : []).some(
    (l) => String(l).trim() !== '',
  );

const withTimed = songs.filter(timed).length;
const withLyrics = songs.filter((s) => timed(s) || plain(s)).length;

console.log(
  `[songs] ${songs.length} song(s) present, ${withLyrics} with lyrics ` +
    `(${withTimed} of them timed), ` +
    `${songs.length - withLyrics} without (they get the empty state).`,
);
