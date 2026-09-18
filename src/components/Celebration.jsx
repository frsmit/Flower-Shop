import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import useReducedMotion from '../hooks/useReducedMotion.js';

const PETAL_COLORS = ['#f4a0bb', '#e6a2dd', '#f9d38a', '#fbc9d8', '#a9c79c', '#fff3d6'];

/**
 * The greeting, which is the first thing on the day and the only one of these
 * sections that has to land in the first second.
 *
 * The confetti fires ONCE. It used to re-fire on a nine second interval for as
 * long as the tab was open, which is the same forever-animation this project
 * has had to undo twice already - and worse here than anywhere else, because
 * canvas-confetti runs its own full-screen canvas on the main thread directly
 * over the petal canvas, the plant and a page that re-renders every second.
 * Past the first volley it had also stopped meaning anything: confetti that
 * never stops is weather, not a celebration. She can have as much more of it
 * as she likes - that is what the button is for - but she has to ask.
 */
export default function Celebration({ name, title, message, onReadPoem, onOpenMusic }) {
  const reduced = useReducedMotion();
  const timers = useRef([]);

  const burst = useCallback(() => {
    if (reduced) return;
    const shared = { colors: PETAL_COLORS, disableForReducedMotion: true, scalar: 1.1 };

    confetti({ ...shared, particleCount: 110, spread: 84, origin: { y: 0.62 }, startVelocity: 48 });
    timers.current.push(
      window.setTimeout(
        () =>
          confetti({
            ...shared,
            particleCount: 60,
            angle: 60,
            spread: 66,
            origin: { x: 0, y: 0.7 },
          }),
        180,
      ),
      window.setTimeout(
        () =>
          confetti({
            ...shared,
            particleCount: 60,
            angle: 120,
            spread: 66,
            origin: { x: 1, y: 0.7 },
          }),
        320,
      ),
    );
  }, [reduced]);

  useEffect(() => {
    burst();
    // Only the pending volleys of the one burst - there is no repeat to cancel.
    const pending = timers.current;
    return () => {
      pending.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [burst]);

  return (
    <motion.section
      className="celebration"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      <motion.span
        className="celebration__eyebrow"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        the wait is over
      </motion.span>

      <motion.h1
        className="celebration__title"
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {title}
        <span className="celebration__name">{name}</span>
      </motion.h1>

      <motion.p
        className="celebration__message"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        {message}
      </motion.p>

      {/*
        One row, not a stack of three pills.
        Stacked, these read as a menu - three identical lozenges down the
        middle of the page, each shouting as loudly as her name. They are not
        the point of this screen; they are the ways out of it. So they sit on
        one quiet line under a hairline rule, in the order she is likely to
        want them: the poem she has been collecting for a month, then the
        songs, then the toy.
      */}
      <motion.div
        className="celebration__actions"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15, duration: 0.9 }}
      >
        {onReadPoem ? (
          <button type="button" className="celebration__link" onClick={onReadPoem}>
            <span aria-hidden="true">🦋</span> read the whole poem
          </button>
        ) : null}

        {onOpenMusic ? (
          <button type="button" className="celebration__link" onClick={onOpenMusic}>
            <span aria-hidden="true">💿</span> all ten songs
          </button>
        ) : null}

        <button type="button" className="celebration__link" onClick={burst}>
          <span aria-hidden="true">🌸</span> more petals
        </button>
      </motion.div>
    </motion.section>
  );
}
