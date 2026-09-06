# 🌸 Birthday Bloom

An aesthetic, flowery countdown to a friend's birthday — **27 September**.

While you wait, bougainvillea frames the page - drapes hanging from the top two
corners and a hedge along the bottom - papery bracts drift down the screen, a
ring fills up as the year runs out, and the seconds roll over one digit at a
time. Every day of the last month a butterfly arrives carrying one line of a
poem and settles on the plant, so the garden fills up as the day gets closer.
Over the last ten days a song unlocks each day, on its own tab. At midnight on
the 27th every butterfly lifts off at once, the poem finishes, and the page
becomes the one screen here that scrolls: her age burning away into embers, the
greeting and the confetti, and a bed of flowers opening one at a time.

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

## A poem in flight

One line of a poem unlocks per day of the wait. Each one arrives on a butterfly
that swoops in and settles on the bougainvillea, and stays there — so the garden
fills up as the day gets closer and the countdown is readable without reading
the digits. Tap a butterfly and its line surfaces where the whispers sit. **Read
the poem so far** opens all of them in a sheet.

The closing line is the birthday's own. It never unlocks early: at midnight every
butterfly lifts off the page at once, and the poem is finally readable end to
end from the celebration screen.

Write your own in `VITE_POEM`, one line each, separated by newlines or by ` | `:

```ini
VITE_POEM="Somewhere a chrysalis decided that today was close enough.
You were always the kind of quiet that had a whole summer folded inside it.
Happy birthday. Every wing here came to tell you the same thing."
```

Leave it blank and you get the 28 lines in
[`src/lib/poem.js`](src/lib/poem.js). Each one stands on its own, so they're
order-independent — you can reorder them, cut some, or swap individual lines
without anything else needing to change.

**The length sets the schedule.** It counts back from the birthday, so 28 lines
start unlocking 28 days out and 12 lines start 12 days out — change the length
freely, nothing needs adjusting. Just keep in mind that the last line is the one
that lands at midnight, on the celebration screen, so it wants to be the one you
would want read last.

There is one more day in the wait than there are lines to fill it, so one day
comes up empty. It's the first one, deliberately — a quiet day at the very start,
before you've even sent the link, costs nothing, whereas the last day before her
birthday is the worst possible one for nothing to arrive.

**Once the day comes, the poem stays whole.** Past the celebration window the
countdown rolls forward to next year's date so the digits keep meaning
something - but the poem is deliberately *not* rescheduled against it. It would
otherwise count back to zero and take every line she spent a month collecting
away again on the morning of the 28th, which is the day she is most likely to
come back and reread it. The trade is that a visitor in some later year finds
the poem already complete instead of watching it drip a second time.

Which lines she has opened is remembered in `localStorage`, so an unread
butterfly carries a small gold light and the button says how many are new. That
is the part that makes coming back daily legible; without it every butterfly
looks the same.

### Things worth knowing if you change it

- **The butterflies are DOM, not canvas.** The petals behind them are a canvas
  because nothing ever has to click a petal. These have to be tappable and
  reachable by keyboard, which a canvas gives you neither of for free.
- **Their positions are hashed from the index, not random.** A butterfly keeps
  its perch across reloads. `Math.random()` moved the whole garden on every
  refresh, which reads as a glitch rather than as life — half the point is that
  she recognises where yesterday's landed.
- **`unlockedCount` is an integer that only moves at a day boundary.** The app
  re-renders every second; everything below that integer is memoised on it, so
  the clock can't reach the butterflies. Re-rendering ~28 SVGs a second is the
  same mistake the bougainvillea had to be rescued from.
- **The line stays off the accessibility tree until it's picked.** Tabbing
  through would otherwise read the entire poem out in one go.
- **`src/lib/poem.js` must not import React.** `src/config.js` reaches it, and
  the Express server imports `config.js` directly — which is why `DAY` is
  redeclared there instead of imported from `useCountdown.js`.

## Ten for ten

