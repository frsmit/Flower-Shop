import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PetalField from './components/PetalField.jsx';
import Countdown from './components/Countdown.jsx';
import BloomProgress from './components/BloomProgress.jsx';
import Whispers from './components/Whispers.jsx';
import Bougainvillea from './components/Bougainvillea.jsx';
import BirthdayScroll from './components/BirthdayScroll.jsx';
import Gate from './components/Gate.jsx';
import LetterOpening from './components/LetterOpening.jsx';
import ButterflyFlight from './components/ButterflyFlight.jsx';
import PoemSheet from './components/PoemSheet.jsx';
import MusicRoom from './components/MusicRoom.jsx';
import StillnessToggle from './components/StillnessToggle.jsx';
import {
  HOUR,
  getCountdownParts,
  getYearProgress,
  useNow,
} from './hooks/useCountdown.js';
import useCelebrationConfig from './hooks/useCelebrationConfig.js';
import useUnsealed from './hooks/useUnsealed.js';
import useReadLines from './hooks/useReadLines.js';
import { dayOfLine, unlockedCount } from './lib/poem.js';
import { songsUnlocked } from './lib/songs.js';
import useSongs from './hooks/useSongs.js';
import useJukebox from './hooks/useJukebox.js';
import useHashView from './hooks/useHashView.js';
import { previewing } from './lib/timeTravel.js';

function nextYear(timestamp) {
  const date = new Date(timestamp);
  date.setFullYear(date.getFullYear() + 1);
  return date.getTime();
}

const DATE_FORMAT = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

// How long a picked line stays up before the whispers resume.
const LINE_DWELL = 11000;

