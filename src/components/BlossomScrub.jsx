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
 * Side twigs, alternating above and below - and each one grows out of the
 * bough as the song reaches it.
 *
 * Every twig is built in its OWN coordinates, with its root at (0, 0), and
 * placed by a translate on the group around it. That is what makes the growth
 * possible: an SVG element scales about its local origin, so scaling the group
 * from nothing to full size makes the twig appear to push out of the bough
 * rather than fade in on top of it. Built in absolute coordinates it would
 * have scaled about the far left of the drawing and flown in from off-screen.
 *
 * The blossom rides inside the same group, so it arrives with the wood it is
 * attached to and opens a beat later.
 */
const TWIGS = [0.05, 0.13, 0.21, 0.29, 0.37, 0.45, 0.53, 0.61, 0.69, 0.77, 0.85, 0.93].map(
  (t, i) => {
    const [nx, ny] = normal(t);
    const side = i % 2 ? -1 : 1;
    const reach = 28 + ((i * 5) % 3) * 10;
    const bend = (i % 3 === 0 ? 1 : -1) * 13;

    const rootX = x(t);
    const rootY = y(t);

    // Local: the root is the origin, so the tip is just the offset from it.
    const tipX = nx * side * reach + bend;
    const tipY = ny * side * reach;
    const cx = tipX * 0.45 + bend * 0.8;
    const cy = tipY * 0.55;

    const point = (u) => {
      const px = 2 * (1 - u) * u * cx + u * u * tipX;
      const py = 2 * (1 - u) * u * cy + u * u * tipY;
      const dx = 2 * (1 - u) * cx + 2 * u * (tipX - cx);
      const dy = 2 * (1 - u) * cy + 2 * u * (tipY - cy);
      const len = Math.hypot(dx, dy) || 1;
      return [px, py, -dy / len, dx / len];
    };

    // Three flowers along each twig, gathered towards the tip where blossom
    // actually sits, plus a bud beyond it for something still to come.
    const flowers = [0.98, 0.72, 0.46].map((u, k) => {
      const [px, py, pnx, pny] = point(u);
      const off = k === 1 ? 7 : k === 2 ? -6 : 0;
      return {
        at: [(px + pnx * off).toFixed(1), (py + pny * off).toFixed(1)],
        scale: (1.08 - k * 0.2 + ((i * 3) % 3) * 0.06).toFixed(2),
        turn: (i * 47 + k * 111) % 360,
        delay: (0.16 + k * 0.07).toFixed(2),
      };
    });

    return {
      t,
      root: [rootX.toFixed(1), rootY.toFixed(1)],
      d: taper(point, (u) => 3 - 2.45 * u, 12),
      flowers,
      bud: {
        cx: (tipX + side * 2).toFixed(1),
        cy: (tipY + side * 10).toFixed(1),
        r: (2.4 + ((i * 11) % 3) * 0.6).toFixed(1),
      },
    };
  },
);

/**
 * A few flowers sitting directly on the bough, in the gaps between twigs.
 *
 * Without these the blossom marches in step with the twigs, which gives the
 * whole length a rhythm no branch has.
 */
const BOUGH_FLOWERS = [0.09, 0.25, 0.41, 0.57, 0.73, 0.89].map((t, i) => {
  const [nx, ny] = normal(t);
  const side = i % 2 ? 1 : -1;
  return {
    t,
    at: [(x(t) + nx * side * 10).toFixed(1), (y(t) + ny * side * 10).toFixed(1)],
    scale: (0.6 + ((i * 5) % 3) * 0.08).toFixed(2),
    turn: (i * 113 + 90) % 360,
  };
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

        {/* The bough is there from the first frame - it is the timeline, and a
            timeline that grew as it went would have nothing to seek along. Only
            its colour arrives with the song. */}
        <path className="scrub__wood" d={BOUGH} />
        <path
          className="scrub__wood scrub__wood--warm"
          d={BOUGH}
          clipPath={`url(#bloomed-${uid})`}
        />

        {TWIGS.map((twig, i) => {
          const out = twig.t <= through;
          return (
            <g
              key={i}
              className={`scrub__twig ${out ? 'scrub__twig--out' : ''}`}
              style={{ '--rx': `${twig.root[0]}px`, '--ry': `${twig.root[1]}px` }}
            >
              <path className="scrub__wood scrub__wood--warm" d={twig.d} />

              <circle
                className="scrub__budtip"
                cx={twig.bud.cx}
                cy={twig.bud.cy}
                r={twig.bud.r}
              />

              {twig.flowers.map((bloom, k) => (
                <use
                  key={k}
                  className={`scrub__bud ${out ? 'scrub__bud--open' : ''}`}
                  href={`#${flower}`}
                  style={{ transitionDelay: out ? `${bloom.delay}s` : '0s' }}
                  transform={`translate(${bloom.at[0]} ${bloom.at[1]}) rotate(${bloom.turn}) scale(${bloom.scale})`}
                />
              ))}
            </g>
          );
        })}

        {BOUGH_FLOWERS.map((bloom, i) => (
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
