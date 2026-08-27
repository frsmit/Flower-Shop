/**
 * The passphrase gate.
 *
 * Be clear-eyed about what this is: the check happens in the visitor's browser,
 * so it is a *seal on an envelope*, not a lock on a door. Anyone determined can
 * read the page's own code and walk past it. What it does do is keep the
 * surprise from anyone who wanders onto the URL.
 *
 * Only the SHA-256 of the phrase is shipped, so at least the phrase itself
 * isn't sitting in the bundle in plain text for anyone who hits view-source.
 *
 * `crypto.subtle` needs a secure context: https, or localhost. Every real
 * deployment (GitHub Pages, Cloudflare, Netlify) is https, and `npm run dev`
 * is localhost, so this is fine in practice - but it would fail if you served
 * the built site over plain http from a LAN address, hence `canVerify()`.
 */

/** Same normalisation as scripts/make-key.mjs, or nothing would ever match. */
export const normalise = (phrase) => String(phrase).trim().toLowerCase();

export const canVerify = () =>
  typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time-ish compare. Not that it matters here, but it costs nothing. */
function sameHash(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPhrase(phrase, expectedHash) {
  if (!expectedHash) return true; // no hash configured: the page is simply open
  const hash = await sha256Hex(normalise(phrase));
  return sameHash(hash, String(expectedHash).trim().toLowerCase());
}
