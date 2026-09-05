/**
 * Bougainvillea framing the whole page: drapes hanging down from the top two
 * corners, and a hedge along the bottom.
 *
 * Worth knowing what the plant actually looks like, because it drives every
 * shape below. Bougainvillea has almost no petals: the colour comes from papery
 * *bracts* - modified leaves - which grow in triads of three, and the true
 * flowers are the slender cream tubes at each triad's centre. It's a climber, so
 * the natural thing is for it to come over the top of a wall and hang down,
 * which is what the corner drapes do.
 *
 * The thing that makes a real plant read as three-dimensional is that you never
 * see all the triads face-on. At any moment some face you as full rosettes,
 * plenty are edge-on - you see the bract profiles and the flower tubes poking
 * out sideways - and some show their paler, more strongly veined undersides. On
 * top of that, triads deep in the mass sit in shadow while the ones in front
 * catch the light. So each cluster picks a viewing angle and a depth, and gets
 * tinted accordingly.
 *
 * Every bract on the page is one `<use>` of a single definition, tinted through
 * `currentColor`, and only the canes animate - a swaying cane carries its own
 * bracts, which keeps several hundred elements off the animation path.
 */

import { memo } from 'react';

/* ------------------------------------------------------------------ shapes */

// A bract seen face-on: ovate, pointed apex, faintly wavy margin, and just
// asymmetric enough not to look stamped out.
const BRACT =
  'M 0 0 C -3.4 -2.2 -6.2 -5.4 -6.8 -9.2 C -7.3 -12.4 -5.6 -15.2 -3.4 -17.6 ' +
  'C -2.2 -19 -1 -20.2 0 -21.4 C 1.2 -20 2.6 -18.6 3.8 -17.2 ' +
  'C 6 -14.8 7.4 -12 6.8 -8.8 C 6.2 -5 3.4 -2 0 0 Z';

// The cupped highlight down one side. Bracts aren't flat - they dish slightly.
const BRACT_CUP =
  'M 0 -3 C -3.5 -6 -5 -9.5 -4.4 -12.6 C -3.6 -15.6 -1.8 -17.6 0 -19 ' +
  'C 1 -17 2 -14 1.6 -11 C 1.2 -7.4 0.8 -5 0 -3 Z';

const BRACT_VEINS = [
  'M 0 -1.2 Q 0.7 -11 0.2 -20',
  'M 0.2 -6 Q 3.1 -8.2 5 -11.6',
  'M -0.1 -9 Q -2.6 -11.4 -4.6 -14',
];

// The same bract turned edge-on: a thin curved sliver. This is the shape that
// sells the side view.
const BRACT_EDGE =
  'M 0 0 C -1.4 -5 -2 -11 -1.2 -17 C -0.9 -19.2 -0.3 -20.6 0.4 -21.2 ' +
  'C 0.9 -19.8 1.4 -17.4 1.5 -14 C 1.6 -9 1 -4 0 0 Z';

// One of the actual flowers: a slender tube with a small flared mouth.
const FLORET = 'M 0 0 C 1.2 -1.9 1.35 -4.7 0.9 -7.2 L -0.9 -7.2 C -1.35 -4.7 -1.2 -1.9 0 0 Z';

// A leaf: rounder and blunter than a bract, and green.
const LEAF =
  'M 0 0 C -5 -2.5 -8.5 -7 -7 -11.5 C -5.5 -15.5 -2.5 -16.5 0 -17 ' +
  'C 3.5 -16 7 -13 7.5 -9 C 8 -4.5 4.5 -1.5 0 0 Z';

/* ------------------------------------------------------------------ colour */

// Cultivars come in one colour per plant, so each cane gets a single palette
// and the whole thing reads as several plants grown into each other.
const PALETTES = [
  '#d4176e', // magenta - the classic
  '#b32a93', // purple
  '#e4568f', // rose
  '#d4176e',
  '#c62a4a', // crimson
  '#e2693f', // coral
  '#d4176e',
  '#f2a0bd', // blush
  '#b32a93',
  '#e4568f',
  '#fae3d8', // the pale cream variety, for contrast
  '#d4176e',
];

