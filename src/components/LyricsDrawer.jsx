import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import LyricLines from './LyricLines.jsx';

/**
 * The words to the song playing, as a drawer pulled up over the player.
 *
 * Why a drawer and not lyrics in the column: on a short screen there is no
 * column left. The player is a flex stack - head, the ten day-discs, the disc
 * itself, title, scrubber, transport - and the lyric panel takes whatever
 * those leave, capped at 26vh. On a 740x360 phone held sideways that share
 * rounds to nothing, so the words were simply gone, and the transport ended up
 * against the bottom edge of the screen. Taking the lyrics out of the flow
 * entirely is the fix: the stack no longer has to find room for them, and they
 * get the whole width and most of the height when she asks for them.
 *
 * Why not the other idea - flipping the disc over like a Spotify album card:
 * that artwork is a *spinning circle*. A flip reads as a flat card turning, so
 * it fights a record that is already rotating, and a circle is a poor box for
 * text - the corners it hasn't got are exactly where the long lines would go.
 * Worse, the disc shrinks to 6rem on the very screens this is meant to rescue,
 * which is where lyrics would need the most space, not the least.
 *
 * Deliberately the same object as the poem sheet - backdrop, panel rising from
 * the bottom, close pill, Escape, click-outside, focus returned where it was.
 * She learns that gesture once, on the poem, a month before she gets here.
 */
export default function LyricsDrawer({ title, artist, lines, timed, elapsed, onClose }) {
  const closeRef = useRef(null);
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
      // Back to the button that opened it, or the next Tab starts from the top
      // of the document.
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus();
    };
  }, [onClose]);

  const stop = useCallback((event) => event.stopPropagation(), []);

  return (
    <motion.div
      className="drawer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      <motion.div
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Lyrics: ${title}`}
        onClick={stop}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Purely the affordance - the thing that says this came up from the
            bottom and can go back down. The button next to it is what actually
            closes it, because a 4px bar is not a tap target. */}
        <span className="drawer__grip" aria-hidden="true" />

        <div className="drawer__head">
          <p className="drawer__title">
            {title}
            {artist ? <span className="drawer__artist">{artist}</span> : null}
          </p>
          <button ref={closeRef} type="button" className="sheet__close" onClick={onClose}>
            close
          </button>
        </div>

        <div className="drawer__body" tabIndex={0} aria-label="Lyrics">
          <LyricLines lines={lines} timed={timed} elapsed={elapsed} />
        </div>
      </motion.div>
    </motion.div>
  );
}