The last ten days get a song each, on their own tab: a disc that turns while it
plays, the title under it, and the words below that. **It starts muted, every
single visit.** She opens the tab, the disc turns, nothing makes a sound until
she taps *tap for sound* — which is both the courtesy and, not coincidentally,
the tap that browsers require before a page is allowed to make noise at all.

The songs and their lyrics are **gitignored**. Copy the template and fill it in:

```bash
cp public/songs/songs.example.json public/songs/songs.json
```

Then drop the audio in next to it, so `public/songs/` looks like:

```
public/songs/
  songs.json            your manifest (gitignored)
  01-style.mp3          your audio  (gitignored)
  01-style.jpg          optional cover art
  songs.example.json    the committed template
```

Each entry takes `src` (the only required field), plus optional `title`,
`artist`, `cover`, `note` — one line of your own about why this song — and
`lyrics`, as either an array of lines or one string with newlines in it. Blank
lines are kept as verse breaks. Leave `lyrics` out entirely and the sheet says
so; the player works fine without it.

**The length sets the schedule**, exactly as it does for the poem. Ten entries
start unlocking ten days out; four entries start four days out. Ten is the cap.
Unlike the poem, nothing is held back for the birthday — the tenth song lands on
the final day of the wait, so on the day itself she has all ten to play rather
than nine and a promise.

### Things worth knowing if you change it

- **Why it is not in the repo.** These are commercial recordings, and on a free
  GitHub Pages plan the repo serving this page has to be public. The manifest
  is gitignored along with the audio because it carries the lyrics.
- **It is still a public URL.** Gitignoring keeps the files out of your *repo*,
  not out of your *deployment* — anyone with the link can download the audio
  straight from the site, exactly as they can already read the poem in the
  bundle. The whole manifest is fetched up front too, so the titles and lyrics
  of days she has not reached yet are readable in devtools: locked days are a
  closed door on the page, not a locked one. Same rule as everywhere else here —
  treat the page as public.
- **Which means CI cannot deploy it.** The GitHub Actions workflow builds from
  the repo, and the audio is not in the repo, so a Pages deploy simply has no
  music — the tab does not appear and nothing breaks. To ship the songs, build
  locally and upload `dist/` yourself: drag it onto Netlify Drop, or use
  Cloudflare Pages' direct upload. Both keep the never-sleeps property that
  makes static hosting the right choice here.
- **A missing manifest is a normal state, not an error.** No `songs.json` means
  no songs, no tab, no console noise. That is what every build without the
  audio looks like, including every CI build.
- **The `<audio>` element lives in `App`, not in the player.** The view unmounts
  every time she goes back to the garden, and an `<audio>` that unmounts stops
  playing. Hoisting it is what lets the song carry on underneath the countdown,
  which is the whole reason the player is a tab rather than a modal.
- **The playhead is deliberately not lifted with it.** It moves several times a
  second; `App` already re-renders the whole page once a second for the clock,
  and putting a 4Hz timer up there would drag the hedge, the drapes and every
  butterfly back into a per-frame render — the exact thing the memoisation
  elsewhere exists to undo. `MusicRoom` subscribes to the element itself.
- **The tab is a URL fragment** (`#/music`), not a path. There is no server on a
  static host to rewrite `/music` back to `index.html`, so a real route would
  404 on refresh. The fragment survives reload and makes the back button work.
- **The disc spins only while sound is actually being produced**, so it is the
  honest answer to "is this playing?" — which matters when the answer is "yes,
  but muted". It animates `transform` only, so it composites instead of
  repainting; the petal canvas behind it is already redrawing at 30fps.
- **The lyric sheet is capped in `vh`, not per cent.** The stage is a grid whose
  single row is auto-sized, so a percentage `max-height` resolves against the
  sheet's own content and constrains nothing — a long song ran off the bottom of
  the page and under the hedge. This is the same class of bug as the
  `.vines__hedge` width note further down.
- **Mute state is never remembered.** The song she was on is, in
  `localStorage`; whether the page may make noise has to be a fresh decision
  every visit, or the courtesy is only a courtesy once.

