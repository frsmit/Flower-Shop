import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PetalField from './components/PetalField.jsx';
import Countdown from './components/Countdown.jsx';
import BloomProgress from './components/BloomProgress.jsx';
import Whispers from './components/Whispers.jsx';
import Bougainvillea from './components/Bougainvillea.jsx';
import Celebration from './components/Celebration.jsx';
import Gate from './components/Gate.jsx';
import LetterOpening from './components/LetterOpening.jsx';
import ButterflyFlight from './components/ButterflyFlight.jsx';
import PoemSheet from './components/PoemSheet.jsx';
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
  const unlocked = unlockedCount(target, now, poem.length, celebrating);

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
    <div className={`app ${celebrating ? 'app--celebrating' : ''}`}>
      <div className="app__wash" aria-hidden="true" />
      <div className="app__glow app__glow--one" aria-hidden="true" />
      <div className="app__glow app__glow--two" aria-hidden="true" />
      <PetalField density={celebrating ? 1.5 : 1} />
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
          ) : celebrating ? (
            <Celebration
              key="celebration"
              name={config.name}
              title={config.birthdayTitle}
              message={config.birthdayMessage}
              onReadPoem={poem.length ? openSheet : undefined}
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
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

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
