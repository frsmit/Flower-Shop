import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const KEY = 'birthday-bloom:jukebox';

/**
 * The one audio element, and the controls around it.
 *
 * It lives up in App and not inside the player view on purpose: the view
 * unmounts every time she goes back to the garden, and an <audio> that unmounts
 * stops playing. Hoisting it means the song carries on underneath the
 * countdown, which is the whole reason for having it on its own tab rather than
 * as a modal.
 *
 * Muted to start, always. An unasked-for song is a worse greeting than silence,
 * and browsers block unmuted autoplay anyway - so the mute button is doing two
 * jobs at once: it is the courtesy, and it is the user gesture that earns the
 * right to make sound at all.
 *
 * Deliberately does NOT track playback position. App re-renders every second
 * for the clock already; adding a four-times-a-second progress tick to it would
 * put the whole garden - hedge, drapes, butterflies - back in the path of a
 * timer, which is the exact mistake the memoisation elsewhere exists to undo.
 * The player view subscribes to the element for that itself.
 */
export function useJukebox(songs) {
  const audioRef = useRef(null);
  // Read once, lazily. Restoring it in an effect instead would setState during
  // mount and cascade a second render for something already known up front.
  const [index, setIndex] = useState(() => {
    try {
      const saved = Number(window.localStorage.getItem(KEY));
      return Number.isInteger(saved) && saved >= 0 ? saved : 0;
    } catch {
      return 0;
    }
  });
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  // Set when the browser refuses playback, so the view can ask for a tap
  // instead of silently doing nothing.
  const [blocked, setBlocked] = useState(false);

  /**
   * Clamped here rather than corrected in an effect. The manifest arrives after
   * mount, so a remembered index legitimately points past the end of an empty
   * list for a moment - and a saved index also has to survive the list getting
   * shorter as songs unlock in a different order than she last saw them.
   */
  const safeIndex = songs.length ? Math.min(index, songs.length - 1) : 0;
  // Named 'song' rather than 'current': this is a plain value on a plain
  // object, and calling it 'current' made every read of it look like a ref
  // being touched during render, to the linter and to anyone reading it.
  const song = songs[safeIndex] ?? null;

  // Where she left off, so a second visit on the same day doesn't open on song
  // one again. Only the index - never the mute state, which has to be a
  // deliberate choice every single time.
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, String(safeIndex));
    } catch {
      /* nothing worth breaking over */
    }
  }, [safeIndex]);

  // The element is the source of truth for whether sound is coming out; these
  // just keep React's copy honest, including when something outside our
  // controls changes it (media keys, the OS, a headphone unplug).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      setPlaying(true);
      setBlocked(false);
    };
    const onPause = () => setPlaying(false);
    const onVolume = () => setMuted(audio.muted);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    audio.addEventListener('volumechange', onVolume);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
      audio.removeEventListener('volumechange', onVolume);
    };
  }, [songs.length]);

  /**
   * A callback ref, so the element never leaves this hook. The view gets
   * `getAudio()` when it needs to subscribe to the element directly, which is
   * the only thing it was ever using the ref for.
   */
  const attach = useCallback((node) => {
    audioRef.current = node;
  }, []);

  const getAudio = useCallback(() => audioRef.current, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => setBlocked(true));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) play();
    else audio.pause();
  }, [play]);

  /**
   * The one control that turns silence into sound, so it is also the one that
   * has to start playback. Coming from a real tap, the browser allows both -
   * which is why unmuting and playing are the same gesture here rather than
   * two buttons she has to find in the right order.
   */
  const toggleMuted = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    if (!next && audio.paused) play();
  }, [play]);

  /** Switching songs keeps whatever she had chosen about sound. */
  const select = useCallback(
    (next) => {
      setIndex(next);
      const audio = audioRef.current;
      if (!audio) return;
      // The src swap is driven by render; wait for it before asking to play.
      requestAnimationFrame(() => {
        if (!audio.muted || !audio.paused) play();
      });
    },
    [play],
  );

  return useMemo(
    () => ({
      attach,
      getAudio,
      index: safeIndex,
      song,
      playing,
      muted,
      blocked,
      toggle,
      toggleMuted,
      select,
    }),
    [attach, getAudio, safeIndex, song, playing, muted, blocked, toggle, toggleMuted, select],
  );
}

export default useJukebox;
