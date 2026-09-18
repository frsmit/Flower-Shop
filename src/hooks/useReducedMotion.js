import { useEffect, useState, useSyncExternalStore } from 'react';
import { isStill, subscribe } from '../lib/stillness.js';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether this page should hold still - for either of the two reasons it might.
 *
 * The OS preference and the page's own "hold still" button are merged here, at
 * the one place every component already asks, so that nothing downstream has to
 * learn there are two sources. Either one being on means the same thing to a
 * caller: do not animate this.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (event) => setReduced(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const still = useSyncExternalStore(subscribe, isStill, () => false);

  return reduced || still;
}

export default useReducedMotion;
