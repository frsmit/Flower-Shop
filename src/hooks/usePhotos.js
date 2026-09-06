import { useEffect, useState } from 'react';
import { parsePhotos } from '../lib/photos.js';

/**
 * Loads the photo manifest at runtime rather than bundling it.
 *
 * Same reasoning as useSongs, and the same two halves of it. The images are
 * gitignored - they are pictures of her, and this repo has to be public for
 * Pages to serve the page - so the build cannot depend on them existing. And
 * the captions are hers, which is not something to ship inside the JavaScript
 * bundle to anybody who opens the site.
 *
 * A missing manifest is a completely normal state, not an error: it is what
 * every CI build looks like, and it simply means the birthday page ends on the
 * flower bed instead. Nothing is logged, because nothing went wrong.
 *
 * Called from BirthdayScroll and not from App, on purpose. The scroll mounts
 * only once the day has actually arrived, so nobody spends a month of visits
 * fetching a manifest for a screen they cannot reach yet.
 */
export function usePhotos() {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    // Resolved against <base>, so this still works from a Pages subpath like
    // username.github.io/repo/ - the same reason vite.config.js sets base: './'.
    const url = new URL('photos/photos.json', document.baseURI);

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => setPhotos(parsePhotos(data)))
      .catch(() => {
        /* no manifest deployed: there are simply no photographs, which is fine */
      });

    return () => controller.abort();
  }, []);

  return photos;
}

export default usePhotos;
