/**
 * The curve the photographs are threaded onto.
 *
 * A tail rising from the bottom left, a full loop in the middle, and a tail
 * leaving to the right - so the set reads as one continuous string that
 * happens to cross itself, rather than as a row of pictures.
 *
 * Authored the same way as flowers.js: pure geometry, no React, no DOM, no
 * clock. The component below it only ever reads the array this produces.
 *
 * Everything is in a fixed 1000x520 space and scaled by the component, which
 * is what lets the whole arrangement be authored once at a comfortable size
 * and then dropped into whatever width the page has.
 */

export const PATH_W = 1000;
export const PATH_H = 520;

/* ------------------------------------------------------------------ pieces */

// The loop. Screen coordinates, so y grows downward and an increasing angle
// therefore travels clockwise - which is the direction the tails imply.
const LOOP = { cx: 470, cy: 232, r: 104, from: 118, sweep: 336 };

const cubic = (p0, p1, p2, p3) => (t) => {
  const u = 1 - t;
  return {
    x: u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    y: u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  };
};

const arc = ({ cx, cy, r, from, sweep }) => (t) => {
  const a = ((from + sweep * t) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const at = (spec) => (spec.type === 'arc' ? arc(spec) : cubic(spec.p0, spec.p1, spec.p2, spec.p3));

const entry = arc(LOOP)(0);
const exit = arc(LOOP)(1);

const PIECES = [
  // In from the bottom left, rising as it goes.
  { p0: [16, 486], p1: [190, 470], p2: [300, 452], p3: [entry.x, entry.y] },
  { type: 'arc', ...LOOP },
  // Out to the right, dipping once before it leaves the frame.
  { p0: [exit.x, exit.y], p1: [560, 420], p2: [760, 404], p3: [992, 300] },
];

/* --------------------------------------------------------------- sampling */

// Flattened finely enough that stepping along the point list is a good enough
// stand-in for real arc length. Photographs land every few dozen units, so an
// error of a fraction of one is invisible and the alternative is solving
// bezier arc length, which this does not need.
const FLATTEN = 240;

function polyline() {
  const points = [];
  for (const piece of PIECES) {
    const f = at(piece);
    // Skips t=0 on every piece after the first: consecutive pieces share an
    // endpoint, and a duplicated point is a zero-length segment that makes the
    // tangent at the join undefined.
    for (let i = points.length ? 1 : 0; i <= FLATTEN; i += 1) points.push(f(i / FLATTEN));
  }
  return points;
}

const POINTS = polyline();

const LENGTHS = (() => {
  const acc = [0];
  for (let i = 1; i < POINTS.length; i += 1) {
    acc.push(acc[i - 1] + Math.hypot(POINTS[i].x - POINTS[i - 1].x, POINTS[i].y - POINTS[i - 1].y));
  }
  return acc;
})();

export const PATH_LENGTH = LENGTHS[LENGTHS.length - 1];

/** The point at a given distance along the curve, and the angle of the curve there. */
function sampleAt(distance) {
  const d = Math.max(0, Math.min(PATH_LENGTH, distance));

  let i = 1;
  while (i < LENGTHS.length - 1 && LENGTHS[i] < d) i += 1;

  const span = LENGTHS[i] - LENGTHS[i - 1] || 1;
  const t = (d - LENGTHS[i - 1]) / span;
  const a = POINTS[i - 1];
  const b = POINTS[i];

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    // The tangent, in degrees. Taken from the flattened segment rather than
    // differentiating the curve, which is the whole reason the flattening is
    // fine enough to be boring.
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}

/**
 * Where each photograph sits.
 *
 * Spaced by arc length and not by the curve's own parameter, which is what
 * keeps them evenly spread: a bezier's t runs fast through the straight
 * stretches and slow round the bends, so spacing by t would bunch them up in
 * the loop and strand them along the tails.
 *
 * `lean` is a small deterministic wobble off the tangent, hashed from the
 * index. Photographs pinned exactly to the curve read as machined; a couple of
 * degrees either way reads as pinned up by hand. Hashed rather than random for
 * the same reason the butterflies are - it must not move on reload.
 */
export function placeAlong(count) {
  if (!count || count < 1) return [];

  // Inset from both ends so the first and last do not hang half off the frame.
  const inset = PATH_LENGTH * 0.02;
  const usable = PATH_LENGTH - inset * 2;
  const step = count === 1 ? 0 : usable / (count - 1);

  return Array.from({ length: count }, (_, i) => {
    const spot = sampleAt(inset + step * i);
    const lean = (((i * 2654435761) % 1000) / 1000 - 0.5) * 11;
    return { ...spot, lean, index: i };
  });
}

export default placeAlong;
