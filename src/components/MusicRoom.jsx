import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { dayOfSong } from '../lib/songs.js';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * Ten for ten: the last ten days of the wait, one song each, on their own tab.
 *
 * A disc, a transport row and a lyric sheet under it - a record player and not
 * a playlist, because a list of ten filenames is a folder, and the point of
 * giving it its own tab was that it should feel like somewhere she went rather
 * than something the countdown grew.
 *
 * Playback state lives in useJukebox, up in App, so the song keeps going when
 * she wanders back to the garden. Only the playhead is local to this view: it
 * moves several times a second, and App already re-renders the whole page once
 * a second for the clock.
 */
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function MusicRoom({ songs, unlocked, jukebox, onBack }) {
  const { getAudio, index, song, playing, muted, blocked, toggle, toggleMuted, select } = jukebox;
  const reduced = useReducedMotion();

  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  // While she is dragging, the thumb has to follow her finger and not the
  // playhead, or the two fight over the same pixel.
  const scrubbing = useRef(false);

  // Subscribed to the element rather than lifted into App. A 4Hz timeupdate up
  // there would put the hedge, the drapes and every butterfly back downstream
  // of a timer - the exact thing the memoisation elsewhere exists to prevent.
  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;

    const onTime = () => {
      if (!scrubbing.current) setElapsed(audio.currentTime);
    };
    const onMeta = () => setDuration(audio.duration || 0);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    onMeta();

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
    };
  }, [getAudio, index]);

  const seek = useCallback(
    (event) => {
      const audio = getAudio();
      const value = Number(event.target.value);
      setElapsed(value);
      if (audio) audio.currentTime = value;
    },
    [getAudio],
  );

  const step = useCallback(
    (delta) => {
      if (!unlocked) return;
      // Wraps, so 'next' on the last song returns to the first instead of
      // dead-ending on a disabled button.
      select((index + delta + unlocked) % unlocked);
    },
    [index, unlocked, select],
  );

  const lyrics = song?.lyrics ?? [];
  // Not memoised: a dozen-odd string trims over one song's worth of lines is
  // cheaper than the dependency array needed to skip them, and `lyrics` is a
  // fresh array on every render anyway, so a memo here would never hit.
  const hasLyrics = lyrics.some((line) => line.trim() !== '');

  return (
    <motion.section
      className="music"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Ten for ten"
    >
      <header className="music__head">
        <button type="button" className="music__back" onClick={onBack}>
          <span aria-hidden="true">&larr;</span> the garden
        </button>
        <p className="music__eyebrow">
          <span aria-hidden="true">💿</span> ten for ten
        </p>
        <p className="music__count">
          {unlocked} of {songs.length}
        </p>
      </header>

      {/* Which day's song is which. Locked days are shown rather than hidden -
          the shape of what is still coming is half of what makes a countdown a
          countdown. */}
      <ol className="discs">
        {songs.map((entry, i) => {
          const open = i < unlocked;
          return (
            // Keyed by position, not by `src`. A day's identity here IS its
            // index - `dayOfSong(i)` is the whole numbering - and two entries
            // are allowed to point at the same file, which the bundled test
            // manifest does on purpose. Keyed by src, ten songs collapsed to
            // two keys and React warned on every render of the list.
            <li key={i}>
              <button
                type="button"
                className={`discs__day ${i === index && open ? 'discs__day--on' : ''}`}
                onClick={() => select(i)}
                disabled={!open}
                aria-current={i === index && open ? 'true' : undefined}
                title={
                  open ? `${entry.title}${entry.artist ? ` - ${entry.artist}` : ''}` : 'not yet'
                }
              >
                <span aria-hidden="true">{open ? dayOfSong(i) : '·'}</span>
                <span className="visually-hidden">
                  {open ? entry.title : `day ${dayOfSong(i)}, still to come`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="deck">
        {/* The disc spins only while sound is actually being produced, so it
            doubles as the honest answer to 'is this playing?' - which matters
            when the answer is 'yes, but muted'. */}
        <div
          className={`disc ${playing ? 'disc--spinning' : ''} ${reduced ? 'disc--still' : ''}`}
          aria-hidden="true"
        >
          {song?.cover ? (
            <img className="disc__art" src={song.cover} alt="" />
          ) : (
            <div className="disc__art disc__art--blank" />
          )}
          <div className="disc__sheen" />
          <div className="disc__hub" />
        </div>

        <div className="deck__meta">
          <h2 className="deck__title">{song?.title ?? 'nothing loaded'}</h2>
          {song?.artist ? <p className="deck__artist">{song.artist}</p> : null}
          {song?.note ? <p className="deck__note">{song.note}</p> : null}
        </div>

        <div className="deck__scrub">
          <span className="deck__time">{formatTime(elapsed)}</span>
          <input
            className="deck__range"
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={Math.min(elapsed, duration || 0)}
            onChange={seek}
            onPointerDown={() => {
              scrubbing.current = true;
            }}
            onPointerUp={() => {
              scrubbing.current = false;
            }}
            disabled={!song || !duration}
            aria-label="Position in the song"
          />
          <span className="deck__time">{formatTime(duration)}</span>
        </div>

        <div className="deck__transport">
          <button
            type="button"
            className="deck__key"
            onClick={() => step(-1)}
            disabled={unlocked < 2}
            aria-label="Previous song"
          >
            <span aria-hidden="true">&#9664;&#9664;</span>
          </button>

          <button
            type="button"
            className="deck__key deck__key--main"
            onClick={toggle}
            disabled={!song}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
          </button>

          <button
            type="button"
            className="deck__key"
            onClick={() => step(1)}
            disabled={unlocked < 2}
            aria-label="Next song"
          >
            <span aria-hidden="true">&#9654;&#9654;</span>
          </button>

          {/* The one control that turns silence into sound, so it gets to look
              like the important one. Muted on every visit, on purpose. */}
          <button
            type="button"
            className={`deck__mute ${muted ? 'deck__mute--off' : ''}`}
            onClick={toggleMuted}
            disabled={!song}
            aria-pressed={muted}
          >
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            {muted ? 'tap for sound' : 'sound on'}
          </button>
        </div>

        {blocked ? (
          <p className="deck__blocked" role="status">
            your browser is holding the sound back until you ask - tap play
          </p>
        ) : null}
      </div>

      <div className="lyrics">
        {hasLyrics ? (
          <div className="lyrics__sheet" tabIndex={0} aria-label="Lyrics">
            {lyrics.map((line, i) =>
              line.trim() === '' ? (
                <span key={i} className="lyrics__break" aria-hidden="true" />
              ) : (
                <p key={i} className="lyrics__line">
                  {line}
                </p>
              ),
            )}
          </div>
        ) : (
          <p className="lyrics__empty">no words typed up for this one yet &mdash; just the song</p>
        )}
      </div>
    </motion.section>
  );
}
