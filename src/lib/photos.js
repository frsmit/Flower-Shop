/**
 * The photographs, and the parsing that keeps a hand-edited JSON file from
 * being able to break the one page nobody will be watching when it renders.
 *
 * Deliberately thinner than songs.js, because there is no schedule here. The
 * poem and the songs drip through the wait and so both need arithmetic against
 * the clock; these are the last beat of the birthday page and every one of them
 * is hers the moment she gets there. Nothing in this file reads a clock.
 *
 * No React and no DOM either - same discipline as poem.js, songs.js and
 * flowers.js.
 */

/**
 * The most photographs that will be shown.
 *
 * Not a schedule, just a floor under the page: the carousel holds every image
 * in the DOM at once, and there is a real difference between a set she scrolls
 * through on her birthday and an entire camera roll. Anything past this is
 * dropped, loudly - see below.
 */
export const PHOTO_MAX = 24;

/**
 * Normalises a manifest into the shape the carousel expects, dropping anything
 * that couldn't be shown.
 *
 * `src` is the only required field, exactly as with the songs. A photo with no
 * caption is a photo; a photo with no file is a grey rectangle, so it doesn't
 * get to exist.
 */
export function parsePhotos(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.photos) ? raw.photos : [];

  const photos = list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const src = typeof entry.src === 'string' ? entry.src.trim() : '';
      if (!src) return null;

      const caption = typeof entry.caption === 'string' ? entry.caption.trim() : '';

      return {
        src,
        caption,
        /**
         * Falls back to the caption, and then to empty.
         *
         * Empty is the correct alt text here and not a lapse: past the caption
         * there is nothing truthful left to say about the picture, and a
         * screen reader announcing "photo 4" is worse than one that moves on
         * to the caption sitting right beneath it.
         */
        alt: typeof entry.alt === 'string' && entry.alt.trim() ? entry.alt.trim() : caption,
      };
    })
    .filter(Boolean);

  // Absence is silent everywhere in this project; this is not absence. Losing
  // the end of the set is a mistake she would never see and you would never be
  // told about, on a page that renders once.
  if (photos.length > PHOTO_MAX) {
    console.warn(
      `[photos] ${photos.length} photos in the manifest; showing the first ${PHOTO_MAX}.`,
    );
  }

  return photos.slice(0, PHOTO_MAX);
}
