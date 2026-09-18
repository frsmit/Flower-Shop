import { useSyncExternalStore } from 'react';
import { isStill, setStill, subscribe } from '../lib/stillness.js';

/**
 * The button that stops the page moving, and starts it again.
 *
 * Deliberately small and in the corner. On a page whose whole argument is that
 * it is alive - petals falling, butterflies crossing, the hedge breathing -
 * a prominent "turn all of that off" control would read as an apology for it.
 * But on a tired phone, or when she is trying to read twelve lines of a poem
 * while the garden drifts underneath, the honest answer is to let her stop it.
 *
 * It does not pretend to be a setting, so it does not live behind a menu. One
 * press, immediate, remembered.
 */
export default function StillnessToggle() {
  const still = useSyncExternalStore(subscribe, isStill, () => false);

  return (
    <button
      type="button"
      className={`stillness ${still ? 'stillness--held' : ''}`}
      onClick={() => setStill(!still)}
      aria-pressed={still}
      title={still ? 'Let the garden move again' : 'Hold the garden still'}
    >
      <span aria-hidden="true">{still ? '▶' : '❚❚'}</span>
      <span className="stillness__word">{still ? 'let it move' : 'hold still'}</span>
    </button>
  );
}