// Built once at module scope. Only the preview badge uses it, and only when the
// clock has been moved - but it would otherwise be rebuilt every second.
const PREVIEW_CLOCK = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export default function App() {
  const { config } = useCelebrationConfig();

  const now = useNow();

  // 'sealed' -> 'opening' -> 'open'. The letter plays once, on the visit where
  // the word is given; after that she lands straight on the countdown.
  const { unsealed, remember } = useUnsealed(Boolean(config.secretHash));
  const [phase, setPhase] = useState(unsealed ? 'open' : 'sealed');

  const handleUnsealed = useCallback(() => {
    remember();
    setPhase('opening');
  }, [remember]);

  const handleLetterDone = useCallback(() => setPhase('open'), []);

  /**
   * If the birthday has already been and gone (past the celebration window),
   * roll the target forward a year so the garden keeps growing instead of
   * sitting at zero forever. Derived from the ticking clock, so a page left
   * open across midnight moves on by itself.
   */
  const { base, windowMs } = useMemo(
    () => ({
      base: new Date(config.targetDate).getTime(),
      windowMs: (config.celebrationWindowHours ?? 24) * HOUR,
    }),
    [config.targetDate, config.celebrationWindowHours],
  );

  const celebrating = now >= base && now < base + windowMs;
  // Past the window, aim at next year's date so the numbers keep meaning something.
  const target = now < base + windowMs ? base : nextYear(base);

  /**
   * Whether the poem is hers in full. Anchored to `base` and not to `target`,
   * because `target` rolls forward a year the moment the celebration window
   * closes - and a poem scheduled against next year's date counts back to
   * nothing, which took the whole month's worth of lines away again the morning
   * after her birthday. Once the day has come, it stays come.
   */
  const poemComplete = now >= base;

  const { days, hours, minutes, seconds } = getCountdownParts(target, now);
  // Quantised on purpose. The raw value changes every second, which made
  // framer-motion restart the ring's 2.4s animation on every tick for a change
  // far too small to see. At 1/2000 the bucket moves about every four hours.
  const progress = Math.round(getYearProgress(target, now) * 2000) / 2000;

  // ---- the poem ----------------------------------------------------------
  const poem = config.poem ?? [];
  // An integer that only moves at a day boundary, so the second-by-second tick
  // above can't reach the butterflies. Everything below is memoised on this:
  // re-rendering ~28 SVGs once a second is exactly the mistake the
  // bougainvillea already had to be rescued from.
  const unlocked = unlockedCount(target, now, poem.length, poemComplete);

  // ---- twelve for twelve -------------------------------------------------------
  // The last twelve days get a song each, on their own tab. The manifest is
  // fetched at runtime and is very often simply absent - no manifest means no
  // music and no tab, which is what every build without the audio looks like.
  const songs = useSongs();
  const songsOpen = songsUnlocked(target, now, songs.length, poemComplete);
  const jukebox = useJukebox(songs.slice(0, songsOpen));
  // Pulled out rather than read as `jukebox.attach` at the ref site: handing a
  // member of an object straight to ref={} makes the whole object read as a
  // ref, both to the linter and to the next person to open this file.
  const { attach, song: loaded, muted: soundOff, playing: sounding } = jukebox;

  const [view, goView] = useHashView('garden');
  // Deep-linking to the player before it exists shouldn't strand her on an
  // empty screen, so the guard lives here rather than in the router.
  const musicOpen = view === 'music' && phase === 'open' && songsOpen > 0;
  const openMusic = useCallback(() => goView('music'), [goView]);
  const closeMusic = useCallback(() => goView('garden'), [goView]);

  const { readLines, markRead } = useReadLines();
  const [activeIndex, setActiveIndex] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const dwell = useRef(0);

  const pickLine = useCallback(
    (index) => {
      setActiveIndex((current) => (current === index ? null : index));
      markRead(index);
    },
    [markRead],
  );

  // Let the line go by itself, so she isn't left with one stuck on screen and
  // no obvious way to dismiss it.
  useEffect(() => {
    if (activeIndex === null) return;
    dwell.current = window.setTimeout(() => setActiveIndex(null), LINE_DWELL);
    return () => window.clearTimeout(dwell.current);
  }, [activeIndex]);

  const openSheet = useCallback(() => {
    setActiveIndex(null);
    setSheetOpen(true);
  }, []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const markAllRead = useCallback(() => {
    for (let i = 0; i < unlocked; i += 1) markRead(i);
  }, [unlocked, markRead]);

  const unread = useMemo(() => {
    let count = 0;
    for (let i = 0; i < unlocked; i += 1) if (!readLines.has(i)) count += 1;
    return count;
  }, [unlocked, readLines]);

  // Keyed on the timestamp rather than a Date object, so the formatter isn't
  // rebuilt on every tick.
  const prettyDate = useMemo(
    () => new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(new Date(target)),
    [target],
  );

  return (
    // `app--scroll` is what lets the birthday page be taller than the window.
    // Every other screen is deliberately capped at one viewport, so the cap
    // comes off only while the one screen that scrolls is mounted.
    <div
      className={['app', celebrating ? 'app--celebrating app--scroll' : ''].filter(Boolean).join(' ')}
    >
      <div className="app__wash" aria-hidden="true" />
      <div className="app__glow app__glow--one" aria-hidden="true" />
      <div className="app__glow app__glow--two" aria-hidden="true" />
      {/* Outside the stage, so it survives her switching tabs. An <audio>
          that unmounts stops playing, and the whole reason the player has its
          own tab is that the song should follow her back to the garden.
          `muted` is bound to state that starts true every single visit. */}
      {loaded ? (
        <audio ref={attach} src={loaded.src} muted={soundOff} preload="metadata" />
      ) : null}

      {/* Thinner on the day, not thicker. The celebration screen is the one
          place the petals are not the only thing moving - confetti is firing
          over the top of them - so this is where the 2D canvas should be
          asking for least, not most. */}
      <StillnessToggle />

      <PetalField density={celebrating ? 0.8 : 1} />
      <Bougainvillea />

      {/* Only once she's through the seal - butterflies drifting past the
          envelope would give away that there's more here than a letter. */}
      {phase === 'open' && unlocked > 0 ? (
        <ButterflyFlight
          poem={poem}
          unlocked={unlocked}
          readLines={readLines}
          activeIndex={activeIndex}
          onPick={pickLine}
          // On the day itself the whole garden lifts off at once, and the poem
          // is finally readable end to end.
          departing={celebrating}
        />
      ) : null}

      <main className="stage">
        <AnimatePresence mode="wait">
          {phase === 'sealed' ? (
            <Gate key="gate" config={config} onUnsealed={handleUnsealed} />
          ) : phase === 'opening' ? (
            <LetterOpening key="letter" config={config} onDone={handleLetterDone} />
          ) : musicOpen ? (
            <MusicRoom
              key="music"
              songs={songs}
              unlocked={songsOpen}
              jukebox={jukebox}
              onBack={closeMusic}
            />
          ) : celebrating ? (
            <BirthdayScroll
              key="celebration"
              config={config}
              onReadPoem={poem.length ? openSheet : undefined}
              onOpenMusic={songsOpen > 0 ? openMusic : undefined}
            />
          ) : (
            <motion.section
              key="waiting"
              className="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1 }}
            >
              <motion.p
                className="waiting__eyebrow"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.1 }}
              >
                {config.greeting}
              </motion.p>

              <motion.h1
                className="waiting__name"
                initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {config.name}
                <span className="waiting__apostrophe">’s birthday</span>
              </motion.h1>

              <motion.p
                className="waiting__sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              >
                {config.subGreeting}
              </motion.p>

              <Countdown days={days} hours={hours} minutes={minutes} seconds={seconds} />

              <div className="waiting__lower">
                <BloomProgress progress={progress} days={days} />
                <div className="waiting__aside">
                  <Whispers
                    lines={config.whispers}
                    override={activeIndex === null ? null : poem[activeIndex]}
                    overrideLabel={
                      activeIndex === null ? null : dayOfLine(activeIndex)
                    }
                  />

                  {/* A row and not a column: the music pill only exists for the
                      last ten days, and stacking it would change the height of
                      a layout that was measured against short screens. */}
                  <div className="waiting__links">
                    {/* Before the poem starts unlocking there's nothing to open,
                        so the date keeps the slot - the row would collapse
                        lopsidedly against the ring without it. */}
                    {unlocked > 0 ? (
                      <button type="button" className="poem-open" onClick={openSheet}>
                        <span aria-hidden="true">🦋</span>
                        read the poem so far
                        {unread > 0 ? <span className="poem-open__count">{unread} new</span> : null}
                      </button>
                    ) : (
                      <p className="waiting__date">
                        <span aria-hidden="true">🌸</span> {prettyDate}
                      </p>
                    )}

                    {songsOpen > 0 ? (
                      <button type="button" className="poem-open" onClick={openMusic}>
                        <span aria-hidden="true">💿</span>
                        twelve for twelve
                        {sounding && !soundOff ? (
                          <span className="poem-open__count">playing</span>
                        ) : null}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Loud on purpose. A preview looks exactly like the real page, and the
          one mistake that would really cost something here is reassuring
          yourself with a screenshot of a clock that was never real. */}
      {previewing ? (
        <p className="preview" role="status">
          <span aria-hidden="true">⏱</span> preview ·{' '}
          <time dateTime={new Date(now).toISOString()}>
            {PREVIEW_CLOCK.format(new Date(now))}
          </time>
        </p>
      ) : null}

      <AnimatePresence>
        {sheetOpen ? (
          <PoemSheet
            key="sheet"
            poem={poem}
            unlocked={unlocked}
            readLines={readLines}
            onClose={closeSheet}
            onReadAll={markAllRead}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
