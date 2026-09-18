/**
 * The curve the photographs travel along, as an SVG path string.
 *
 * They come in past the left-hand edge, rising as they travel, curl once
 * around a loop, and leave past the right-hand edge - so the set reads as a
 * stream passing through rather than as an arrangement sitting still. Both ends of the path
 * are deliberately outside the visible box, which is what lets the loop be
 * endless without anybody seeing the seam: a photograph that reaches the end
 * has already left the screen, and the one that takes its place has not
 * arrived on it yet.
 *
 * Emitted as a path string because the motion is CSS `offset-path`. That hands
 * the whole thing - position along the curve and the rotation to match its
 * tangent - to the compositor as one animated property per photograph, rather
 * than to React, and it is the only reason a continuous loop is affordable
 * here at all.
 *
 * Pure geometry: no React, no DOM, no clock. Same discipline as flowers.js.
 */

// The space the path is authored in. The component scales this to whatever
// width the page has, so everything below is a fixed, comfortable size rather
// than a pile of percentages.
export const PATH_W = 1000;
export const PATH_H = 520;

const RAD = Math.PI / 180;

/**
 * The loop.
 *
 * `from` and `sweep` are chosen for their TANGENTS, not for where they put the
 * ends. The path is travelled continuously and each photograph is turned to
 * face along it, so a corner at a join is not a cosmetic flaw - it is a
 * photograph visibly snapping round as it crosses one.
 *
 * The curl goes OVER the stream rather than under it. A negative sweep is
 * travelled anticlockwise on screen, which puts the circle above the line the
 * photographs arrive on: one lifts as it reaches the loop, carries over the
 * top, and comes back down to rejoin the stream where it left it. Clockwise -
 * the way this used to run - hung the circle underneath instead, so a
 * photograph sagged below its own trail and the whole figure read as a dip
 * rather than a flourish.
 *
 * At 45 degrees the curve is heading up and to the right, which is the
 * direction the tail arrives in; 315 degrees of anticlockwise travel later it
 * is at the bottom of the circle heading due right, which is the direction the
 * tail leaves in.
 *
 * 315 and not 675: an upward curl reaches its exit tangent most of the way
 * round, so adding a full turn to force a self-crossing put over half the
 * path length onto the circle and the photographs bunched into a clock face
 * instead of streaming past. The 45 degrees of arc left untravelled sits
 * between the entry and the exit, which is where the two tails cross - so the
 * figure still closes on itself, just once rather than twice.
 */
const LOOP = { cx: 520, cy: 250, r: 116, from: 45, sweep: -315 };

const pointAt = (a) => [LOOP.cx + LOOP.r * Math.cos(a * RAD), LOOP.cy + LOOP.r * Math.sin(a * RAD)];
// Unit tangent for INCREASING angle, which is clockwise on screen because y
// grows downward.
const tangentAt = (a) => [-Math.sin(a * RAD), Math.cos(a * RAD)];

// Which way the arc is actually travelled. Everything that has to point along
// the path goes through `forwardAt` rather than `tangentAt`, so flipping the
// curl is a sign change on `sweep` and nothing else: get this wrong and the
// tails join the loop pointing backwards, which is a photograph spinning
// through 180 degrees at each seam.
const DIR = Math.sign(LOOP.sweep);
const forwardAt = (a) => tangentAt(a).map((v) => v * DIR);

const ENTRY = pointAt(LOOP.from);
const ENTRY_T = forwardAt(LOOP.from);
const EXIT = pointAt(LOOP.from + LOOP.sweep);
const EXIT_T = forwardAt(LOOP.from + LOOP.sweep);

// Where the stream comes from and where it goes, both off the visible box.
const START = [-210, 458];
const END = [1190, 300];

// How far the tails' control points reach back along the joining tangent. Big
// enough that the tail arrives already pointing the right way rather than
// bending into it at the last moment.
const REACH = 210;

/** A circular arc as cubic beziers, which is what a path string can carry. */
function arcToCubics({ r, from, sweep }) {
  const count = Math.ceil(Math.abs(sweep) / 90);
  const step = sweep / count;
  // The standard circular-arc bezier constant, for this segment's angle.
  const k = (4 / 3) * Math.tan((step * RAD) / 4);

  return Array.from({ length: count }, (_, i) => {
    const a0 = from + step * i;
    const a1 = from + step * (i + 1);
    const [x0, y0] = pointAt(a0);
    const [x1, y1] = pointAt(a1);
    const [tx0, ty0] = tangentAt(a0);
    const [tx1, ty1] = tangentAt(a1);
    return [
      x0 + k * r * tx0, y0 + k * r * ty0,
      x1 - k * r * tx1, y1 - k * r * ty1,
      x1, y1,
    ];
  });
}

const n = (v) => Math.round(v * 10) / 10;
const C = (a) => `C ${a.map(n).join(' ')}`;

/**
 * The path itself.
 *
 * Every join is tangent-matched by construction: the tail into the loop ends
 * with its control point on the loop's own tangent, and the tail out begins on
 * it. That is what keeps a photograph from snapping round as it crosses.
 */
export const PATH_D = [
  `M ${n(START[0])} ${n(START[1])}`,
  C([
    // Long and shallow, so the tail comes in almost level with the lower edge
    // and does its climbing later. Pulled upward early it reads as a diagonal
    // cut across the corner rather than as something arriving from off-stage.
    START[0] + 250, START[1] - 14,
    ENTRY[0] - ENTRY_T[0] * REACH, ENTRY[1] - ENTRY_T[1] * REACH,
    ENTRY[0], ENTRY[1],
  ]),
  ...arcToCubics(LOOP).map(C),
  C([
    EXIT[0] + EXIT_T[0] * REACH, EXIT[1] + EXIT_T[1] * REACH,
    END[0] - 300, END[1] - 60,
    END[0], END[1],
  ]),
].join(' ');

export default PATH_D;
