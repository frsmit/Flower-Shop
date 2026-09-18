import { useId } from 'react';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The song's progress as a branch of cherry blossom, opening as it plays.
 *
 * Replaces the track-and-thumb slider. A progress bar answers "how far
 * through", which she can already read off the two timestamps either side of
 * it; a branch that comes into flower behind the playhead answers it as
 * something worth watching, and matches a page whose whole vocabulary is a
 * garden.
 *
 * The geometry is a plain function of one number, `t` from 0 to 1 along the
 * branch, so nothing is ever measured at runtime: no `getPointAtLength`, no
 * layout read, no resize listener. The branch outline, the blossom placements
 * and the petal ring are all computed once when this module loads - about a
 * hundred sines, once - and everything after that is a transform on nine
 * elements. That is the whole of the weight.
 *
 * Responsiveness is the viewBox doing its job: one `width: 100%` and the
 * drawing scales exactly, at any size, with no breakpoints and no second code
 * path for narrow screens.
 *
 * The real slider is still here - dropped on top at full size and made
 * invisible. Dragging, arrow keys, Home/End, the aria label and the disabled
 * state are all the browser's, unchanged, because a decorative SVG is no place
 * to reimplement a range input badly.
 */

/* The branch runs left to right; time maps straight onto x, so the playhead
   sits exactly where a progress bar would have put it. */
const X0 = 34;
const X1 = 966;

const x = (t) => X0 + t * (X1 - X0);

/* Two sines: a long sag for the sweep of the bough, a shorter one for the kink
   that stops it reading as a piece of wire. */
const y = (t) => 118 - 55 * Math.sin(t * Math.PI * 0.85) - 11 * Math.sin(t * Math.PI * 2.6 + 0.7);

/** Thick where it leaves the trunk, thin at the tip. */
const halfWidth = (t) => 8 - 5.6 * t;

/** Unit normal, from a small central difference - the branch has no corners. */
function normal(t) {
  const back = Math.max(0, t - 0.002);
  const forward = Math.min(1, t + 0.002);
  const dx = x(forward) - x(back);
  const dy = y(forward) - y(back);
  const length = Math.hypot(dx, dy) || 1;
  return [-dy / length, dx / length];
}

/**
 * The branch as one closed shape: out along one side, back along the other.
 *
 * A stroked path would have been shorter, but a stroke cannot taper, and a
 * bough of constant thickness looks like plumbing.
 */
const BRANCH = (() => {
  const steps = 44;
  const near = [];
  const far = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const [nx, ny] = normal(t);
    const half = halfWidth(t);
    near.push(`${(x(t) + nx * half).toFixed(1)} ${(y(t) + ny * half).toFixed(1)}`);
    far.push(`${(x(t) - nx * half).toFixed(1)} ${(y(t) - ny * half).toFixed(1)}`);
  }

  return `M${near.join('L')}L${far.reverse().join('L')}Z`;
})();

/**
 * Nine blossoms, alternating sides, each on its own short twig.
 *
 * The positions are uneven on purpose - evenly spaced flowers read as a ruler,
 * which is the thing this is trying not to be - and the sizes and rotations
 * vary so no two are quite the same flower.
 */
const BLOSSOMS = [0.05, 0.16, 0.27, 0.36, 0.47, 0.58, 0.68, 0.79, 0.9].map((t, i) => {
  const [nx, ny] = normal(t);
  const side = i % 2 ? -1 : 1;
  const reach = 22 + (i % 3) * 6;

  return {
    t,
    from: [x(t).toFixed(1), y(t).toFixed(1)],
    at: [(x(t) + nx * side * reach).toFixed(1), (y(t) + ny * side * reach).toFixed(1)],
    scale: (0.92 + ((i * 7) % 5) * 0.09).toFixed(2),
    turn: (i * 37) % 360,
  };
});

/** Five petals round a centre. */
const PETALS = [0, 1, 2, 3, 4].map((k) => {
  const angle = ((k * 72 - 90) * Math.PI) / 180;
  return [(Math.cos(angle) * 9).toFixed(2), (Math.sin(angle) * 9).toFixed(2)];
});

export default function BlossomScrub({ elapsed, duration, playing, disabled, onSeek, onScrubStart, onScrubEnd }) {
  const reduced = useReducedMotion();
  const uid = useId();
  const flower = `blossom-${uid}`;

  // Clamped, because `elapsed` can briefly overshoot a duration the element is
  // still revising, and a playhead past the end of its own branch looks broken.
  const through = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;

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
            {PETALS.map(([cx, cy], i) => (
              <circle key={i} className="scrub__petal" cx={cx} cy={cy} r="7.2" />
            ))}
            <circle className="scrub__heart" r="3.4" />
          </g>

          {/* The bough behind the playhead is the one that has woken up. */}
          <clipPath id={`lit-${uid}`}>
            <rect x="0" y="0" width={x(through).toFixed(1)} height="200" />
          </clipPath>
        </defs>

        <path className="scrub__bark" d={BRANCH} />
        <path className="scrub__bark scrub__bark--lit" d={BRANCH} clipPath={`url(#lit-${uid})`} />

        {BLOSSOMS.map((blossom, i) => (
          <g key={i} className={`scrub__bud ${blossom.t <= through ? 'scrub__bud--open' : ''}`}>
            <line
              className="scrub__twig"
              x1={blossom.from[0]}
              y1={blossom.from[1]}
              x2={blossom.at[0]}
              y2={blossom.at[1]}
            />
            <use
              href={`#${flower}`}
              transform={`translate(${blossom.at[0]} ${blossom.at[1]}) rotate(${blossom.turn}) scale(${blossom.scale})`}
            />
          </g>
        ))}

        {/* Where the song is. Positioned in CSS rather than by attribute so the
            move between two `timeupdate`s is a transition and not a jump. */}
        <g
          className="scrub__head"
          style={{ transform: `translate(${x(through).toFixed(1)}px, ${y(through).toFixed(1)}px)` }}
        >
          <circle className="scrub__halo" r="22" />
          <g className={`scrub__turn ${playing && !reduced ? 'scrub__turn--going' : ''}`}>
            <use href={`#${flower}`} transform="scale(1.5)" />
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
