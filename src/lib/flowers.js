/**
 * Six kinds of flower, and the bed they come up in.
 *
 * Authored the way `Bougainvillea` is authored - paths as constants, no art
 * pipeline, everything tinted through `currentColor` so one geometry serves
 * every colourway. The difference is that the plant is scenery and never
 * changes, while these are built to *open*: every shape here is drawn from its
 * own base outward, so a CSS scale from the base is the whole bloom.
 *
 * They are radial by construction, including the ones that are not radial in
 * life. A tulip is three petals over a narrow arc rather than twelve over a
 * full turn; a rose is three rings of the same petal at falling scales. Keeping
 * one code path for all six is what makes it cheap to add a seventh.
 *
 * No clock, no React, no DOM - same discipline as poem.js and songs.js.
 */

/* ------------------------------------------------------------------ petals */

// Each petal starts at the flower's centre (0,0) and reaches upward. That is
// load-bearing: it puts the bounding box's bottom edge exactly on the centre,
// which is what lets `transform-origin: bottom center` scale a petal out of
// the middle of the flower instead of out of its own waist.
const PETAL = {
  // Narrow and blunt - a daisy ray.
  ray: 'M 0 0 C -2.2 -4 -2.4 -10 0 -14 C 2.4 -10 2.2 -4 0 0 Z',
  // Broad, with the little notch at the tip a cosmos has.
  notched: 'M 0 0 C -5 -4 -6 -10 -3.4 -13.4 L 0 -11.6 L 3.4 -13.4 C 6 -10 5 -4 0 0 Z',
  // Long and pointed, reflexed at the tip.
  lance: 'M 0 0 C -3 -5 -3.2 -12 0 -18 C 3.2 -12 3 -5 0 0 Z',
  // Small and round, for the little five-petalled ones.
  round: 'M 0 0 C -3.4 -2.6 -3.6 -7 0 -8.4 C 3.6 -7 3.4 -2.6 0 0 Z',
  // Deep and cupped, closing back over itself at the top.
  cup: 'M 0 0 C -3.6 -3 -4.2 -9 -2.6 -13 C -1.2 -15.4 1.2 -15.4 2.6 -13 C 4.2 -9 3.6 -3 0 0 Z',
  // Wide and shallow, the kind that stacks into a rose.
  wrap: 'M 0 0 C -4 -3 -4.6 -8 -2.2 -10.6 C -0.8 -12 0.8 -12 2.2 -10.6 C 4.6 -8 4 -3 0 0 Z',
};

const LEAF = 'M 0 0 C -4.5 -2 -7.5 -6 -6.5 -10 C -5 -13.5 -2 -14.5 0 -15 C 3 -14 6.5 -11.5 7 -8 C 7.5 -4 4 -1.5 0 0 Z';

/* ----------------------------------------------------------------- species */

/**
 * `rings` are drawn outermost first, so a later ring sits on top of an earlier
 * one - which is the entire reason a rose reads as a rose and not as a pile.
 *
 * `arc` is how much of a turn the petals are spread over. 360 is a daisy; 150
 * is a tulip holding its three petals up rather than laying them flat.
 */
