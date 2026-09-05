import { useCallback, useEffect, useState } from 'react';

/**
 * Which tab is showing, kept in the URL fragment.
 *
 * The fragment and not a path, because this deploys as a static site to a
 * subpath - there is no server to rewrite /music back to index.html, so a real
 * route would 404 on a refresh. A fragment costs nothing, survives reload,
 * makes the back button work, and lets a link point straight at the player.
 */
export function useHashView(fallback) {
  const read = useCallback(() => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    return raw || fallback;
  }, [fallback]);

  const [view, setView] = useState(read);

  useEffect(() => {
    const onChange = () => setView(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, [read]);

  const go = useCallback(
    (next) => {
      // The default view gets a clean URL rather than '#/garden'.
      window.location.hash = next === fallback ? '' : `/${next}`;
      setView(next);
    },
    [fallback],
  );

  return [view, go];
}

export default useHashView;
