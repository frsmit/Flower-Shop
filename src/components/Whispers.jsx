import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const INTERVAL = 4200;

/**
 * The rotating one-liners above the timer - and, when a butterfly has been
 * picked, the line it was carrying.
 *
 * The poem borrows this slot rather than getting one of its own. The layout is
 * a single non-scrolling viewport, so a second block of text would have to
 * push something else off the screen; and this is already the place on the page
 * where a soft italic line appears and fades, which is exactly what a line of
 * the poem wants to do.
 */
function Whispers({ lines, override, overrideLabel }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Hold still while a line of the poem is being read - rotating a whisper in
    // over the top of it after four seconds would snatch it away mid-sentence.
    if (override || !lines?.length) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % lines.length),
      INTERVAL,
    );
    return () => window.clearInterval(id);
  }, [lines, override]);

  if (!override && !lines?.length) return null;

  return (
    <div className="whispers" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={override ? `poem:${overrideLabel}` : index}
          className={`whispers__line ${override ? 'whispers__line--poem' : ''}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {override ? (
            <>
              <span className="whispers__day">day {overrideLabel}</span>
              {override}
            </>
          ) : (
            lines[index]
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// Its own interval drives it; the app's clock has nothing to say to it.
export default memo(Whispers);
