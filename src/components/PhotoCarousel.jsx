import { memo, useCallback, useEffect, useRef, useState } from 'react';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * The photographs, as the last thing before the flower bed.
 *
 * A carousel and not a grid, because these are not evidence to be scanned -
 * they are meant to be gone through one at a time, at the pace the rest of this
 * page moves at. A grid would put twelve thumbnails on screen and turn the last
 * beat of her birthday into a contact sheet.
 *
 * It is a track of full-width slides translated sideways, which means the only
 * thing that ever animates is a `transform` on one element: composited, no
 * repaint, and cheap enough to sit under the confetti a screen above it.
 */

// Long enough to actually look at a photograph, which is a good deal longer
// than a marketing carousel assumes.
const DWELL = 5500;

// A swipe, rather than a tap that drifted. Below this it is a tap.
const SWIPE = 40;

function PhotoCarousel({ photos, initialIndex = 0, onClose }) {
  const hostRef = useRef(null);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(initialIndex);

  /**
   * The furthest slide that has been reachable, which is what decides who has
   * a `src`.
   *
   * Every slide is in the DOM, and without this the day itself would open with
   * two dozen full-size photographs downloading at once - on a phone, on
   * mobile data, behind a page that is already fetching audio. It only ever
   * grows, so a photo that has loaded never loses its `src` and never has to
   * be fetched a second time on the way back.
   */
  const [reach, setReach] = useState(() => Math.max(1, initialIndex + 1));

  /**
   * Whether she has taken over. Autoplay is a suggestion for someone who has
   * not touched anything yet; the moment she does, it stops for good. A
   * carousel that keeps yanking the picture away from under the person
   * deliberately looking at it is the single worst thing this component could
   * do.
   */
  // Opened by tapping one photograph in particular, she is already steering:
  // advancing out from under the picture she asked for would be the rudest
  // possible reading of "autoplay".
  const [steered, setSteered] = useState(() => Boolean(onClose));

  // Started only once the bed of photographs is actually on screen. Mounted at
  // the bottom of a scrolling page, autoplay would otherwise have run through
  // the whole set while she was still reading the greeting two screens up.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  const last = photos.length - 1;

  const go = useCallback(
    (next, manual) => {
      const clamped = Math.max(0, Math.min(last, next));
      if (manual) setSteered(true);
      setIndex(clamped);
      // One ahead of wherever she has got to, so the next photograph is already
      // decoded by the time the track slides onto it.
      setReach((r) => Math.max(r, clamped + 1));
    },
    [last],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { threshold: 0.4 },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [visible]);

  /**
   * One timeout at a time, re-armed per slide - never an interval.
   *
   * It stops at the last photograph instead of wrapping. Looping would leave a
   * timer running behind the page for as long as she left the tab open, which
   * is the same forever-animation this project has had to undo twice already,
   * and it would also quietly destroy the ending: the set is in an order, and
   * the last one is supposed to be the last one.
   */
  useEffect(() => {
    if (!visible || steered || reduced || index >= last) return;
    const timer = window.setTimeout(() => go(index + 1, false), DWELL);
    return () => window.clearTimeout(timer);
  }, [visible, steered, reduced, index, last, go]);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowRight') go(index + 1, true);
      else if (event.key === 'ArrowLeft') go(index - 1, true);
      else if (event.key === 'Escape' && onClose) onClose();
      else return;
      event.preventDefault();
    },
    [go, index, onClose],
  );

  const touch = useRef(null);
  const onTouchStart = useCallback((event) => {
    touch.current = event.touches[0]?.clientX ?? null;
  }, []);
  const onTouchEnd = useCallback(
    (event) => {
      if (touch.current === null) return;
      const delta = (event.changedTouches[0]?.clientX ?? touch.current) - touch.current;
      touch.current = null;
      if (Math.abs(delta) < SWIPE) return;
      go(index + (delta < 0 ? 1 : -1), true);
    },
    [go, index],
  );

  const current = photos[index];

  return (
    <div
      ref={hostRef}
      className="reel"
      role="group"
      aria-roledescription="carousel"
      aria-label="photographs"
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="reel__frame">
        <div
          className={['reel__track', reduced ? 'is-instant' : ''].filter(Boolean).join(' ')}
          style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}
        >
          {photos.map((photo, i) => (
            <figure
              className="reel__slide"
              key={i}
              // Everything but the current photograph is off the accessibility
              // tree, so tabbing through does not read out every caption in
              // the set at once - the same rule the poem's butterflies follow.
              aria-hidden={i === index ? undefined : 'true'}
            >
              {i <= reach ? (
                // No loading="lazy" on purpose: `reach` above IS the
                // loading strategy, and the two work against each other.
                // Lazy defers until the image intersects the viewport, which
                // for a slide parked outside the frame's clip means it starts
                // downloading at the moment it slides in - the exact stall
                // `reach` exists to get ahead of.
                <img
                  className="reel__img"
                  src={photo.src}
                  alt={photo.alt}
                  decoding="async"
                  draggable="false"
                />
              ) : null}
            </figure>
          ))}
        </div>
      </div>

      {/* Outside the frame, so a long caption pushes nothing sideways and the
          photograph above it never changes size between slides. */}
      <p className="reel__caption" aria-live="polite">
        {current?.caption || '\u00a0'}
      </p>

      <div className="reel__row">
        <button
          type="button"
          className="reel__step"
          onClick={() => go(index - 1, true)}
          aria-disabled={index === 0 ? 'true' : undefined}
          aria-label="previous photograph"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <p className="reel__count">
          {index + 1} <span aria-hidden="true">/</span>
          <span className="visually-hidden"> of </span> {photos.length}
        </p>

        <button
          type="button"
          className="reel__step"
          onClick={() => go(index + 1, true)}
          aria-disabled={index === last ? 'true' : undefined}
          aria-label="next photograph"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
}

export default memo(PhotoCarousel);
