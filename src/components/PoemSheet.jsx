import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { dayOfLine } from '../lib/poem.js';

/**
 * The whole poem so far, as a sheet that rises over the page.
 *
 * A sheet and not a scrolling section, deliberately: the stage is a single
 * fixed viewport with the bougainvillea pinned to its corners and its bottom
 * edge. The moment the page itself scrolls the plant either slides away or
 * sits still while the text runs under it, and the frame stops reading as a
 * frame. So the page never scrolls - this does, inside itself.
 */
export default function PoemSheet({ poem, unlocked, readLines, onClose, onReadAll }) {
  const closeRef = useRef(null);
  // Snapshotted at mount, because the effect below marks everything read the
  // moment the sheet opens - read live, every 'new' tag would be gone before
  // the panel had finished sliding up, which is the one place she actually
  // wants to see which ones she'd missed.
  const [wasRead] = useState(() => readLines);
  const restoreTo = useRef(null);

  useEffect(() => {
    restoreTo.current = document.activeElement;
    closeRef.current?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      // Put focus back where she left it, or the next Tab starts from the top
      // of the document.
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus();
    };
  }, [onClose]);

  // Opening the sheet is reading them; nothing should still look unread after.
  useEffect(() => {
    onReadAll();
  }, [onReadAll]);

  const stop = useCallback((event) => event.stopPropagation(), []);

  return (
    <motion.div
      className="sheet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onClose}
    >
      <motion.div
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="The poem so far"
        onClick={stop}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="sheet__head">
          <p className="sheet__eyebrow">
            <span aria-hidden="true">🦋</span> the poem so far
          </p>
          <button ref={closeRef} type="button" className="sheet__close" onClick={onClose}>
            close
          </button>
        </div>

        <ol className="sheet__list">
          {poem.slice(0, unlocked).map((line, index) => (
            <li key={index} className="sheet__item">
              <span className="sheet__day">{dayOfLine(index)}</span>
              <span className="sheet__line">{line}</span>
              {wasRead.has(index) ? null : (
                <span className="sheet__new" aria-label="new">
                  new
                </span>
              )}
            </li>
          ))}

          {/* One row, not one per line. Listing each unwritten line separately
              filled the sheet with a dozen identical 'still on its way' rows -
              the length of the wait is worth showing, a wall of repetition
              isn't. */}
          {unlocked < poem.length ? (
            <li className="sheet__item sheet__rest">
              <span className="sheet__day" aria-hidden="true">
                ·
              </span>
              <span className="sheet__line">
                {poem.length - unlocked} more still on their way
              </span>
            </li>
          ) : null}
        </ol>

        <p className="sheet__foot">
          {unlocked} of {poem.length} ·{' '}
          {/* On the day itself there is no 'tomorrow' left to promise. */}
          {unlocked < poem.length ? 'one more each day' : 'all of it, finally'}
        </p>
      </motion.div>
    </motion.div>
  );
}
