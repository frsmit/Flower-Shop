#!/usr/bin/env node
/**
 * Turns a passphrase into the hash to paste into src/config.js.
 *
 *   npm run key -- "our chai spot"
 *
 * The normalisation here (trim + lowercase) has to match src/lib/secret.js,
 * or the phrase will never match what the page computes.
 */
import { createHash } from 'node:crypto';

const phrase = process.argv.slice(2).join(' ');

if (!phrase.trim()) {
  console.error('\nUsage: npm run key -- "your secret phrase"\n');
  process.exit(1);
}

const normalised = phrase.trim().toLowerCase();
const hash = createHash('sha256').update(normalised).digest('hex');

console.log(`
  phrase     ${phrase}
  matched as ${normalised}      (case and outer spaces are ignored)

  Paste into src/config.js:

    secretHash: '${hash}',
`);
