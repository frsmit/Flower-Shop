# 🌸 Birthday Bloom

An aesthetic, flowery countdown to a friend's birthday — **27 September**.

While you wait, bougainvillea frames the page - drapes hanging from the top two
corners and a hedge along the bottom - papery bracts drift down the screen, a
ring fills up as the year runs out, and the seconds roll over one digit at a
time. At midnight on the 27th the whole thing turns into a celebration screen
with confetti.

## Running it

```bash
npm install
npm run dev
```

That starts both halves at once: Vite on <http://localhost:5173> (the one to
open) and the Express API on <http://localhost:4321>. The Vite dev server
proxies `/api` across to it.

Only want one of them?

| Command           | What it does                                       |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | React + API together, with hot reload               |
| `npm run dev:web` | Just Vite (falls back to the bundled config)         |
| `npm run dev:api` | Just the Express server                              |
| `npm run build`   | Production bundle into `dist/`                       |
| `npm start`       | Serve the built `dist/` from Express                 |
| `npm run serve`   | Build, then serve                                    |
| `npm run lint`    | oxlint                                               |

For the real thing, `npm run serve` and open <http://localhost:4321>.

> The API defaults to port **4321** rather than 3000, which was already taken on
> this machine. Override with `PORT`.

## Making it yours

The personal bits live in `.env`, which is gitignored — so nothing about your
friend has to be committed. Copy the template and fill it in:

```bash
cp .env.example .env
```

```ini
VITE_BIRTHDAY_NAME=Bestie
VITE_BIRTHDAY_DATE=2026-09-27T00:00:00+05:30
VITE_SECRET_HASH=...          # npm run key -- "your phrase"
```

**Keep the `+05:30` on the date.** Without an offset it's read in the build
machine's timezone, and CI runners are UTC — which would put "midnight" at
5:30am in India. With the offset the instant is the same wherever it's built.

Anything you leave blank falls back to a neutral default in
[`src/config.js`](src/config.js) (the name becomes "Bestie" and a blank
`VITE_SECRET_HASH` simply removes the gate). Tone and wording that isn't
personal — the greeting, the whispers, the seal's phrasing — still lives in that
file.

> ### These are not secrets from your visitor
>
> Vite **inlines** `VITE_*` values into the JavaScript bundle at build time. They
> keep personal details out of your *repo*, which is what makes a public GitHub
> repo safe to use. They do **not** hide anything from someone viewing the page —
> the name, date, letter and passphrase hash are all readable in the shipped JS.
> Treat the page as public regardless of how it's configured.

The Express server reads the same names, so one `.env` drives both halves
(`--env-file-if-exists` is already in the npm scripts). For a quick one-off you
can still override inline:

```bash
VITE_BIRTHDAY_NAME="Aanya" npm start
```

The client fetches `/api/celebration` on load and quietly falls back to the
bundled config if the API isn't there — so a plain static `dist/` still works.

## The sealed envelope

Landing on the page shows a wax seal and asks for a word. Give it, and a letter
unseals, the flap swings open, the page slides out — and then the countdown.
It only asks once: `localStorage` remembers, so later visits go straight in.

Change the word:

```bash
npm run key -- "our chai spot"
```

That prints a hash to paste into `secretHash` in [`src/config.js`](src/config.js).
Case and outer spaces are ignored, so phone keyboards can't break it. Set
`secretHash: null` to remove the gate entirely. The hint under the input is
`secretHint`, and the letter's words are `letterOpening` / `letterBody` /
`letterSignoff`.

**Be clear about what this is.** The check runs in the visitor's browser, so it
is a seal on an envelope, not a lock on a door — anyone determined can read the
page's own code and walk past it. It keeps the surprise from someone who
stumbles on the URL, and that's all it's for. Only the SHA-256 of the phrase
ships, so at least the word isn't sitting in the bundle in plain text. Don't put
anything in the letter you'd mind a stranger reading.

The hashing uses `crypto.subtle`, which needs https or localhost. Every real
host is https, so this only matters if you serve the built files over plain http
from a LAN address.

## Putting it online (free, and it stays up)

**Deploy it as a static site.** `npm run build` produces a `dist/` folder that is
just HTML, one CSS file and one JS file — no server needed. Drag `dist/` onto
Netlify Drop, or point Cloudflare Pages / GitHub Pages / Vercel at the repo with
build command `npm run build` and output directory `dist`.

This matters: free *static* hosting doesn't sleep. Free *server* tiers do — they
spin down after inactivity, so the first visitor waits for a cold start, and
some providers delete idle services outright. A countdown that has to be awake
for a month is exactly the wrong thing to put on a sleeping server.

`base: './'` in `vite.config.js` keeps the asset paths relative, so the build
works from a subpath like `username.github.io/repo/` as well as a root domain.
This is the single most common reason a Vite app deploys to Pages as a blank
white screen, so it's set already.

### GitHub Pages specifically

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) is ready to go.
Once the repo is on GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
   (not "Deploy from a branch").
2. **Settings → Secrets and variables → Actions** — add `VITE_BIRTHDAY_NAME`,
   `VITE_BIRTHDAY_DATE`, `VITE_SECRET_HASH` and any others you want, matching
   your `.env`. The workflow passes them to the build; anything unset falls back
   to the neutral defaults.
