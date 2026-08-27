import { useCallback, useState } from 'react';

const KEY = 'birthday-bloom:unsealed';

/**
 * Remembers that the envelope has already been opened, so she isn't asked for
 * the word - or made to sit through the letter - every time she comes back to
 * check the countdown.
 *
 * Wrapped in try/catch throughout: storage throws outright in some privacy
 * modes, and a locked-out gift is a worse failure than an extra prompt.
 */
export function useUnsealed(enabled) {
  const [unsealed, setUnsealed] = useState(() => {
    if (!enabled) return true; // no passphrase configured: nothing to unseal
    try {
      return window.localStorage.getItem(KEY) === 'true';
    } catch {
      return false;
    }
  });

  const remember = useCallback(() => {
    setUnsealed(true);
    try {
      window.localStorage.setItem(KEY, 'true');
    } catch {
      /* private mode: she'll just be asked again next visit */
    }
  }, []);

  return { unsealed, remember };
}

export default useUnsealed;
