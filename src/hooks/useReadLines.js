import { useCallback, useState } from 'react';

const KEY = 'birthday-bloom:read-lines';

/**
 * Remembers which lines she has already opened, so an unread butterfly can look
 * different from one she has read.
 *
 * This is the thing that makes coming back daily legible: without it every
 * butterfly looks the same and there's no way to tell at a glance that today
 * brought a new one.
 *
 * Same try/catch discipline as useUnsealed - storage throws outright in some
 * privacy modes, and losing a bit of polish is a far better failure than a
 * page that won't render.
 */
export function useReadLines() {
  const [readLines, setReadLines] = useState(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter(Number.isInteger) : []);
    } catch {
      return new Set();
    }
  });

  const markRead = useCallback((index) => {
    setReadLines((current) => {
      if (current.has(index)) return current; // same Set: no re-render
      const next = new Set(current).add(index);
      try {
        window.localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* private mode: everything just stays looking unread */
      }
      return next;
    });
  }, []);

  return { readLines, markRead };
}

export default useReadLines;