3. Push to `main`. The workflow builds and publishes; later pushes redeploy, and
   you can also trigger it by hand from the Actions tab.

Your URL will be `https://<username>.github.io/<repo>/`.

Worth knowing: **Pages on a free plan only serves from a public repo.** The page
itself is a public URL either way, but on the free tier the source — including
the name and the message — is public too. If you'd rather keep the repo private,
Cloudflare Pages and Netlify both deploy private repos on their free tiers, with
the same "never sleeps" property.

The Express server is for local development. On a static host `/api/celebration`
simply isn't there, the fetch fails, and the client falls back to the config
bundled at build time — so **the date and name come from `src/config.js`, and
changing them means rebuilding and redeploying.**

One thing to be deliberate about: `targetDate` is converted to an absolute
instant at build time using *this machine's* timezone. Built here (IST), it
lands on midnight IST. If the person viewing is in another timezone, they'll see
it tick over at their local equivalent of that moment, not at their own
midnight. That's usually what you want for a shared moment — just know it's the
behaviour.

## How it's put together

```
index.html            fonts + page shell
server/index.js       Express: /api/celebration, /api/health, serves dist/
src/config.js         reads .env, with defaults for everything
.env.example          the template - copy to .env (gitignored)
src/App.jsx           picks between the waiting screen and the celebration
src/hooks/
  useCountdown.js     the one ticking clock (useNow) + pure derivations
  useCelebrationConfig.js   fetches the server config, falls back to bundled
  useReducedMotion.js
src/components/
  PetalField.jsx      canvas petals drifting down
  Countdown.jsx       the four glass tiles
  RollingNumber.jsx   per-digit roll, so only what changed moves
  BloomProgress.jsx   ring that fills over the year, flower on the leading edge
  Whispers.jsx        rotating one-liners
  Bougainvillea.jsx   the whole plant: two corner drapes + the bottom hedge
  Gate.jsx            the wax seal and the passphrase
  LetterOpening.jsx   seal lifts, flap opens, letter rises
  Celebration.jsx     confetti + the birthday message
src/lib/secret.js     hashing and comparison for the passphrase
scripts/make-key.mjs  npm run key -- "phrase"
src/styles/global.css
```

A few decisions worth knowing about:

- **One clock.** `useNow()` is the only thing that reads the wall clock;
  everything else is a pure function of `(target, now)`. It re-reads
  `Date.now()` each tick instead of decrementing, so a sleeping laptop can't
  make the timer drift.
- **It pauses when nobody's looking.** Hidden tabs freeze `requestAnimationFrame`,
  so exit animations would never finish and digit nodes would pile up for as
  long as the page sat in the background. The clock holds still while
  `document.hidden` and resyncs on the way back.
- **After the day passes** the target rolls forward a year, so the page keeps
  counting instead of sitting at zero.
- **SVG transforms.** Anything animated by CSS keeps its positioning
  `translate` on a parent group — a CSS `transform` would otherwise clobber the
  SVG `transform` attribute and stack the flowers in the corner.
- **Reduced motion** is respected throughout: petals settle, digits stop
  rolling, confetti is skipped.
- **Responsive, and checked.** Verified with no scrolling at 390x844, 360x640
  and 740x360 (landscape). Short screens drop the sub-line, put the ring beside
  the whisper instead of above it, and shrink the drapes to corner sprigs so the
  heading isn't sitting behind flowers.
- **The plant is memoised.** The clock re-renders the app every second; without
  `memo` React reconciled all ~3000 of the bougainvillea's SVG nodes on every
  tick, which is what made the seconds animation stutter. Verified: zero DOM
  mutations inside the plant across five ticks.
- **Nothing repaints continuously.** Three things were doing per-frame work
  whether or not anything was moving, and together they starved the one
  animation that ticks every second:
  1. `backdrop-filter` on the glass tiles blurred whatever was behind them —
     and the petal canvas behind repaints every frame, so all four tiles
     re-blurred their backdrop 60 times a second, forever. Slightly more opaque
     backgrounds read the same over a pastel wash for none of the cost.
  2. The progress ring's `progress` prop changed every second, so
     framer-motion restarted a 2.4s `stroke-dashoffset` animation — a paint
     property, under a `drop-shadow` — on every tick, for a visual delta of
     0.00002px. `progress` is now quantised to 1/2000 (a bucket every ~4 hours).
  3. `.app__glow` animated `scale()` on a 46vmax element under `blur(90px)`,
     which re-rasterises that whole surface every frame. It translates only now.
- **The canvas runs at 30fps** and caches a gradient per petal instead of
  allocating ~4000 a second. Petals drift slowly; the difference is invisible and
  it leaves the main thread free on the frames that matter.
- **Digits animate transform and opacity only.** Animating `filter: blur()`
  repaints every frame, and the digits sit inside a `backdrop-filter` tile — the
  cheapest animation on the page had been made one of the most expensive.
- **Replaced-element sizing.** An absolutely positioned `<svg>` with
  `left: 0; right: 0` but no explicit `width` takes its *intrinsic* width from
  the viewBox ratio and silently ignores `right`, which left a bare strip down
  one side. `.vines__hedge` sets `width: 100%`.

## Ideas for later

- A photo or a memory for each day of the wait
- A guestbook other friends can sign (the Express side is already there)
- Music that fades in on the day
- A shareable link with the name baked into the URL