## The day itself

Every other screen here is one viewport with `overflow: hidden`, because a
countdown is a thing you glance at. The day is a thing you go through, so the
birthday page is the one screen that scrolls, and `App` drops its height cap for
exactly as long as that page is mounted. The wash, the glows, the petals and the
plant are all `position: fixed` already, so the whole sequence plays out over
the same garden she has been watching for a month — which cost nothing to get.

It runs in three beats.

**Her age**, alone on the screen. It stands there long enough to be read, then
catches light at the feet of the digits and goes up in embers. Set it in
`VITE_BIRTHDAY_AGE`:

```ini
VITE_BIRTHDAY_AGE=24
```

Leave it blank and the beat doesn't happen — the page opens on the greeting,
exactly as it did before this existed. That is a normal state, not a missing
one; plenty of people would rather their age weren't the largest thing on the
screen.

**The greeting**, which is the `Celebration` screen that was already here — the
title, the message, the confetti, and buttons through to the poem and the songs.
It didn't need replacing to become the top of a longer page.

**The bed**, six kinds of flower opening one at a time, under
`{VITE_BIRTHDAY_TITLE}, {VITE_BIRTHDAY_NAME}`. It waits until it is scrolled to.

### Things worth knowing if you change it

- **The number is never a DOM node.** It's drawn once into an offscreen canvas,
  read back a pixel at a time, and every opaque pixel on the sampling grid
  becomes a particle — so what burns is the actual shape of the actual glyphs in
  the actual display face, rather than a rectangle pretending to be a number.
  That is the whole trick, and it's why this is a canvas and not a very
  determined piece of CSS. `BASE_STEP` trades directly against particle count: 3
  is dense and legible, 6 is a sketch.
- **The embers ignite bottom-up**, because a particle's ignition point is its
  height in the number. The top is still solid while the feet are already gone,
  which is what makes it read as burning rather than as dissolving.
- **It fires once and hands over.** Nothing here loops, which is what lets it
  afford a few thousand particles on the one screen whose frame budget isn't
  already committed to something that runs forever.
- **The age is kept as a string.** It is drawn, not counted with, and this way a
  value that isn't a number can't quietly become `NaN` in the middle of the one
  screen nobody will be watching when it renders.
- **The blooms are CSS animations with computed delays**, not springs and not
  timers. There are around two hundred petals; handing each to framer-motion
  would put two hundred spring integrations on the main thread, whereas as CSS
  they're the compositor's problem and never touch React again. `forwards` holds
  the last frame and the animation is over — nothing is left running behind the
  rest of the page, which is the failure the swaying hedge already was.
- **The bed waits to be looked at.** Started on mount, it would have opened and
  finished while she was still reading the greeting a screen above it.
- **Petals carry two transforms that must not fight**: the rotation that puts
  them round the clock face, on a `transform` *attribute*, and the scale that
  opens them, as a CSS class on a node inside it. On the same node the CSS
  overwrites the attribute outright and every petal folds onto the centre — the
  identical trap the butterflies' wings are wrapped against.
- **Each petal is drawn from its own base outward**, which puts the bounding
  box's bottom edge exactly on the flower's centre. That's what lets
  `transform-origin: bottom center` scale a petal out of the middle of the
  flower instead of out of its own waist.
- **The species are radial by construction**, including the ones that aren't
  radial in life — a tulip is three petals over a narrow arc, a rose is three
  rings of one petal at falling scales. One code path for all six is what makes
  a seventh cheap.

## Rehearsing the big day

The payoff - the butterflies lifting off, the age burning down, the confetti,
the closing line - runs exactly once, unattended, at midnight, and there is no second attempt if
something about it is wrong. So the clock is movable. Add `?at=` to the URL:

