import { useEffect, useRef, useState } from 'react';
import { now as readClock } from '../lib/timeTravel.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export { SECOND, MINUTE, HOUR, DAY };

/**
 * The one ticking clock in the app. Everything else is derived from `now` with
 * pure functions, so no component has to read the wall clock during render.
 *
 * It re-reads the clock on every tick rather than counting down internally, so
 * a sleeping laptop or a throttled background tab can't make it drift.
 *
 * `readClock` is `Date.now()` plus the `?at=` preview offset, so moving the
 * clock moves the whole app - every derivation below is downstream of this one
 * reading, and none of them has to know that a preview is happening.
 */
export function useNow() {
  const [now, setNow] = useState(() => readClock());
  const timer = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      // While the tab is hidden the browser freezes rAF, so digit exit
      // animations never finish and their nodes would pile up for as long as
      // the page sits in a background tab. Nobody is watching, so hold still
      // and resync on the way back in.
      if (!document.hidden) setNow(readClock());
      // Re-align to the next whole second so the digits flip on the beat.
      timer.current = window.setTimeout(tick, SECOND - (readClock() % SECOND));
    };

    tick();
    const onVisible = () => !document.hidden && setNow(readClock());
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return now;
}

/** Breaks the time left until `target` into display units. */
export function getCountdownParts(target, now) {
  const remaining = Math.max(0, target - now);
  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / SECOND),
    remaining,
    isDone: remaining <= 0,
  };
}

/** How far along the year-long wait we are, anchored to the previous birthday. */
export function getYearProgress(target, now) {
  const previous = new Date(target);
  previous.setFullYear(previous.getFullYear() - 1);
  const span = target - previous.getTime();
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (now - previous.getTime()) / span));
}

export default useNow;
