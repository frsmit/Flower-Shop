import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PATH_D, PATH_H, PATH_W } from '../lib/photoPath.js';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The photographs, streaming in from the left of the screen, rising as they
 * go, once around a loop, and away past the right-hand edge. Endlessly.
 *
 * The whole motion is one CSS `offset-path` animation per photograph, which
 * keeps it out of React entirely: no timer, no state, no re-render per frame
 * on a page whose clock already re-renders every second. Driving it from
 * JavaScript would have put a per-frame job on the same thread the seconds
 * tick on, which is the mistake the hedge and the progress ring both had to be
 * rescued from.
 *
 * It also stops when it is not being looked at - see `running` below. That is
 * the part that keeps it honest, because an endless loop is otherwise endless
 * work.
 *
 * They are evenly spread by giving each one a NEGATIVE animation delay, so
 * every photograph starts already partway along the curve. The stream is
 * therefore full from the first frame - nothing has to fill up first, and
 * there is no moment at the start where the page looks empty.
 *
 * Both ends of the path are off the visible area, so the wrap is never seen.
 */

// Seconds of travel per photograph, which fixes the GAP between them rather
// than the speed. Ten photographs and twenty photographs then look equally
// dense; the stream just takes longer to turn over.
const PER_PHOTO = 2.4;
const MIN_TRAVEL = 18;
const MAX_TRAVEL = 52;

// One photograph, in path-space units. Scaled with everything else.
const PHOTO = 110;

// The slice of the curve that is actually on screen, used only when motion is
// off and they have to be placed rather than travel.
const STILL_FROM = 14;
const STILL_TO = 88;

function PhotoTrail({ photos, onOpen }) {
  const hostRef = useRef(null);
  const reduced = useReducedMotion();

  // The path is authored at a fixed size and scaled to whatever width the page
  // has, so nothing in photoPath.js has to be a percentage.
  const [fit, setFit] = useState({ scale: 1, offsetY: 0 });

  /**
   * Whether the stream is on screen, and therefore whether it moves at all.
   *
   * Without this it ran from page load until the tab closed - through the
   * greeting, through the flower bed, through the letter, on a page whose
   * clock ticks every second and whose petals redraw at 30fps. Nothing about
   * a loop that nobody is looking at is worth a single frame. Unlike the
   * one-shot gates elsewhere in this project this one is two-way: it pauses
   * again on the way out.
   */
  // No IntersectionObserver means it simply always runs, and that is knowable
  // up front rather than in an effect that would have to start a second render
  // to correct itself - the same call the flower bed makes.
  const [running, setRunning] = useState(() => typeof IntersectionObserver === 'undefined');

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width) return;
      const scale = width / PATH_W;
      setFit({ scale, offsetY: (height - PATH_H * scale) / 2 });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => setRunning(entries.some((entry) => entry.isIntersecting)),
      // Any sliver of it showing is enough - a photograph half on screen still
      // has to be moving, or it visibly jerks into motion as she scrolls in.
      { threshold: 0 },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const count = photos.length;
  const travel = Math.min(MAX_TRAVEL, Math.max(MIN_TRAVEL, count * PER_PHOTO));

  return (
    <div ref={hostRef} className="trail" aria-label="photographs">
      <div
        className={['trail__stage', running ? 'is-running' : '', reduced ? 'is-still' : '']
          .filter(Boolean)
          .join(' ')}
        style={{
          '--trail-path': `path("${PATH_D}")`,
          '--trail-travel': `${travel}s`,
          '--trail-photo': `${PHOTO}px`,
          width: `${PATH_W}px`,
          height: `${PATH_H}px`,
          transform: `translateY(${fit.offsetY}px) scale(${fit.scale})`,
        }}
      >
        {photos.map((photo, i) => (
          <button
            type="button"
            className="trail__photo"
            key={i}
            onClick={() => onOpen(i)}
            style={{
              // Negative, so it begins already this far along instead of
              // waiting its turn at the start of the curve.
              '--trail-delay': `${(-(i * travel) / count).toFixed(2)}s`,
              // Where it simply sits when motion is off.
              '--trail-still': `${
                count === 1
                  ? (STILL_FROM + STILL_TO) / 2
                  : STILL_FROM + ((STILL_TO - STILL_FROM) * i) / (count - 1)
              }%`,
            }}
            aria-label={photo.caption || `photograph ${i + 1}`}
          >
            <span className="trail__inner">
              <img className="trail__img" src={photo.src} alt="" decoding="async" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(PhotoTrail);
