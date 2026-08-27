import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const PORT = Number(process.env.PORT ?? 4321);

/**
 * Runtime overrides, so the date or the name can change without a rebuild:
 *   BIRTHDAY_NAME="Aanya" BIRTHDAY_DATE=2026-09-27T00:00:00 npm start
 */
function resolveConfig() {
  const config = { ...defaultConfig };

  // The same names as .env / the GitHub secrets, so there's one set to learn.
  // BIRTHDAY_* without the prefix still works for a quick one-off override.
  const name = process.env.VITE_BIRTHDAY_NAME ?? process.env.BIRTHDAY_NAME;
  const date = process.env.VITE_BIRTHDAY_DATE ?? process.env.BIRTHDAY_DATE;
  const message = process.env.VITE_BIRTHDAY_MESSAGE ?? process.env.BIRTHDAY_MESSAGE;

  if (name) config.name = name;
  if (date) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      console.warn('[server] BIRTHDAY_DATE is not a valid date, keeping the default.');
    } else {
      config.targetDate = parsed.toISOString();
    }
  }
  if (message) config.birthdayMessage = message;

  return config;
}

const app = express();
app.use(compression());
app.disable('x-powered-by');

app.get('/api/celebration', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(resolveConfig());
});

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Static build output. Hashed assets can be cached hard; index.html cannot.
app.use(
  express.static(dist, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

// SPA fallback. Express 5 has no bare '*' route, so this is plain middleware.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (!err) return;
    res
      .status(503)
      .type('text/plain')
      .send('The garden has not been built yet. Run `npm run build` first.');
  });
});

app.listen(PORT, () => {
  const { name, targetDate } = resolveConfig();
  console.log(`\n  🌸  Birthday countdown for ${name}`);
  console.log(`      target : ${new Date(targetDate).toString()}`);
  console.log(`      server : http://localhost:${PORT}\n`);
});
