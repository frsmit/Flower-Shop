import { useId } from 'react';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The song's progress as a branch of cherry blossom, coming into flower as it
 * plays.
 *
 * Replaces the track-and-thumb slider. A progress bar answers "how far
 * through", which she can already read off the two timestamps either side of
 * it; a branch that flowers behind the playhead answers it as something worth
 * watching, and matches a page whose whole vocabulary is a garden.
 *
 * The shape follows the way sakura is actually drawn: one bough with side
 * twigs coming off it, and blossom gathered in clusters at the twig tips
 * rather than spaced along a wire. Evenly spaced flowers read as a ruler,
 * which is the one thing this is trying not to be.
 *
 * Ahead of the playhead the wood is bare and grey. Behind it the bark warms
 * and the blossom is open, so the branch gains its colour as the song crosses
 * it - the progress *is* the flowering, not a bar that happens to have flowers
 * on it.
 *
 * The geometry is a plain function of one number, `t` along the bough, so
 * nothing is ever measured at runtime: no `getPointAtLength`, no layout read,
 * no resize listener. Bough, twigs, clusters and the petal ring are computed
 * once when this module loads, and everything after that is a transform on a
 * handful of nodes.
 *
 * Responsiveness is the viewBox doing its job: one `width: 100%` and the whole
 * drawing scales exactly, at any size, with no breakpoints.
 *
 * The real slider is still here - dropped on top at full size and made
 * invisible - so dragging, arrow keys, Home/End, the label and the disabled
 * state are all the browser's, unchanged.
 */

const X0 = 34;
const X1 = 966;

/* Time maps straight onto x, so the playhead sits exactly where a progress bar
   would have put it. */
const x = (t) => X0 + t * (X1 - X0);

/* Two sines: a long sag for the sweep of the bough, a shorter one for the kink
   that stops it reading as a piece of wire. */
const y = (t) => 118 - 55 * Math.sin(t * Math.PI * 0.85) - 11 * Math.sin(t * Math.PI * 2.6 + 0.7);

const boughHalf = (u) => 9 - 6.4 * u;

/** Unit normal, from a small central difference - the bough has no corners. */
function normal(t) {
  const back = Math.max(0, t - 0.002);
  const forward = Math.min(1, t + 0.002);
  const dx = x(forward) - x(back);
  const dy = y(forward) - y(back);
  const length = Math.hypot(dx, dy) || 1;
  return [-dy / length, dx / length];
}

/**
 * A tapered length of wood as one closed shape: out along one side, back along
 * the other. A stroke would have been shorter, but a stroke cannot taper, and
 * wood of constant thickness looks like plumbing.
 */
function taper(point, half, steps) {
  const near = [];
  const far = [];

  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const [px, py, nx, ny] = point(u);
    const h = half(u);
    near.push(`${(px + nx * h).toFixed(1)} ${(py + ny * h).toFixed(1)}`);
    far.push(`${(px - nx * h).toFixed(1)} ${(py - ny * h).toFixed(1)}`);
  }

  return `M${near.join('L')}L${far.reverse().join('L')}Z`;
}

const BOUGH = taper(
  (u) => {
    const [nx, ny] = normal(u);
    return [x(u), y(u), nx, ny];
  },
  boughHalf,
  44,
);

/**
 * Side twigs, alternating above and below.
 *
 * Each leaves the bough along its normal and curls forward, so they read as
 * growth off a living branch rather than spokes on a wheel. `bend` is what
 * keeps the set from looking parallel.
 */
const TWIGS = [0.08, 0.19, 0.28, 0.4, 0.5, 0.61, 0.71, 0.82, 0.92].map((t, i) => {
  const [nx, ny] = normal(t);
  const side = i % 2 ? -1 : 1;
  const reach = 30 + ((i * 5) % 3) * 9;
  const bend = (i % 3 === 0 ? 1 : -1) * 14;

  const rootX = x(t);
  const rootY = y(t);
  const tipX = rootX + nx * side * reach + bend;
  const tipY = rootY + ny * side * reach;

  // Quadratic towards the tip, control point pushed along the bough so the
  // twig sweeps away rather than kinking where it joins.
  const cx = rootX + (tipX - rootX) * 0.45 + bend * 0.8;
  const cy = rootY + (tipY - rootY) * 0.55;

  const point = (u) => {
    const px = (1 - u) * (1 - u) * rootX + 2 * (1 - u) * u * cx + u * u * tipX;
    const py = (1 - u) * (1 - u) * rootY + 2 * (1 - u) * u * cy + u * u * tipY;
    const dx = 2 * (1 - u) * (cx - rootX) + 2 * u * (tipX - cx);
    const dy = 2 * (1 - u) * (cy - rootY) + 2 * u * (tipY - cy);
    const len = Math.hypot(dx, dy) || 1;
    return [px, py, -dy / len, dx / len];
  };

  const mid = point(0.62);

  return {
    t,
    side,
    d: taper(point, (u) => 3.2 - 2.6 * u, 12),
    tip: [tipX.toFixed(1), tipY.toFixed(1)],
    mid: [mid[0].toFixed(1), mid[1].toFixed(1)],
  };
});

