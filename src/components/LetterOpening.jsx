import { useEffect } from 'react';
import { motion } from 'framer-motion';
import useReducedMotion from '../hooks/useReducedMotion.js';

const EASE = [0.16, 1, 0.3, 1];

/**
 * The choreography, in seconds. Read this as a timeline - every delay below is
 * one of these, so retiming the sequence means editing one object.
 */
const T = {
  sealLifts: 0.85,
  flapOpens: 1.3,
  sheetRises: 2.05,
  inkAppears: 2.9,
  envelopeFades: 3.3,
  done: 5.4,
};

export default function LetterOpening({ config, onDone }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    // Anyone who'd rather not watch it gets straight to the countdown.
    const timer = window.setTimeout(onDone, reduced ? 400 : T.done * 1000);
    return () => window.clearTimeout(timer);
  }, [onDone, reduced]);

  // With reduced motion there's no sequence at all - just the letter, briefly.
  const at = (seconds) => (reduced ? 0 : seconds);

  return (
    <motion.section
      className="letter"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="letter__stage">
        {/* The sheet sits behind the envelope and starts fully tucked inside, so
            it only becomes visible as it clears the pocket's top edge. It also
            starts transparent: the envelope is what should greet you, and any
            gap in its cover would show the letter early. */}
        <motion.div
          className="letter__sheet"
          initial={{ y: '0%', opacity: 0 }}
          animate={{ y: reduced ? '-46%' : ['0%', '0%', '-46%'], opacity: 1 }}
          transition={{
            y: {
              duration: reduced ? 0.01 : 1.6,
              times: [0, 0.01, 1],
              delay: at(T.sheetRises),
              ease: EASE,
            },
            opacity: { duration: 0.01, delay: at(T.flapOpens) },
          }}
        >
          <div className="letter__paper">
            <motion.p
              className="letter__opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: at(T.inkAppears) }}
            >
              {config.letterOpening}
            </motion.p>
            <motion.p
              className="letter__body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: at(T.inkAppears + 0.35) }}
            >
              {config.letterBody}
            </motion.p>
            <motion.p
              className="letter__signoff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: at(T.inkAppears + 0.8) }}
            >
              {config.letterSignoff}
            </motion.p>
          </div>
        </motion.div>

        {/* Two nested wrappers on purpose: the outer one owns the short entrance,
            the inner one the long delayed fade-out. Trying to express both as
            keyframes on one element forced the entrance to share the fade's
            duration, which made it drift in over four seconds. */}
        <motion.div
          className="letter__envelope"
          initial={{ y: 26, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: reduced ? 0.01 : 0.85, ease: EASE }}
        >
          <motion.div
            className="letter__envelopeSkin"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.85, delay: at(T.envelopeFades) }}
          >
            <div className="letter__pocket" />

            <motion.div
              className="letter__flap"
              initial={{ rotateX: 0 }}
              animate={{ rotateX: reduced ? -172 : [0, 0, -172] }}
              transition={{
                duration: reduced ? 0.01 : 1.05,
                times: [0, 0.01, 1],
                delay: at(T.flapOpens),
                ease: [0.5, 0, 0.3, 1],
              }}
            />

            <motion.div
              className="letter__seal"
              initial={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              animate={{
                opacity: reduced ? 0 : [1, 1, 0],
                scale: reduced ? 0.7 : [1, 1.08, 0.74],
                y: reduced ? 0 : [0, -7, 30],
                rotate: reduced ? 0 : [0, -5, 24],
              }}
              transition={{
                duration: reduced ? 0.01 : 0.7,
                times: [0, 0.35, 1],
                delay: at(T.sealLifts),
                ease: 'easeOut',
              }}
            />
          </motion.div>
        </motion.div>
      </div>

      {!reduced && (
        <motion.button
          type="button"
          className="letter__skip"
          onClick={onDone}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          skip
        </motion.button>
      )}
    </motion.section>
  );
}
