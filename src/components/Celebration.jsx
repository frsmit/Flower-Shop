import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import useReducedMotion from '../hooks/useReducedMotion.js';

const PETAL_COLORS = ['#f4a0bb', '#e6a2dd', '#f9d38a', '#fbc9d8', '#a9c79c', '#fff3d6'];

export default function Celebration({ name, title, message }) {
  const reduced = useReducedMotion();
  const timers = useRef([]);

  const burst = useCallback(() => {
    if (reduced) return;
    const shared = { colors: PETAL_COLORS, disableForReducedMotion: true, scalar: 1.1 };

    confetti({ ...shared, particleCount: 90, spread: 78, origin: { y: 0.62 }, startVelocity: 46 });
    timers.current.push(
      window.setTimeout(
        () =>
          confetti({
            ...shared,
            particleCount: 55,
            angle: 60,
            spread: 62,
            origin: { x: 0, y: 0.7 },
          }),
        180,
      ),
      window.setTimeout(
        () =>
          confetti({
            ...shared,
            particleCount: 55,
            angle: 120,
            spread: 62,
            origin: { x: 1, y: 0.7 },
          }),
        320,
      ),
    );
  }, [reduced]);

  useEffect(() => {
    burst();
    const encore = window.setInterval(burst, 9000);
    return () => {
      window.clearInterval(encore);
      timers.current.forEach(window.clearTimeout);
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

      <motion.button
        type="button"
        className="celebration__again"
        onClick={burst}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.8 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        throw more petals
      </motion.button>
    </motion.section>
  );
}