/**
 * Blossom, gathered rather than spaced.
 *
 * Two open flowers per twig - one at the tip, one part way along - plus one
 * sitting on the bough itself in the gap before the next twig, so the flowers
 * do not march in step with the twigs. A bud just beyond each tip gives the
 * branch something still to do.
 */
const FLOWERS = [];
const BUDS = [];

TWIGS.forEach((twig, i) => {
  FLOWERS.push({
    t: twig.t,
    at: twig.tip,
    scale: (1.05 + ((i * 7) % 4) * 0.1).toFixed(2),
    turn: (i * 47) % 360,
  });

  FLOWERS.push({
    t: twig.t,
    at: twig.mid,
    scale: (0.78 + ((i * 3) % 3) * 0.09).toFixed(2),
    turn: (i * 83 + 40) % 360,
  });

  BUDS.push({
    t: twig.t,
    cx: (Number(twig.tip[0]) + twig.side * 2).toFixed(1),
    cy: (Number(twig.tip[1]) + twig.side * 11).toFixed(1),
    r: (2.6 + ((i * 11) % 3) * 0.7).toFixed(1),
  });

  const between = Math.min(0.99, twig.t + 0.055);
  const [nx, ny] = normal(between);
  FLOWERS.push({
    t: between,
    at: [
      (x(between) + nx * -twig.side * 9).toFixed(1),
      (y(between) + ny * -twig.side * 9).toFixed(1),
    ],
    scale: (0.62 + ((i * 5) % 3) * 0.08).toFixed(2),
    turn: (i * 113 + 90) % 360,
  });
});

/** Five petals round a centre - teardrops, not discs. */
const PETALS = [0, 1, 2, 3, 4].map((k) => (k * 72 - 90) % 360);

export default function BlossomScrub({
  elapsed,
  duration,
  playing,
  disabled,
  onSeek,
  onScrubStart,
  onScrubEnd,
}) {
  const reduced = useReducedMotion();
  const uid = useId();
  const flower = `bloom-${uid}`;

  // Clamped, because `elapsed` can briefly overshoot a duration the element is
  // still revising, and a playhead past the end of its own branch looks broken.
  const through = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;
  const edge = x(through).toFixed(1);

  return (
    <div className={`scrub ${disabled ? 'scrub--off' : ''}`}>
      <svg
        className="scrub__art"
        viewBox="0 0 1000 200"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <g id={flower}>
            {PETALS.map((angle, i) => (
              <ellipse
                key={i}
                className="scrub__petal"
                rx="4.6"
                ry="6.8"
                cy="-7.4"
                transform={`rotate(${angle})`}
              />
            ))}
            <circle className="scrub__heart" r="2.9" />
          </g>

          {/* Behind the playhead the branch is in flower, ahead of it it is
              bare. One clip does both, because the two copies of the wood are
              identical apart from their colour. */}
          <clipPath id={`bloomed-${uid}`}>
            <rect x="0" y="0" width={edge} height="200" />
          </clipPath>
        </defs>

        <g className="scrub__wood">
          <path d={BOUGH} />
          {TWIGS.map((twig, i) => (
            <path key={i} d={twig.d} />
          ))}
        </g>

        <g className="scrub__wood scrub__wood--warm" clipPath={`url(#bloomed-${uid})`}>
          <path d={BOUGH} />
          {TWIGS.map((twig, i) => (
            <path key={i} d={twig.d} />
          ))}
        </g>

        {BUDS.map((bud, i) => (
          <circle
            key={i}
            className={`scrub__budtip ${bud.t <= through ? 'scrub__budtip--open' : ''}`}
            cx={bud.cx}
            cy={bud.cy}
            r={bud.r}
          />
        ))}

        {FLOWERS.map((bloom, i) => (
          <use
            key={i}
            className={`scrub__bud ${bloom.t <= through ? 'scrub__bud--open' : ''}`}
            href={`#${flower}`}
            transform={`translate(${bloom.at[0]} ${bloom.at[1]}) rotate(${bloom.turn}) scale(${bloom.scale})`}
          />
        ))}

        {/* Where the song is. Positioned in CSS rather than by attribute so the
            move between two `timeupdate`s is a transition and not a jump. */}
        <g
          className="scrub__head"
          style={{ transform: `translate(${edge}px, ${y(through).toFixed(1)}px)` }}
        >
          <circle className="scrub__halo" r="24" />
          <g className={`scrub__turn ${playing && !reduced ? 'scrub__turn--going' : ''}`}>
            <use href={`#${flower}`} transform="scale(1.45)" />
          </g>
        </g>
      </svg>

      <input
        className="scrub__input"
        type="range"
        min={0}
        max={duration || 0}
        step={0.5}
        value={Math.min(elapsed, duration || 0)}
        onChange={onSeek}
        onPointerDown={onScrubStart}
        onPointerUp={onScrubEnd}
        disabled={disabled}
        aria-label="Position in the song"
      />
    </div>
  );
}