export const SPECIES = [
  {
    name: 'daisy',
    stem: 'M 0 0 C -3 -22 4 -44 0 -68',
    leaves: [{ x: -2, y: -26, spin: -58, scale: 1 }, { x: 3, y: -44, spin: 62, scale: 0.85 }],
    head: -68,
    rings: [{ count: 13, petal: 'ray', scale: 1, arc: 360, offset: 0 }],
    eye: { r: 3.6, fill: '#e8b878' },
    palettes: ['#fff6fb', '#f9d9e6', '#fff3d6'],
  },
  {
    name: 'cosmos',
    stem: 'M 0 0 C 4 -20 -3 -42 1 -62',
    leaves: [{ x: 2, y: -22, spin: 64, scale: 0.9 }, { x: -1, y: -40, spin: -60, scale: 0.8 }],
    head: -62,
    rings: [{ count: 8, petal: 'notched', scale: 1, arc: 360, offset: 22 }],
    eye: { r: 3.2, fill: '#e8b878' },
    palettes: ['#f2a0bd', '#e4568f', '#c9a8e8'],
  },
  {
    name: 'lily',
    stem: 'M 0 0 C -4 -24 3 -48 -1 -74',
    leaves: [{ x: -3, y: -30, spin: -68, scale: 1.05 }],
    head: -74,
    // Six pointed petals, and an inner three offset to sit between the outer
    // ones - which is how a lily is actually built.
    rings: [
      { count: 3, petal: 'lance', scale: 1, arc: 360, offset: 0 },
      { count: 3, petal: 'lance', scale: 0.88, arc: 360, offset: 60 },
    ],
    eye: { r: 2.6, fill: '#d4176e' },
    palettes: ['#fff6fb', '#f9c6ac', '#e7c6f0'],
  },
  {
    name: 'tulip',
    stem: 'M 0 0 C 3 -22 -2 -46 1 -66',
    leaves: [{ x: 1, y: -20, spin: 72, scale: 1.2 }, { x: -1, y: -34, spin: -70, scale: 1.05 }],
    head: -66,
    // Three petals over a narrow arc, standing up rather than opening out.
    rings: [{ count: 3, petal: 'cup', scale: 1.15, arc: 150, offset: -75 }],
    eye: null,
    palettes: ['#d4176e', '#e2693f', '#b32a93'],
  },
  {
    name: 'rose',
    stem: 'M 0 0 C -3 -18 4 -38 0 -56',
    leaves: [{ x: -2, y: -20, spin: -62, scale: 0.95 }, { x: 3, y: -36, spin: 66, scale: 0.85 }],
    head: -56,
    // Three rings, each smaller and turned off the last, which is as close to a
    // spiral as you get without actually spiralling.
    rings: [
      { count: 6, petal: 'wrap', scale: 1, arc: 360, offset: 0 },
      { count: 5, petal: 'wrap', scale: 0.72, arc: 360, offset: 34 },
      { count: 4, petal: 'wrap', scale: 0.46, arc: 360, offset: 62 },
    ],
    eye: { r: 1.8, fill: '#8e3358' },
    palettes: ['#e4568f', '#f2a0bd', '#c62a4a'],
  },
  {
    name: 'forget-me-not',
    stem: 'M 0 0 C 2 -14 -3 -30 0 -44',
    leaves: [{ x: -1, y: -16, spin: -64, scale: 0.7 }],
    head: -44,
    rings: [{ count: 5, petal: 'round', scale: 1, arc: 360, offset: 18 }],
    eye: { r: 2.4, fill: '#fff3d6' },
    palettes: ['#8fb4e8', '#c9a8e8', '#f9d9e6'],
  },
];

export function petalPath(key) {
  return PETAL[key] ?? PETAL.ray;
}

export const LEAF_PATH = LEAF;

/** Same generator the hedge is seeded with, so the bed is the same every visit. */
function mulberry32(seed) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BED_W = 1000;
export const BED_H = 300;

/**
 * Where every flower stands, and when it opens.
 *
 * Laid out left to right and opened in that order, so the bed reads as one
 * sweep rather than as eighteen unrelated events. The jitter on the delay is
 * what stops it looking like a progress bar.
 *
 * Built once at module scope: this is pure arithmetic over a fixed seed, and
 * recomputing it per render would be work for an identical answer.
 */
export function buildBed(count = 18, seed = 20260927) {
  const rng = mulberry32(seed);

  return Array.from({ length: count }, (_, i) => {
    const species = SPECIES[i % SPECIES.length];
    const t = i / Math.max(1, count - 1);

    return {
      species,
      // Spread across the bed with enough wobble that the spacing is not a comb.
      x: 40 + t * (BED_W - 80) + (rng() - 0.5) * 34,
      // Shorter ones toward the front, which is the only depth cue a flat bed
      // gets and the reason they are not all standing on the same line.
      y: BED_H - 18 - rng() * 26,
      scale: 0.85 + rng() * 0.7,
      // Tipped a little, because nothing in a garden is plumb.
      tilt: (rng() - 0.5) * 13,
      color: species.palettes[Math.floor(rng() * species.palettes.length)],
      // Left to right, plus a beat of slop so neighbours do not open in lockstep.
      delay: t * 3.4 + rng() * 0.35,
    };
  }).sort((a, b) => a.scale - b.scale); // smaller behind, larger in front
}

export const BED = buildBed();
