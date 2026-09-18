import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dayOfSong } from '../lib/songs.js';
import useReducedMotion from '../hooks/useReducedMotion.js';
import useMediaQuery from '../hooks/useMediaQuery.js';
import LyricsDrawer from './LyricsDrawer.jsx';
import LyricLines from './LyricLines.jsx';
import BlossomScrub from './BlossomScrub.jsx';

/**
 * When the lyrics stop fitting in the column and become a drawer instead.
 *
 * The same 640px the stylesheet already uses to start shrinking this view, so
 * the two agree by construction: below it the CSS was squeezing the lyric
 * panel towards nothing, and now the panel simply isn't rendered there.
 */
const CRAMPED = '(max-height: 640px)';

/**
 * Twelve for twelve: the last twelve days of the wait, one song each, on their
 * own tab.
 *
 * A disc, a transport row and a lyric sheet under it - a record player and not
 * a playlist, because a list of twelve filenames is a folder, and the point of
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
  const cramped = useMediaQuery(CRAMPED);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const openLyrics = useCallback(() => setLyricsOpen(true), []);
  const closeLyrics = useCallback(() => setLyricsOpen(false), []);

  /*
   * Forget an open drawer whenever the layout crosses the breakpoint.
   *
   * The render below is already guarded on `cramped`, so nothing is shown
   * twice without this - but the flag would survive a trip up past 640px and
   * back, and the drawer would then be open again on arrival without her
   * having asked. Adjusted during render rather than in an effect: this is
   * derived from a value that changed, not a subscription to anything, and
   * React re-runs the component before committing, so no extra paint.
   */
  const [wasCramped, setWasCramped] = useState(cramped);
  if (wasCramped !== cramped) {
    setWasCramped(cramped);
    setLyricsOpen(false);
  }

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

  const startScrub = useCallback(() => {
    scrubbing.current = true;
  }, []);

  const endScrub = useCallback(() => {
    scrubbing.current = false;
  }, []);

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
  const timed = song?.timed ?? [];
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
      aria-label="Twelve for twelve"
    >
      <header className="music__head">
        <button type="button" className="music__back" onClick={onBack}>
          <span aria-hidden="true">&larr;</span> the garden
        </button>
        <p className="music__eyebrow">
          <span aria-hidden="true">💿</span> twelve for twelve
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
            // manifest did on purpose. Keyed by src, ten songs collapsed to
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
          <BlossomScrub
            elapsed={elapsed}
            duration={duration}
            playing={playing}
            disabled={!song || !duration}
            onSeek={seek}
            onScrubStart={startScrub}
            onScrubEnd={endScrub}
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

      {/*
        Either a panel in the column or a drawer over it - never both, and
        never one of them merely hidden. Two copies of the same words would
        both be in the accessibility tree, and a screen reader would happily
        read the one nobody can see.
      */}
      {cramped ? (
        <button
          type="button"
          className="lyrics__peek"
          onClick={openLyrics}
          disabled={!hasLyrics}
          aria-haspopup="dialog"
          aria-expanded={lyricsOpen}
        >
          <span aria-hidden="true">↑</span>{' '}
          {hasLyrics ? 'the words' : 'no words for this one'}
        </button>
      ) : (
        <div className="lyrics">
          {hasLyrics ? (
            <div className="lyrics__sheet" tabIndex={0} aria-label="Lyrics">
              <LyricLines lines={lyrics} timed={timed} elapsed={elapsed} />
            </div>
          ) : (
            <p className="lyrics__empty">no words typed up for this one yet &mdash; just the song</p>
          )}
        </div>
      )}

      <AnimatePresence>
        {cramped && lyricsOpen && hasLyrics ? (
          <LyricsDrawer
            key="lyrics"
            title={song?.title ?? 'this one'}
            artist={song?.artist ?? ''}
            lines={lyrics}
            timed={timed}
            elapsed={elapsed}
            onClose={closeLyrics}
          />
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
