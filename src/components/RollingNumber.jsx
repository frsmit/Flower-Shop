import { AnimatePresence, motion } from 'framer-motion';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * A short tween rather than a spring. A spring with any mass is still settling
 * several hundred ms later, so at one tick per second the tail of one roll
 * overlapped the start of the next - which is what read as chop.
 *
 * Transform and opacity only: animating `filter: blur()` repaints the element
 * every frame, and it sits inside a `backdrop-filter` tile, which made the
 * cheapest possible animation into one of the most expensive.
 */
const ROLL = { duration: 0.34, ease: [0.33, 1, 0.68, 1] };

/**
 * Renders a padded number where only the digits that actually changed animate,
 * so the seconds tick over without dragging the whole group with them.
 */
export default function RollingNumber({ value, pad = 2 }) {
  const reduced = useReducedMotion();
  const digits = String(Math.max(0, value)).padStart(pad, '0').split('');

  if (reduced) {
    return <span className="rolling">{digits.join('')}</span>;
  }

  return (
    <span className="rolling">
      {digits.map((digit, index) => (
        <span className="rolling__slot" key={`${index}-${digits.length}`}>
          {/* Default (sync) mode: the outgoing digit slides out while the new one
              slides in. `.rolling__digit` is already absolutely positioned, so
              popLayout's extra layout projection bought nothing. */}
          <AnimatePresence initial={false}>
            <motion.span
              key={digit}
              className="rolling__digit"
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={ROLL}
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