const SHADOW = [61, 15, 42]; // deep plum, for bracts buried in the mass
const LIGHT = [255, 242, 246]; // sunlight on the ones in front

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (rgb) =>
  `#${rgb
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
    .join('')}`;

const mix = (hex, target, amount) => toHex(hexToRgb(hex).map((v, i) => v + (target[i] - v) * amount));

/**
 * Depth 0 is buried in the mass, depth 1 is catching the light at the front.
 * Shading by depth does more for the illusion of volume than any extra geometry.
 */
const shadeByDepth = (hex, depth) =>
  depth < 0.5
    ? mix(hex, SHADOW, (0.5 - depth) * 1.05)
    : mix(hex, LIGHT, (depth - 0.5) * 0.3);

/* ------------------------------------------------------------------- maths */

/** Deterministic PRNG, so the plant is organic but identical on every render. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cubic = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

const cubicSlope = (a, b, c, d, t) => {
  const u = 1 - t;
  return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c);
};

/** Point and heading at position `t` along a cane, so growth follows the branch. */
function alongCane(p, t) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  return {
    x: cubic(x0, x1, x2, x3, t),
    y: cubic(y0, y1, y2, y3, t),
    // +90 because the bract art points "up" rather than "right".
    angle:
      (Math.atan2(cubicSlope(y0, y1, y2, y3, t), cubicSlope(x0, x1, x2, x3, t)) * 180) / Math.PI +
      90,
  };
}

