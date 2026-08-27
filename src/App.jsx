import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PetalField from './components/PetalField.jsx';
import Countdown from './components/Countdown.jsx';
import BloomProgress from './components/BloomProgress.jsx';
import Whispers from './components/Whispers.jsx';
import Bougainvillea from './components/Bougainvillea.jsx';
import Celebration from './components/Celebration.jsx';
import Gate from './components/Gate.jsx';
import LetterOpening from './components/LetterOpening.jsx';
import {
  HOUR,
  getCountdownParts,
  getYearProgress,
  useNow,
} from './hooks/useCountdown.js';
import useCelebrationConfig from './hooks/useCelebrationConfig.js';
import useUnsealed from './hooks/useUnsealed.js';

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
                  <Whispers lines={config.whispers} />
                  <p className="waiting__date">
                    <span aria-hidden="true">🌸</span> {prettyDate}
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}
