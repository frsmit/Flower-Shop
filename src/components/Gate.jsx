import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { canVerify, verifyPhrase } from '../lib/secret.js';

const EASE = [0.16, 1, 0.3, 1];

/** The wax seal: an irregular blob with a bract pressed into it. */
function WaxSeal() {
  return (
    <svg className="gate__seal" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="waxFill" cx="40%" cy="34%" r="76%">
          <stop offset="0%" stopColor="#c93a6e" />
          <stop offset="52%" stopColor="#ab1755" />
          <stop offset="88%" stopColor="#7d0f3c" />
          <stop offset="100%" stopColor="#690b32" />
        </radialGradient>
      </defs>

      {/* Wax never pours into a neat circle. */}
      <path
        d="M61 7 C77 6 90 15 97 27 C103 37 113 46 109 61 C106 75 97 89 82 97
           C68 105 50 107 37 100 C23 93 11 80 8 65 C5 50 10 34 21 23 C31 13 46 8 61 7 Z"
        fill="url(#waxFill)"
      />
      <path
        d="M61 7 C77 6 90 15 97 27 C103 37 113 46 109 61 C106 75 97 89 82 97
           C68 105 50 107 37 100 C23 93 11 80 8 65 C5 50 10 34 21 23 C31 13 46 8 61 7 Z"
        fill="none"
        stroke="rgba(255, 255, 255, 0.14)"
        strokeWidth="1.2"
      />

      {/* The impression: a bract triad, pressed in rather than drawn on. */}
      <g transform="translate(60 62)" opacity="0.55">
        {[0, 122, 241].map((deg) => (
          <path
            key={deg}
            d="M 0 0 C -3.4 -2.2 -6.2 -5.4 -6.8 -9.2 C -7.3 -12.4 -5.6 -15.2 -3.4 -17.6
               C -2.2 -19 -1 -20.2 0 -21.4 C 1.2 -20 2.6 -18.6 3.8 -17.2
               C 6 -14.8 7.4 -12 6.8 -8.8 C 6.2 -5 3.4 -2 0 0 Z"
            fill="#5c0b2c"
            transform={`rotate(${deg}) scale(1.5)`}
          />
        ))}
        <circle r="3" fill="#5c0b2c" />
      </g>
      <g transform="translate(60 62)" opacity="0.3">
        {[0, 122, 241].map((deg) => (
          <path
            key={deg}
            d="M 0 -2 C -3.4 -4.2 -6.2 -7.4 -6.8 -11.2 C -7.3 -14.4 -5.6 -17.2 -3.4 -19.6
               C -2.2 -21 -1 -22.2 0 -23.4 C 1.2 -22 2.6 -20.6 3.8 -19.2
               C 6 -16.8 7.4 -14 6.8 -10.8 C 6.2 -7 3.4 -4 0 -2 Z"
            fill="#ff9dc4"
            transform={`rotate(${deg}) scale(1.5)`}
          />
        ))}
      </g>
    </svg>
  );
}

export default function Gate({ config, onUnsealed }) {
  const [phrase, setPhrase] = useState('');
  const [state, setState] = useState('idle'); // idle | checking | wrong
  const inputRef = useRef(null);
  // Fired imperatively rather than keyed off state: re-keying the card to
  // retrigger the shake remounted it, which cleared the input, dropped focus
  // and replayed every entrance animation on each wrong guess.
  const shake = useAnimationControls();

  useEffect(() => {
    // Don't steal focus on a phone - it would throw the keyboard up over the art.
    if (window.matchMedia('(min-width: 720px)').matches) inputRef.current?.focus();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (state === 'checking' || !phrase.trim()) return;

    setState('checking');
    const ok = await verifyPhrase(phrase, config.secretHash);

    if (ok) {
      onUnsealed();
      return;
    }
    setState('wrong');
    shake.start({ x: [0, -9, 8, -6, 4, 0], transition: { duration: 0.45 } });
    // Leave the word selected so she can just type over it.
    inputRef.current?.select();
  };

  return (
    <motion.section
      className="gate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.9 }}
    >
      {/* A small shake on refusal - a seal that won't give. */}
      <motion.div className="gate__card" animate={shake}>
        <motion.div
          initial={{ opacity: 0, scale: 0.82, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
        >
          <WaxSeal />
        </motion.div>

        <motion.p
          className="gate__eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
        >
          for {config.name}
        </motion.p>

        <motion.h1
          className="gate__title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.45 }}
        >
          {config.sealedTitle}
        </motion.h1>

        <motion.p
          className="gate__invite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.65 }}
        >
          {config.sealedInvite}
        </motion.p>

        {canVerify() ? (
          <motion.form
            className="gate__form"
            onSubmit={submit}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.8 }}
          >
            <label className="gate__label" htmlFor="gate-phrase">
              the word
            </label>
            <input
              id="gate-phrase"
              ref={inputRef}
              className="gate__input"
              type="text"
              value={phrase}
              onChange={(event) => {
                setPhrase(event.target.value);
                if (state === 'wrong') setState('idle');
              }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-describedby="gate-hint"
            />
            <button className="gate__button" type="submit" disabled={state === 'checking'}>
              {state === 'checking' ? 'unsealing…' : 'unseal'}
            </button>
          </motion.form>
        ) : (
          <p className="gate__hint">
            This browser can’t check the word here — open the page over https.
          </p>
        )}

        <p className="gate__hint" id="gate-hint" aria-live="polite">
          {state === 'wrong' ? config.sealedRefusal : config.secretHint}
        </p>
      </motion.div>
    </motion.section>
  );
}
