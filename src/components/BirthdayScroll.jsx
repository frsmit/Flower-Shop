import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import AgeBurn from './AgeBurn.jsx';
import Celebration from './Celebration.jsx';
import FlowerBloom from './FlowerBloom.jsx';
import PhotoCarousel from './PhotoCarousel.jsx';
import usePhotos from '../hooks/usePhotos.js';

/**
 * The birthday page, which is the only screen in this app that scrolls.
 *
 * Everywhere else is one viewport with `overflow: hidden`, because a countdown
 * is a thing you glance at. The day itself is a thing you go through, so this
 * is a sequence of full-height sections and `App` drops its height cap while
 * this is mounted.
 *
 * The greeting is not a new component. `Celebration` already is the first
 * section - the title, the message and the buttons are exactly what belongs at
 * the top of the page - so it keeps its job and simply gains a beat before it
 * and a garden after it.
 *
 * The photographs sit between the greeting and the bed rather than after it,
 * so the page still ends on her name under an open flower bed. They are also
 * the one section that may not exist - no manifest, no section, and the scroll
 * is two beats instead of three.
 *
 * The fixed layers behind this (the wash, the glows, the petals, the plant) do
 * not scroll, so the whole sequence plays out over the same garden she has been
 * watching for a year. That is deliberate and it is free: they were already
 * `position: fixed`.
 */
export default function BirthdayScroll({ config, onReadPoem, onOpenMusic }) {
  // Fetched here and not in App: this component only mounts once the day has
  // arrived, so nobody spends a month of visits asking for a manifest that
  // belongs to a screen they cannot reach yet.
  const photos = usePhotos();

  // No age configured is a normal state, not a missing one: the page opens on
  // the greeting exactly as it did before this section existed.
  const [burned, setBurned] = useState(() => !config.birthdayAge);
  const handleBurned = useCallback(() => setBurned(true), []);

  return (
    <div className="birthday">
      <section className="birthday__section birthday__section--open">
        {burned ? (
          <Celebration
            name={config.name}
            title={config.birthdayTitle}
            message={config.birthdayMessage}
            onReadPoem={onReadPoem}
            onOpenMusic={onOpenMusic}
          />
        ) : (
          <AgeBurn age={config.birthdayAge} onDone={handleBurned} />
        )}

        {/* Nothing else on this page announces that it is longer than a screen,
            and a section she never scrolls to may as well not have been built.
            Held back until the greeting has landed so it is not competing with
            the one line that matters. */}
        {burned ? (
          <motion.span
            className="birthday__cue"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 1 }}
          >
            keep going
          </motion.span>
        ) : null}
      </section>

      {photos.length > 0 ? (
        <section className="birthday__section birthday__section--reel">
          <PhotoCarousel photos={photos} />
        </section>
      ) : null}

      <section className="birthday__section birthday__section--bed">
        <FlowerBloom title={`${config.birthdayTitle}, ${config.name}`} />
      </section>
    </div>
  );
}
