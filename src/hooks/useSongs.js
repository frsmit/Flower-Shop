import { useEffect, useState } from 'react';
import { parseSongs } from '../lib/songs.js';

/**
 * Loads the song manifest at runtime rather than bundling it.
 *
 * Fetched, not imported, for two reasons that both matter. The audio files are
 * gitignored - they are commercial recordings and this repo has to be public
 * for Pages to serve it - so a build cannot depend on them being present.
 * And the manifest carries her lyrics, which is a lot of text nobody should be
 * shipping inside the JavaScript bundle to a visitor who never opens the
 * player.
 *
 * A missing manifest is a completely normal state, not an error: it is what
 * every build without the audio looks like, and it simply means no music tab.
 * Same discipline as useCelebrationConfig - the page is never allowed to depend
 * on a fetch succeeding.
 */
export function useSongs() {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    // Resolved against <base>, so this still works from a Pages subpath like
    // username.github.io/repo/ - the same reason vite.config.js sets base: './'.
    const url = new URL('songs/songs.json', document.baseURI);

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => setSongs(parseSongs(data)))
      .catch(() => {
        /* no manifest deployed: there is simply no music, which is fine */
      });

    return () => controller.abort();
  }, []);

  return songs;
}

export default useSongs;
