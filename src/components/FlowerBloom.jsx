import { memo, useEffect, useRef, useState } from 'react';
import { BED, BED_H, BED_W, LEAF_PATH, petalPath } from '../lib/flowers.js';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The bed, opening one flower at a time.
 *
 * Every bloom here is a CSS animation with a computed `animation-delay`, not a
 * spring and not a timer. Three reasons, in the order they mattered:
 *
 *   1. It is one-shot. `forwards` holds the last frame and the animation is
 *      over - nothing is left running behind the rest of the page, which is
 *      exactly the failure the swaying hedge was.
 *   2. There are around two hundred petals. Handing each one to framer-motion
 *      would mean two hundred spring integrations on the main thread; as CSS
 *      they are the compositor's problem and never touch React again.
 *   3. The stagger is a number, and a number can be computed once in
 *      `flowers.js` and read straight out of a custom property.
 *
 * It waits to be looked at. Started on mount, the whole bed would have opened
 * and finished while she was still reading the greeting a screen above it.
 */

/**
 * Petals carry two transforms that must not fight: the rotation that puts them
 * round the clock face, and the scale that opens them.
 *
 * The rotation goes on a `transform` *attribute* and the scale on a CSS class
 * inside it, on separate nodes. A CSS transform on the same node overwrites the
 * attribute outright - the identical trap the butterflies' wings are wrapped
 * against, and it fails the same way: every petal folds onto the centre.
 */
function Flower({ flower, index }) {
  const { species, color } = flower;
  let petalIndex = 0;

  return (
    <g
      className="bloom"
      style={{
        '--bloom-delay': `${flower.delay}s`,
        color,
      }}
      transform={
        `translate(${flower.x} ${flower.y}) ` +
        `rotate(${flower.tilt}) scale(${flower.scale})`
      }
    >
      {/* pathLength="1" normalises the dash to the path's own length, so the
          draw-on works without measuring anything in JavaScript. */}
      <path
        className="bloom__stem"
        d={species.stem}
        pathLength="1"
        fill="none"
        stroke="#7e9a68"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {species.leaves.map((leaf, i) => (
        <g key={`leaf-${i}`} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.spin})`}>
          <g className="bloom__leaf" style={{ '--leaf-index': i }}>
            <path d={LEAF_PATH} fill="#7e9a68" transform={`scale(${leaf.scale})`} />
          </g>
        </g>
      ))}

      <g transform={`translate(0 ${species.head})`}>
        {species.rings.map((ring, r) =>
          Array.from({ length: ring.count }, (_, p) => {
            // One running index across every ring, so the outer ring finishes
            // opening before the inner one starts and a rose builds up from
            // the outside in.
            const order = petalIndex++;
            const spread = ring.arc / (ring.arc === 360 ? ring.count : Math.max(1, ring.count - 1));
            const angle = ring.offset + p * spread;

            return (
              <g key={`p-${r}-${p}`} transform={`rotate(${angle}) scale(${ring.scale})`}>
                <path
                  className="bloom__petal"
                  style={{ '--petal-index': order }}
                  d={petalPath(ring.petal)}
                  fill="currentColor"
                  stroke="rgba(140, 70, 100, 0.18)"
                  strokeWidth="0.5"
                />
              </g>
            );
          }),
        )}

        {species.eye ? (
          <circle
            className="bloom__eye"
            style={{ '--petal-index': petalIndex }}
            r={species.eye.r}
            fill={species.eye.fill}
          />
        ) : null}
      </g>

      {/* Only here to keep the linter honest about `index` being the stable
          identity of this flower rather than its position on screen. */}
      <title>{`${species.name} ${index + 1}`}</title>
    </g>
  );
}

const MemoFlower = memo(Flower);

function FlowerBloom({ title }) {
  const hostRef = useRef(null);
  const reduced = useReducedMotion();
  // No IntersectionObserver is not a reason to show her an empty field, and
  // that is knowable up front rather than in an effect that would then have to
  // start a second render to correct itself.
  const [open, setOpen] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const host = hostRef.current;
    if (!host || open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // A third of the bed on screen. Any less and the far end opens off the
        // bottom edge where she never sees it happen.
        if (entries.some((entry) => entry.isIntersecting)) setOpen(true);
      },
      { threshold: 0.3 },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [open]);

  return (
    <div
      ref={hostRef}
      className={['bloom-bed', open ? 'is-open' : '', reduced ? 'is-instant' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        className="bloom-bed__svg"
        viewBox={`0 0 ${BED_W} ${BED_H}`}
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        {BED.map((flower, i) => (
          <MemoFlower key={i} flower={flower} index={i} />
        ))}
      </svg>

      <p className="bloom-bed__line">{title}</p>
    </div>
  );
}

export default memo(FlowerBloom);
