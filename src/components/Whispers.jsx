import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const INTERVAL = 4200;

function Whispers({ lines }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!lines?.length) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % lines.length),
      INTERVAL,
    );
    return () => window.clearInterval(id);
  }, [lines]);

  if (!lines?.length) return null;

  return (
    <div className="whispers" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          className="whispers__line"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {lines[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// Its own interval drives it; the app's clock has nothing to say to it.
export default memo(Whispers);