const canePath = ([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) =>
  `M ${x0} ${y0} C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;

/**
 * Which way a triad is facing. Weighted toward face-on because that's what
 * reads as flowers, but with enough edge-on and reversed ones to give the mass
 * some thickness.
 */
function pickView(r) {
  if (r < 0.46) return 'face';
  if (r < 0.68) return 'threeQuarter';
  if (r < 0.88) return 'side';
  return 'back';
}

/** Hangs bracts and leaves along a cane. Shared by the hedge and the drapes. */
function decorate(p, rng, caneDepth, { clusters: clusterCount, sizeBias = 1 }) {
  const clusters = Array.from({ length: clusterCount }, (_, c) => {
    const t = 0.1 + (c / clusterCount) * 0.9 + (rng() - 0.5) * 0.08;
    const at = alongCane(p, Math.min(0.995, Math.max(0, t)));

    // Depth is mostly the cane's, nudged per cluster so a single cane still has
    // bracts in front of and behind each other.
    const depth = Math.min(1, Math.max(0, caneDepth + (rng() - 0.5) * 0.5));
    const view = pickView(rng());

    return {
      x: at.x + (rng() - 0.5) * 26,
      y: at.y + (rng() - 0.5) * 20,
      spin: at.angle + (rng() - 0.5) * 90,
      // Bracts are big relative to the plant - they're leaves, not petals.
      // Deeper ones read smaller, which reinforces the depth.
      scale: sizeBias * (1.5 - t * 0.34) * (0.84 + rng() * 0.34) * (0.82 + depth * 0.26),
      // Yaw is faked by squashing horizontally.
      yaw:
        view === 'threeQuarter'
          ? 0.4 + rng() * 0.3
          : view === 'face'
            ? 0.82 + rng() * 0.18
            : 0.9 + rng() * 0.2,
      flip: rng() < 0.5 ? -1 : 1,
      view,
      depth,
    };
  }).sort((a, b) => a.depth - b.depth); // back of the cane drawn first

  const leaves = Array.from({ length: 5 + Math.floor(rng() * 4) }, (_, l) => {
    const at = alongCane(p, 0.08 + rng() * 0.72);
    return {
      x: at.x,
      y: at.y,
      spin: at.angle + (l % 2 === 0 ? 64 : -64) + (rng() - 0.5) * 26,
      scale: sizeBias * (0.78 + rng() * 0.6),
    };
  });

  return { clusters, leaves };
}

const caneStyle = (rng) => ({
  delay: rng() * 5,
  duration: 6.5 + rng() * 4,
  width: 2.4 + rng() * 1.6,
  haze: 34 + rng() * 26,
});

/* ------------------------------------------------------- the bottom hedge */

const HEDGE_W = 1600;
const HEDGE_H = 230;
const HEDGE_BASE = 230;
const HEDGE_CANES = 22;

/**
 * How many canes actually animate, counted from the front. See `Cane` for why
 * this is not simply "all of them".
 *
 * Raise these if the plant ever looks too still; every one you add puts another
 * few hundred SVG nodes back on the per-frame raster path, so add them one at a
 * time and with the frame counter open.
 */
const SWAYING_HEDGE_CANES = 5;
const SWAYING_DRAPE_CANES = 3;

const HEDGE = (() => {
  const rng = mulberry32(20260927); // the big day, as a seed

  return Array.from({ length: HEDGE_CANES }, (_, i) => {
    // Spans past both edges by OVERHANG, so the outermost canes can lean
    // inward without leaving a bare corner at either end.
    const OVERHANG = 90;
    const spacing = (HEDGE_W + OVERHANG * 2) / HEDGE_CANES;
    const x = -OVERHANG + spacing * (i + 0.5) + (rng() - 0.5) * spacing * 1.05;

    // Lean is random rather than alternating. Alternating made neighbouring
    // canes meet at the top in symmetric arches, which read as croquet hoops.
    const lean = rng() < 0.5 ? -1 : 1;
    // Reach outweighs height on purpose: bougainvillea sprawls sideways, and
    // near-vertical canes made the whole thing read as lavender spikes.
    const height = 62 + rng() * 104;
    const reach = (58 + rng() * 88) * lean;

    const p = [
      [x, HEDGE_BASE + 10],
      [x + reach * 0.1, HEDGE_BASE - height * 0.46],
      [x + reach * 0.62, HEDGE_BASE - height * 0.84],
      [x + reach, HEDGE_BASE - height],
    ];

    const depth = rng();
    return {
      p,
      depth,
      color: PALETTES[Math.floor(rng() * PALETTES.length)],
      ...decorate(p, rng, depth, { clusters: 13 + Math.floor(rng() * 7) }),
      ...caneStyle(rng),
    };
  }).sort((a, b) => a.depth - b.depth);
})();

/** Low green mass at the base, so the colour sits on foliage, not on nothing. */
const FOLIAGE = (() => {
  const rng = mulberry32(4242);
  return Array.from({ length: 26 }, () => {
    const r = 30 + rng() * 46;
    return {
      x: rng() * HEDGE_W,
      y: HEDGE_BASE - 6 - rng() * 30,
      rx: r,
      ry: r * (0.5 + rng() * 0.3),
    };
  });
})();

/** Spent bracts collected on the ground - very much part of the look. */
const FALLEN = (() => {
  const rng = mulberry32(77);
  return Array.from({ length: 26 }, () => ({
    x: rng() * HEDGE_W,
    y: HEDGE_BASE - 2 + rng() * 14,
    spin: rng() * 360,
    // Lying flat means we see them foreshortened, so squash them vertically.
    squash: 0.35 + rng() * 0.35,
    scale: 0.55 + rng() * 0.45,
    color: mix(PALETTES[Math.floor(rng() * PALETTES.length)], LIGHT, 0.25),
    opacity: 0.4 + rng() * 0.4,
  }));
})();

/** A single tapered blade, drawn as a filled sliver - a stroke can't taper. */
const grassBlade = (x, h, lean, w) =>
  `M ${x} ${HEDGE_BASE} ` +
  `Q ${x + lean * 0.35} ${HEDGE_BASE - h * 0.55} ${x + lean} ${HEDGE_BASE - h} ` +
  `Q ${x + lean * 0.5 + w} ${HEDGE_BASE - h * 0.5} ${x + w} ${HEDGE_BASE} Z`;

const GRASS_GREENS = ['#7e9a68', '#8fae76', '#9dbd83', '#6f8c5c', '#a8c48d'];

const GRASS = (() => {
  const rng = mulberry32(5150);
  return Array.from({ length: 170 }, () => {
    const h = 14 + rng() * 42;
    return {
      d: grassBlade(rng() * (HEDGE_W + 20) - 10, h, (rng() - 0.5) * 30, 1.5 + rng() * 1.9),
      fill: GRASS_GREENS[Math.floor(rng() * GRASS_GREENS.length)],
      opacity: 0.4 + rng() * 0.5,
    };
  });
})();

/**
 * Little wildflowers through the grass - daisies and buttercups, deliberately
 * small so they read as filler rather than competing with the bougainvillea.
 */
const WILDFLOWER_COLORS = ['#ffffff', '#fdfbf4', '#fff4d6', '#e8dcf5', '#ffe2ec', '#fff8e2'];

const WILDFLOWERS = (() => {
  const rng = mulberry32(9091);
  return Array.from({ length: 46 }, () => {
    const stem = 12 + rng() * 30;
    return {
      x: rng() * HEDGE_W,
      stem,
      bend: (rng() - 0.5) * 12,
      scale: 0.62 + rng() * 0.6,
      color: WILDFLOWER_COLORS[Math.floor(rng() * WILDFLOWER_COLORS.length)],
      opacity: 0.72 + rng() * 0.28,
    };
  });
})();

/* -------------------------------------------------------- the top drapes */

const DRAPE_W = 620;
const DRAPE_H = 620;

/**
 * A corner drape. Canes come over the top edge and down the side, then hang -
 * they head outward first and bend downward under their own weight, which is
 * what makes a vine look draped rather than sprayed.
 *
 * `dir` is 1 for the left corner and -1 for the right, and each corner gets its
 * own seed so the two aren't mirror images of each other.
 */
function buildDrape(seed, dir) {
  const rng = mulberry32(seed);
  const atX = (x) => (dir === 1 ? x : DRAPE_W - x);

  const canes = [];

  // Coming over the top edge and hanging straight down.
  for (let i = 0; i < 7; i += 1) {
    const x = -30 + (i / 6) * 330 + (rng() - 0.5) * 60;
    const reach = (26 + rng() * 118) * dir;
    const drop = 200 + rng() * 360;
    const sway = (rng() - 0.5) * 90 * dir;
    canes.push([
      [atX(x), -16],
      [atX(x + reach * 0.55), -16 + drop * 0.08],
      [atX(x + reach * 0.95 + sway), -16 + drop * 0.5],
      [atX(x + reach + sway * 0.6), -16 + drop],
    ]);
  }

  // Climbing in along the side, drooping as it goes.
  for (let i = 0; i < 6; i += 1) {
    const y = 10 + (i / 5) * 320 + (rng() - 0.5) * 50;
    const reach = (150 + rng() * 240) * dir;
    const drop = 60 + rng() * 230;
    const sway = (rng() - 0.5) * 60 * dir;
    canes.push([
      [atX(-16), y],
      [atX(-16 + reach * 0.5), y + drop * 0.12],
      [atX(-16 + reach * 0.9 + sway), y + drop * 0.55],
      [atX(-16 + reach + sway * 0.5), y + drop],
    ]);
  }

  return canes
    .map((p) => {
      const depth = rng();
      return {
        p,
        depth,
        color: PALETTES[Math.floor(rng() * PALETTES.length)],
        ...decorate(p, rng, depth, { clusters: 12 + Math.floor(rng() * 6) }),
        ...caneStyle(rng),
      };
    })
    .sort((a, b) => a.depth - b.depth);
}

const DRAPE_LEFT = buildDrape(8813, 1);
const DRAPE_RIGHT = buildDrape(4127, -1);

/* -------------------------------------------------------------- components */

function Cluster({ cluster, color }) {
  const symbol =
    cluster.view === 'side'
      ? '#bx-triad-side'
      : cluster.view === 'back'
        ? '#bx-triad-back'
        : '#bx-triad-face';

  return (
    <g
      transform={
        `translate(${cluster.x} ${cluster.y}) rotate(${cluster.spin}) ` +
        `scale(${cluster.scale * cluster.yaw * cluster.flip} ${cluster.scale})`
      }
    >
      <use href={symbol} style={{ color: shadeByDepth(color, cluster.depth) }} />
    </g>
  );
}

/**
 * `sways` is false for everything but the front-most canes, and that is a
 * performance decision rather than an aesthetic one.
 *
 * An animated transform on an SVG <g> is not composited: the browser has to
 * re-rasterise the group's entire subtree every frame. A cane's subtree is its
 * canePath plus a dozen leaves plus ~15 clusters, and every cluster is a <use>
 * that expands into 18 more nodes - so one swaying cane is ~300 vector nodes
 * redrawn 60 times a second. All 48 of them swaying came to roughly 13,000
 * nodes per frame, continuously, for the entire life of the page. Both drapes
 * and the hedge are masked as well, so each frame also re-applied a mask over
 * the whole element.
 *
 * The canes are depth-sorted back-to-front, so the last few in each set are the
 * ones in front of everything else and the only ones whose motion is legible.
 * The rest sit behind them, hazed and half-occluded, moving 1.25 degrees. Left
 * still they cost nothing and read as a static backdrop, which - as a bonus the
 * profiler did not ask for - gives the front canes something to move against.
 */
function Cane({ cane, sways }) {
  return (
    <g
      className={sways ? 'vine__cane' : undefined}
      style={
        sways
          ? { animationDelay: `${cane.delay}s`, animationDuration: `${cane.duration}s` }
          : undefined
      }
    >
      <path
        d={canePath(cane.p)}
        fill="none"
        stroke="#7d6a55"
        strokeWidth={cane.width}
        strokeLinecap="round"
        opacity="0.7"
      />

      {cane.leaves.map((leaf, i) => (
        <g
          key={`leaf-${i}`}
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.spin}) scale(${leaf.scale})`}
        >
          <path d={LEAF} fill="#7e9a68" opacity="0.85" />
          <path d={LEAF} fill="#9ab586" opacity="0.5" transform="scale(0.7)" />
        </g>
      ))}

      {cane.clusters.map((cluster, i) => (
        <Cluster key={`cluster-${i}`} cluster={cluster} color={cane.color} />
      ))}
    </g>
  );
}

