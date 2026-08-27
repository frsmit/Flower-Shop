import { useEffect, useState } from 'react';
import { defaultConfig } from '../config.js';

/**
 * Pulls the celebration settings from the Node server so the date, the name and
 * the messages can change without a rebuild. Falls back to the bundled config
 * when the API isn't running (e.g. plain `vite build` + static hosting).
 */
export function useCelebrationConfig() {
  const [config, setConfig] = useState(defaultConfig);
  const [source, setSource] = useState('bundled');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/celebration', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => {
        setConfig({ ...defaultConfig, ...data });
        setSource('server');
      })
      .catch(() => {
        /* offline or static build: the bundled defaults are already in place */
      });

    return () => controller.abort();
  }, []);

  return { config, source };
}

export default useCelebrationConfig;
