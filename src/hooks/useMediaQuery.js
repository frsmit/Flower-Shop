import { useCallback, useSyncExternalStore } from 'react';

/**
 * A media query as React state.
 *
 * Why a JS query at all, when the stylesheet can already answer this: some of
 * these decisions change *what is rendered*, not how it looks. The lyrics are
 * either a panel in the column or a drawer over it, and rendering both and
 * hiding one with CSS would put two copies of the same words in the
 * accessibility tree and let a screen reader read the one nobody can see. So
 * the component has to know, not just the stylesheet.
 *
 * `useSyncExternalStore` rather than useState + useEffect, because that is
 * exactly what matchMedia is: an external store that changes on its own. The
 * hand-rolled version has a gap - the first render reads the query, and
 * anything that changes between then and the effect subscribing is missed, so
 * you end up re-reading inside the effect and calling setState during mount to
 * patch it. This has no gap to patch.
 *
 * useReducedMotion is deliberately left alone rather than rebuilt on top of
 * this: it has one fixed query and reads better saying so.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
    [query],
  );

  // Server snapshot: `false`, so anything gated on this renders its roomy
  // form. config.js is imported directly by the Express server, which puts
  // this hook one import away from a Node process with no `window`.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default useMediaQuery;
