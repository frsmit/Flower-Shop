import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PATH_H, PATH_W, placeAlong } from '../lib/photoPath.js';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The photographs, threaded along a curve that loops back through itself.
 *
 * A string of pictures rather than a row of them: they come up from the bottom
 * left, go once round a loop in the middle and leave to the right, each one
 * turned to sit square on the curve where it lands. The point is that the set
 * reads as one continuous thing you follow, which a grid or a filmstrip does
 * not.
 *
 * Every position comes from lib/photoPath.js, which is pure geometry - this
 * component only scales what that returns into whatever width the page has,
 * and handles the one thing geometry cannot: which photograph she has picked.
 *
 * They arrive in order along the curve rather than all at once, on computed
 * CSS delays. Same reasoning as the flower bed: it is one-shot, `forwards`
 * holds the last frame, and nothing is left running afterwards. It also does
 * the work of showing that these are a sequence and not a scatter.
 */

// The step between one photograph arriving and the next.
const STAGGER = 0.085;

// How wide one photograph is, as a fraction of the curve's own coordinate
// space. Small on purpose: the trail is a shape made of pictures, and the
// picture itself is read after she taps one.
const PHOTO = 0.082;

function PhotoTrail({ photos, onOpen }) {
  const hostRef = useRef(null);
  const reduced = useReducedMotion();

  // Knowable up front rather than in an effect that would then need a second
  // render to correct itself - the same call the flower bed makes.
  const [open, setOpen] = useState(() => typeof IntersectionObserver === 'undefined');

  const spots = useMemo(() => placeAlong(photos.length), [photos.length]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setOpen(true);
      },
      // Lower than the flower bed's. The trail is wide and short, so a third
      // of it is a lot of scrolling; by then the first few would already have
      // arrived off the top of her screen.
      { threshold: 0.25 },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [open]);

  const pick = useCallback((index) => onOpen(index), [onOpen]);

  return (
    <div
      ref={hostRef}
      className={['trail', open ? 'is-open' : '', reduced ? 'is-instant' : '']
        .filter(Boolean)
        .join(' ')}
      style={{ '--trail-ratio': `${PATH_W} / ${PATH_H}` }}
    >
      {photos.map((photo, i) => {
        const spot = spots[i];
        if (!spot) return null;

        return (
          <button
            type="button"
            className="trail__photo"
            key={i}
            onClick={() => pick(i)}
            style={{
              left: `${(spot.x / PATH_W) * 100}%`,
              top: `${(spot.y / PATH_H) * 100}%`,
              width: `${PHOTO * 100}%`,
              // Two transforms that must not be allowed to fight: the one that
              // puts the photograph on the curve, and the one that opens it.
              // The placement lives here and the entrance is a CSS animation
              // on a child, on separate nodes - the same trap the flower bed's
              // petals and the butterflies' wings are both wrapped against.
              transform: `translate(-50%, -50%) rotate(${spot.angle + spot.lean}deg)`,
              '--trail-delay': `${(i * STAGGER).toFixed(3)}s`,
            }}
            aria-label={photo.caption || `photograph ${i + 1}`}
          >
            <span className="trail__inner">
              <img className="trail__img" src={photo.src} alt="" decoding="async" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(PhotoTrail);
