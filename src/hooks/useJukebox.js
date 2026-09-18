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
  // Between asking for a song and hearing it. These files are 320kbps and
  // average eleven megabytes, so on anything but a fast connection that gap is
  // seconds long and sometimes much worse - long enough that a player which
  // does not admit to it looks broken.
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  // Set when the browser refuses playback, so the view can ask for a tap
  // instead of silently doing nothing.
  const [blocked, setBlocked] = useState(false);
  // Whether sound should follow her to the next song. A ref, not state: it is
  // read once by the effect that starts playback and must not cause a render.
  const wantsSound = useRef(false);

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

  /*
   * The element is the source of truth for whether sound is coming out; these
   * keep React's copy honest, including when something outside our controls
   * changes it (media keys, the OS, a headphone unplug).
   *
   * Driven by `playing` and not `play`, which is the whole bug this once had.
   * `play` fires the instant play() is *called* - before a single byte has
   * arrived - so switching to an eleven-megabyte song flipped the button
   * straight to a pause icon and then sat there silent while it buffered. The
   * button was claiming sound that would not exist for another half a minute,
   * and pressing it only paused a download. `playing` fires when audio is
   * actually being produced, which is the thing the button is supposed to mean.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaying = () => {
      setPlaying(true);
      setLoading(false);
      setBlocked(false);
    };
    // Ran out of buffer mid-song, or is fetching the start of a new one.
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onPause = () => {
      setPlaying(false);
      setLoading(false);
    };
    const onVolume = () => setMuted(audio.muted);

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    audio.addEventListener('volumechange', onVolume);

    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
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

    setLoading(true);
    audio.play().catch((error) => {
      setLoading(false);
      // Changing song while a play() is still in flight rejects the old one
      // with AbortError. That is this code doing its job, not the browser
      // refusing sound, and treating it as a refusal put a "tap play" notice
      // on screen every time she skipped a track.
      if (error?.name === 'AbortError') return;
      setBlocked(true);
    });
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

  /**
   * Switching songs carries her intent about sound, and nothing else.
   *
   * What it must NOT carry is the appearance of playing. The old version
   * called play() from inside a requestAnimationFrame, guessing that one frame
   * was long enough for React to have swapped the src - which is a race on a
   * good day, and does not fire at all in a background tab. Worse, it left
   * `playing` true across the swap, so the button showed pause for a song that
   * had not started and could not be started by pressing it.
   *
   * So: remember whether sound was wanted, say plainly that nothing is playing
   * yet, and let the effect below start the new song once its source is
   * actually attached.
   */
  const select = useCallback((next) => {
    const audio = audioRef.current;
    wantsSound.current = Boolean(audio && (!audio.paused || !audio.muted));
    setPlaying(false);
    setBlocked(false);
    setIndex(next);
  }, []);

  /*
   * Start the new song once its source is on the element.
   *
   * Keyed on the src rather than on a timer: this runs after React has
   * committed the swap, which is the thing the old rAF was trying to guess at.
   */
  const src = song?.src ?? null;

  useEffect(() => {
    if (!wantsSound.current || !src) return;
    wantsSound.current = false;
    play();
  }, [src, play]);

  return useMemo(
    () => ({
      attach,
      getAudio,
      index: safeIndex,
      song,
      playing,
      loading,
      muted,
      blocked,
      toggle,
      toggleMuted,
      select,
    }),
    [attach, getAudio, safeIndex, song, playing, loading, muted, blocked, toggle, toggleMuted, select],
  );
}

export default useJukebox;