| URL                                          | Where it puts you                       |
| -------------------------------------------- | --------------------------------------- |
| `?at=2026-09-26T23:59:50+05:30`              | ten seconds out - watch the handoff     |
| `?at=2026-09-27T00:00:05+05:30`              | the celebration screen, just after      |
| `?at=2026-09-28T00:00:01+05:30`              | the window closing behind it            |
| `?at=2026-09-28T09:00:00+05:30`              | the morning after                       |
| `?at=+22d`                                   | relative, and quicker to type           |
| `?at=-1d12h`                                 | compound, and backwards                 |
| `?at=2026-09-22T19:00:00+05:30#/music`       | the player, six of ten songs in         |

It offsets the clock rather than freezing it, so time still runs from wherever
you land - you can sit ten seconds before midnight and watch the transition
happen at its real speed instead of comparing two static screenshots either
side of it.

- **Keep the `+05:30`.** A bare `?at=2026-09-27` is read as UTC midnight, which
  is 5:30am in India - the wrong side of the very handoff you were checking. It
  warns in the console if you leave the time off.
- **A relative offset needs its sign**: `+22d`, not `22d`. That is what keeps
  `2026` from ever being ambiguous between a year and a number of seconds.
- **A badge sits at the top of the screen whenever the clock has been moved**,
  showing the simulated time, and the console says so too. A preview looks
  exactly like the real page, and the one mistake that would actually cost
  something is reassuring yourself with a screenshot of a clock that was never
  real.
- **It works on the deployed build, on purpose** - which is the only place the
  fonts, the timezone handling and the build-time config are all the ones she
  will get. Nothing is protected by leaving it out of production: `VITE_*`
  values are inlined into the bundle, so the poem is readable in the shipped
  JavaScript either way.
- **The seal is remembered separately**, in `localStorage`, so a preview lands
  straight on the countdown once you have been through it. Clear site data if
  you want to rehearse the envelope again.
- **A background tab holds still.** The clock deliberately stops while
  `document.hidden`, so previewing in an unfocused tab looks frozen - it
  resyncs when you come back to it.

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
src/App.jsx           picks between the waiting screen, the player and the day
src/hooks/
  useCountdown.js     the one ticking clock (useNow) + pure derivations
  useSongs.js         fetches the song manifest, absent by default
  useJukebox.js       the one <audio> element and its controls
  useHashView.js      which tab is showing, kept in the fragment
  useCelebrationConfig.js   fetches the server config, falls back to bundled
  useReducedMotion.js
  useReadLines.js     which lines she has already opened
src/components/
  PetalField.jsx      canvas petals drifting down
  Countdown.jsx       the four glass tiles
  RollingNumber.jsx   per-digit roll, so only what changed moves
  BloomProgress.jsx   ring that fills over the year, flower on the leading edge
  Whispers.jsx        rotating one-liners
  Bougainvillea.jsx   the whole plant: two corner drapes + the bottom hedge
  Gate.jsx            the wax seal and the passphrase
  LetterOpening.jsx   seal lifts, flap opens, letter rises
  BirthdayScroll.jsx  the day itself, the one screen that scrolls
  AgeBurn.jsx         her age, sampled off a canvas and burnt away in embers
  Celebration.jsx     confetti + the birthday message
  FlowerBloom.jsx     the bed, opening one flower at a time
  ButterflyFlight.jsx one butterfly per unlocked line, landed on the plant
  PoemSheet.jsx       the whole poem so far, over the page
  MusicRoom.jsx       the disc, the transport row and the lyric sheet
src/lib/secret.js     hashing and comparison for the passphrase
src/lib/timeTravel.js the ?at= preview clock
src/lib/songs.js      the ten-for-ten schedule and manifest parsing
src/lib/flowers.js    six species, and the bed they come up in
public/songs/         the audio and songs.json (both gitignored)
src/lib/poem.js       the poem, and which of it she has earned yet
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
  counting instead of sitting at zero. The poem is exempt: it is anchored to
  the original date and stays fully unlocked, so the rollover cannot take back
  what she already collected.
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

- A photo to go with each line of the poem
- A guestbook other friends can sign (the Express side is already there)
- Cover art for the ten songs, so the disc has a face
- A shareable link with the name baked into the URL
