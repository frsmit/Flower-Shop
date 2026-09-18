import { useEffect, useRef } from 'react';
import { activeLine } from '../lib/songs.js';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The words themselves - lit line by line where the song is timed, and a plain
 * sheet where it isn't.
 *
 * Shared by the panel in the column and the drawer over it, because they render
 * exactly the same thing and had already drifted into two copies of the same
 * `map`. Adding the highlight to both would have made that three.
 *
 * It renders a bare list of lines, no wrapper: its parent is the scroller, and
 * the scrolling is done by walking up to it from the lit line. That keeps this
 * component ignorant of which of the two containers it is inside, which is the
 * only reason one component can serve both.
 *
 * Where a song has no timings it renders the same markup with nothing lit, so
 * the five songs LRCLIB has no LRC for look like they always did rather than
 * looking broken next to the seven that follow along.
 */
export default function LyricLines({ lines, timed, elapsed }) {
  const reduced = useReducedMotion();
  const activeRef = useRef(null);

  const isTimed = Array.isArray(timed) && timed.length > 0;
  // Read off `timed` when it exists rather than off `lines`, so the index that
  // is lit and the line that is shown cannot disagree. They are the same array
  // in practice - `parseSongs` derives one from the other - but a hand-edited
  // manifest is allowed to carry both, and then they would not be.
  const shown = isTimed ? timed.map((line) => line.text) : lines;
  const active = isTimed ? activeLine(timed, elapsed) : -1;

  /*
   * Keep the lit line in the middle of whatever is scrolling.
   *
   * Measured through `getBoundingClientRect` rather than `offsetTop`, because
   * `offsetTop` is relative to the nearest positioned ancestor, and neither of
   * the two scrollers is positioned - the drawer's panel is. That put every
   * scroll out by the height of the drawer's head.
   *
   * Only ever scrolls the scroller: no `scrollIntoView`, which would also drag
   * the page behind the drawer.
   */
  useEffect(() => {
    const node = activeRef.current;
    const box = node?.parentElement;
    if (!node || !box) return;

    const line = node.getBoundingClientRect();
    const view = box.getBoundingClientRect();
    const delta = line.top + line.height / 2 - (view.top + view.height / 2);

    // A line already near the middle is left alone. Without this the sheet
    // creeps by a pixel or two on every timeupdate, which reads as a drift.
    if (Math.abs(delta) < 8) return;

    box.scrollTo({ top: box.scrollTop + delta, behavior: reduced ? 'auto' : 'smooth' });
  }, [active, reduced]);

  /*
   * Three states, not two: sung, being sung, and not yet.
   *
   * The line the song has reached is the only one marked, and everything behind
   * it reads as ordinary text - because those are the words she is most likely
   * to look back at, and dimming them to make the current line stand out
   * punishes exactly that. Only the words still ahead are held back, and they
   * arrive as the song crosses them rather than sitting greyed out waiting.
   *
   * They keep their space in the layout while they wait, so the sheet does not
   * reflow underneath the scroll as each one lands.
   */
  const state = (i) => {
    if (!isTimed) return '';
    if (i === active) return 'lyrics__line--now';
    return i < active ? 'lyrics__line--sung' : 'lyrics__line--ahead';
  };

  return shown.map((line, i) =>
    line.trim() === '' ? (
      <span key={i} className="lyrics__break" aria-hidden="true" />
    ) : (
      <p
        key={i}
        ref={i === active ? activeRef : null}
        className={`lyrics__line ${state(i)}`}
        // Where the song has got to, said out loud for anyone reading this with
        // their ears rather than their eyes.
        aria-current={i === active ? 'true' : undefined}
      >
        {line}
      </p>
    ),
  );
}
