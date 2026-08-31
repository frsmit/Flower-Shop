import { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useReducedMotion from '../hooks/useReducedMotion.js';
import { butterflySpot, dayOfLine } from '../lib/poem.js';

/**
 * The butterflies. One per unlocked line of the poem, each settled on the
 * bougainvillea where it landed on the day it arrived.
 *
 * DOM and SVG rather than the canvas the petals use, because these have to be
 * *tappable* - a canvas would mean hand-rolling hit testing and would give
 * keyboard users nothing at all. At one node per unlocked line the count is
 * small enough that the DOM is the cheaper choice in every sense.
 */

// Pitched brighter than the drifting bracts so a butterfly reads as an arrival
// rather than as more of the plant.
const WINGS = [
  { light: '#f9bcd2', deep: '#d4547f', edge: '#8e3358' }, // rose
  { light: '#e7c6f0', deep: '#9a6cc6', edge: '#5f3f86' }, // lilac
  { light: '#fbdca7', deep: '#e0a44f', edge: '#a0662a' }, // gold
];

/**
 * Sized in the viewBox rather than in CSS so the whole thing scales as one
 * unit from a single `--bf-scale`.
 */
function Wing({ palette }) {
  const c = WINGS[palette] ?? WINGS[0];
  return (
    <>
      {/* Forewing: swept up and back, the way a resting butterfly holds it. */}
      <path
        d="M0 2 C 7 -11, 24 -16, 29 -7 C 32 -1, 24 6, 12 8 C 5 9, 1 6, 0 2 Z"
        fill={c.light}
        stroke={c.edge}
        strokeWidth="0.7"
        strokeOpacity="0.5"
      />
      {/* Hindwing: rounder, lower, a shade deeper. */}
      <path
        d="M1 4 C 10 6, 21 10, 20 18 C 19 24, 10 24, 5 18 C 2 14, 0 8, 1 4 Z"
        fill={c.deep}
        fillOpacity="0.85"
        stroke={c.edge}
        strokeWidth="0.6"
        strokeOpacity="0.45"
      />
      {/* The pale eyespots every one of these seems to be issued with. */}
      <circle cx="20" cy="-5" r="2.6" fill="#fff6fb" fillOpacity="0.85" />
      <circle cx="11" cy="15" r="1.7" fill="#fff6fb" fillOpacity="0.7" />
    </>
  );
}

function Butterfly({ index, line, read, active, onPick, reduced, delay }) {
  const spot = useMemo(() => butterflySpot(index), [index]);
  const day = dayOfLine(index);

  // A swoop rather than a straight slide: in from the side it will end up
  // nearest, dipping past its perch before settling back onto it.
  const fromX = spot.x > 50 ? 220 : -220;
  const flight = reduced
    ? { opacity: [0, 1], x: 0, y: 0, rotate: spot.tilt }
    : {
        opacity: [0, 1, 1],
        x: [fromX, fromX * 0.22, 0],
        y: [-90, 26, 0],
        rotate: [spot.tilt - 24, spot.tilt + 12, spot.tilt],
      };

  const style = {
    '--bf-x': spot.x,
    '--bf-y': spot.y,
    '--bf-scale': spot.scale,
    '--bf-tilt': `${spot.tilt}deg`,
    '--bf-flutter': `${spot.flutter}s`,
    '--bf-offset': `${spot.offset}s`,
  };

  return (
    <motion.button
      type="button"
      className={[
        'butterfly',
        `butterfly--${spot.zone}`,
        read ? 'butterfly--read' : 'butterfly--unread',
        active ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={() => onPick(index)}
      // The line itself stays off the accessibility tree until it's picked -
      // reading every one of them out on tab-through would give the whole poem
      // away in one go, which is the opposite of the point.
      aria-label={`Butterfly from day ${day}${read ? '' : ', not read yet'}`}
      aria-pressed={active}
      title={read ? line : undefined}
      initial={{ opacity: 0, x: fromX, y: -90 }}
      animate={flight}
      exit={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, y: -260, x: (spot.x - 50) * 3, rotate: spot.tilt + 40 }
      }
      transition={{
        duration: reduced ? 0.4 : 2.4,
        delay,
        ease: [0.22, 0.8, 0.28, 1],
        times: reduced ? undefined : [0, 0.55, 1],
      }}
      whileHover={reduced ? undefined : { scale: 1.18 }}
      whileTap={{ scale: 0.94 }}
    >
      <svg className="butterfly__svg" viewBox="-32 -20 64 48" aria-hidden="true">
        {/* Positioning transforms live on the attribute, the animated ones on a
            CSS class inside - a CSS transform on the same node would clobber
            the SVG attribute and fold both wings onto the body. */}
        <g transform="scale(-1 1)">
          <g className="butterfly__wing">
            <Wing palette={spot.palette} />
          </g>
        </g>
        <g className="butterfly__wing">
          <Wing palette={spot.palette} />
        </g>

        <ellipse cx="0" cy="3" rx="1.9" ry="10" fill="#59394b" />
        <circle cx="0" cy="-8" r="2.4" fill="#59394b" />
        <path
          d="M-0.8 -10 C -4 -15, -7 -16, -9 -18 M0.8 -10 C 4 -15, 7 -16, 9 -18"
          stroke="#59394b"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="butterfly__pip" aria-hidden="true" />
    </motion.button>
  );
}

const MemoButterfly = memo(Butterfly);

function ButterflyFlight({ poem, unlocked, readLines, activeIndex, onPick, departing }) {
  const reduced = useReducedMotion();

  // Newest first, so the one that arrived today is on top of the stack rather
  // than behind a month of its predecessors.
  const shown = departing ? [] : poem.slice(0, unlocked);

  return (
    <div className="flight" aria-hidden={departing ? 'true' : undefined}>
      <AnimatePresence>
        {shown.map((line, index) => (
          <MemoButterfly
            key={index}
            index={index}
            line={line}
            read={readLines.has(index)}
            active={activeIndex === index}
            onPick={onPick}
            reduced={reduced}
            // Only the first load staggers; a butterfly arriving on its own day
            // shouldn't wait behind the others. Capped so the last one isn't
            // still on its way in half a minute later.
            delay={Math.min(index * 0.14, 2.2)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default memo(ButterflyFlight);
