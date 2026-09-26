import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The wish, on a sheet of paper, a word at a time.
 *
 * The very last thing on the day, and the only thing on its screen - so it is
 * allowed to be slow. Everything above it either arrives at once or arrives
 * while she is doing something else; this waits until she has scrolled to it
 * and then gives her the sentence at about the speed it would be said out
 * loud.
 *
 * A4, and plain. The sheet is a real 210:297, sized so a whole page fits the
 * window without scrolling, and the only thing making it look like paper is a
 * warm white and the shadow it casts. No texture image, no filter: this screen
 * comes after a canvas of petals, a plant of several thousand SVG nodes and a
 * loop of photographs that never stops, and the last thing it should do is ask
 * for more.
 *
 * The words animate transform and opacity only. Blur is the obvious reach for
 * ink appearing and it is exactly what the rolling digits had to have taken
 * away from them: `filter: blur()` repaints on every frame it animates over.
 */

// The most the whole sentence may take to arrive. A long wish tightens its
// step rather than outstaying its welcome; a short one keeps the slow pace.
const LONGEST = 7.5;
const STEP = 0.3;

export default memo(function WishLetter({ wish }) {
  const hostRef = useRef(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(() => typeof IntersectionObserver === 'undefined');

  // Paragraphs on blank lines, lines within them on single newlines, words
  // within those. Splitting on all whitespace at once ran a whole letter
  // together into one block. `index` keeps counting across the breaks so the
  // words still arrive as one sentence-paced run.
  const paragraphs = useMemo(() => {
    let index = 0;
    return String(wish ?? '')
      .trim()
      .split(/\n\s*\n/)
      .map((para) =>
        para
          .split('\n')
          .map((line) =>
            line
              .split(/\s+/)
              .filter(Boolean)
              .map((word) => ({ word, index: index++ })),
          )
          .filter((line) => line.length),
      )
      .filter((para) => para.length);
  }, [wish]);
  const count = paragraphs.flat(2).length;
  const step = count ? Math.min(STEP, LONGEST / count) : STEP;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setOpen(true);
      },
      { threshold: 0.45 },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [open]);

  if (!count) return null;

  return (
    <article
      ref={hostRef}
      className={[
        'wish',
        // More than one line is a letter, not a wish: set left, like one.
        paragraphs.length > 1 || paragraphs[0].length > 1 ? 'is-letter' : '',
        open ? 'is-open' : '',
        reduced ? 'is-instant' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {paragraphs.map((lines, p) => (
        <p className="wish__text" key={p}>
          {lines.map((words, l) => (
            <Fragment key={l}>
              {l > 0 ? <br /> : null}
              {words.map(({ word, index }, i) => (
                <Fragment key={index}>
                  <span
                    className="wish__word"
                    style={{ '--word-delay': `${(index * step).toFixed(2)}s` }}
                  >
                    {word}
                  </span>
            {/* Outside the span, deliberately. Each word is an inline-block so
                it can be moved on its own, and an inline-block trims the
                whitespace inside its own box - with the space in there the
                whole wish rendered as one unbroken run of letters. Out here it
                is a text node in the paragraph's own inline formatting
                context, so it survives, and the sentence still copies and
                pastes with its spaces intact. */}
                  {i < words.length - 1 ? ' ' : null}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </p>
      ))}
    </article>
  );
});