/** The blurred colour behind a set of canes, which buys depth cheaply. */
function Haze({ canes }) {
  return (
    <g filter="url(#bx-haze)" opacity="0.32">
      {canes.map((cane, i) => (
        <path
          key={i}
          d={canePath(cane.p)}
          fill="none"
          stroke={mix(cane.color, SHADOW, 0.25)}
          strokeWidth={cane.haze}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/**
 * All the reusable geometry, in a zero-size SVG. `use href="#id"` resolves
 * against the whole document, so every SVG on the page shares these.
 */
function Sprite() {
  return (
    <svg className="vines__sprite" aria-hidden="true" focusable="false">
      <defs>
        <filter id="bx-haze" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="11" />
        </filter>

        {/* One bract, face-on. `currentColor` lets every copy be tinted for its
            own depth without duplicating the geometry. */}
        <g id="bx-bract">
          <path d={BRACT} fill="currentColor" />
          <path d={BRACT_CUP} fill="#fff" opacity="0.2" />
          {BRACT_VEINS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(70, 18, 42, 0.26)"
              strokeWidth={i === 0 ? 0.75 : 0.5}
            />
          ))}
        </g>

        {/* The underside: paler, cooler, and the veins stand out more. */}
        <g id="bx-bract-back">
          <path d={BRACT} fill="currentColor" opacity="0.78" />
          <path d={BRACT} fill="#f6ebe4" opacity="0.34" />
          {BRACT_VEINS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(92, 58, 74, 0.38)"
              strokeWidth={i === 0 ? 0.95 : 0.62}
            />
          ))}
        </g>

        {/* Edge-on. Barely any colour area, which is exactly why it reads as a
            bract turned sideways rather than a smaller flower. */}
        <g id="bx-bract-edge">
          <path d={BRACT_EDGE} fill="currentColor" />
          <path d={BRACT_EDGE} fill="none" stroke="rgba(70, 18, 42, 0.22)" strokeWidth="0.45" />
        </g>

        {/* A wildflower in the grass: five petals and a pollen centre. */}
        <g id="bx-daisy">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cy="-3.2"
              rx="1.5"
              ry="3.2"
              fill="currentColor"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle r="1.4" fill="#f4cf72" />
          <circle r="0.6" fill="#e0ac4b" opacity="0.8" />
        </g>

        <g id="bx-florets">
          {[18, 138, 258].map((deg) => (
            <g key={deg} transform={`rotate(${deg})`}>
              <path d={FLORET} fill="#fdf6e6" opacity="0.95" />
              <circle cy="-7.4" r="0.85" fill="#fff8ea" opacity="0.9" />
              <circle cy="-7.4" r="0.4" fill="#e9c98d" opacity="0.85" />
            </g>
          ))}
        </g>

        {/* Face-on triad: three bracts at roughly 120 degrees, each a slightly
            different size, with the flowers in the middle. */}
        <g id="bx-triad-face">
          <use href="#bx-bract" />
          <use href="#bx-bract" transform="rotate(122) scale(0.95)" />
          <use href="#bx-bract" transform="rotate(241) scale(0.9)" />
          <use href="#bx-florets" />
        </g>

        {/* Seen from behind or above: undersides, and the stalk it hangs from
            instead of the flower mouths. */}
        <g id="bx-triad-back">
          <use href="#bx-bract-back" />
          <use href="#bx-bract-back" transform="rotate(126) scale(0.94)" />
          <use href="#bx-bract-back" transform="rotate(238) scale(0.89)" />
          <path d="M 0 1 Q 0.4 4.6 -0.6 7.6" fill="none" stroke="#7e9a68" strokeWidth="1.1" />
          <circle r="1.5" fill="#8faa79" opacity="0.85" />
        </g>

        {/* Edge-on triad: bract profiles fanning from a common base, with the
            flower tubes clearly projecting - the tell of a side view. */}
        <g id="bx-triad-side">
          <use href="#bx-bract-edge" transform="rotate(-26) scale(1.02)" />
          <use href="#bx-bract-edge" transform="rotate(2)" />
          <use href="#bx-bract-edge" transform="rotate(29) scale(0.95)" />
          {[-14, 3, 20].map((deg) => (
            <g key={deg} transform={`rotate(${deg})`}>
              <path d={FLORET} fill="#fdf6e6" opacity="0.82" transform="scale(0.85 1.12)" />
              <circle cy="-8.4" r="0.9" fill="#fff8ea" opacity="0.88" />
              <circle cy="-8.4" r="0.4" fill="#e9c98d" opacity="0.85" />
            </g>
          ))}
          <path d="M 0 1 Q 0.6 4.4 -0.4 7.2" fill="none" stroke="#7e9a68" strokeWidth="1" />
        </g>
      </defs>
    </svg>
  );
}

function Drape({ canes, side }) {
  return (
    <svg
      className={`vines__drape vines__drape--${side}`}
      viewBox={`0 0 ${DRAPE_W} ${DRAPE_H}`}
      preserveAspectRatio={`${side === 'left' ? 'xMinYMin' : 'xMaxYMin'} meet`}
      aria-hidden="true"
    >
      <Haze canes={canes} />
      {canes.map((cane, i) => (
        <Cane key={i} cane={cane} sways={i >= canes.length - SWAYING_DRAPE_CANES} />
      ))}
    </svg>
  );
}

function Hedge() {
  return (
    <svg
      className="vines__hedge"
      viewBox={`0 0 ${HEDGE_W} ${HEDGE_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={`M 0 ${HEDGE_BASE} L 0 ${HEDGE_BASE - 20}
            C 200 ${HEDGE_BASE - 32} 420 ${HEDGE_BASE - 10} 640 ${HEDGE_BASE - 24}
            C 880 ${HEDGE_BASE - 38} 1080 ${HEDGE_BASE - 12} 1300 ${HEDGE_BASE - 26}
            C 1440 ${HEDGE_BASE - 34} 1540 ${HEDGE_BASE - 16} ${HEDGE_W} ${HEDGE_BASE - 24}
            L ${HEDGE_W} ${HEDGE_BASE} Z`}
        fill="rgba(150, 178, 142, 0.26)"
      />

      {/* Foliage, blurred as one group so it costs a single filter pass. */}
      <g filter="url(#bx-haze)" opacity="0.5">
        {FOLIAGE.map((blob, i) => (
          <ellipse key={i} cx={blob.x} cy={blob.y} rx={blob.rx} ry={blob.ry} fill="#84a273" />
        ))}
      </g>

      {/* Grass first, so the bougainvillea sits in front of it. */}
      <g className="vines__grass">
        {GRASS.map((blade, i) => (
          <path key={i} d={blade.d} fill={blade.fill} opacity={blade.opacity} />
        ))}
      </g>

      {WILDFLOWERS.map((flower, i) => (
        <g key={`wild-${i}`} opacity={flower.opacity}>
          <path
            d={
              `M ${flower.x} ${HEDGE_BASE} ` +
              `Q ${flower.x + flower.bend * 0.5} ${HEDGE_BASE - flower.stem * 0.6} ` +
              `${flower.x + flower.bend} ${HEDGE_BASE - flower.stem}`
            }
            fill="none"
            stroke="#7e9a68"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <g
            transform={
              `translate(${flower.x + flower.bend} ${HEDGE_BASE - flower.stem}) ` +
              `scale(${flower.scale})`
            }
          >
            <use href="#bx-daisy" style={{ color: flower.color }} />
          </g>
        </g>
      ))}

      <Haze canes={HEDGE} />

      {FALLEN.map((bract, i) => (
        <g
          key={`fallen-${i}`}
          transform={
            `translate(${bract.x} ${bract.y}) rotate(${bract.spin}) ` +
            `scale(${bract.scale} ${bract.scale * bract.squash})`
          }
          opacity={bract.opacity}
        >
          <use href="#bx-bract" style={{ color: bract.color }} />
        </g>
      ))}

      {HEDGE.map((cane, i) => (
        <Cane key={i} cane={cane} sways={i >= HEDGE.length - SWAYING_HEDGE_CANES} />
      ))}
    </svg>
  );
}

function Bougainvillea() {
  return (
    <div className="vines" aria-hidden="true">
      <Sprite />
      <Drape canes={DRAPE_LEFT} side="left" />
      <Drape canes={DRAPE_RIGHT} side="right" />
      <Hedge />
    </div>
  );
}

/**
 * Memoised deliberately. The app re-renders every second from the clock, and
 * without this React reconciled all ~3000 of the plant's SVG nodes on every
 * tick - which is what made the seconds animation stutter.
 */
export default memo(Bougainvillea);
