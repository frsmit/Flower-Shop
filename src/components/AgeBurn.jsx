import { useEffect, useRef } from 'react';
import useReducedMotion from '../hooks/useReducedMotion.js';

/**
 * Her age, standing on its own, catching light from the bottom and going up in
 * embers.
 *
 * The number is never a DOM node. It is drawn once into an offscreen canvas,
 * read back a pixel at a time, and every opaque pixel on the sampling grid
 * becomes a particle - so what burns is the actual shape of the actual glyphs
 * in the actual display face, rather than a rectangle pretending to be a
 * number. That is the whole trick, and it is the reason this is a canvas and
 * not a very determined piece of CSS.
 *
 * It fires exactly once and then hands over. Nothing here loops - which is why
 * it can afford a few thousand particles on the one screen where the frame
 * budget was otherwise being spent on a hedge that swayed forever.
 */

// The grid the glyphs are sampled on. Every opaque pixel this lands on becomes
// one ember, so it trades directly against particle count: 3 is dense and
// legible, 6 is a sketch. Re-tuned below for small screens rather than here.
const BASE_STEP = 4;

// Bottom-up: an ember's ignition point is its height in the number, so the feet
// of the digits catch first and the fire climbs. Spread over this fraction of
// the burn so the top is still solid while the bottom is already gone.
const IGNITE_SPREAD = 0.45;

const HOLD_MS = 1250; // it stands there and is read, before anything happens
const BURN_MS = 2400;
const FADE_MS = 500; // the tail, after the last ember is out

// Three stages of the same coal, picked in that order as a particle ages.
const EMBER = ['#ffd89b', '#f6913f', '#c2410c'];

export default function AgeBurn({ age, onDone }) {
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  // Read by the loop, which closes over it once. A parent re-rendering must not
  // restart a fire that is halfway up the digits.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !age) return;

    // Nobody should be made to watch their age burn in slow motion if they have
    // asked the operating system for less movement. Show it, hold it, move on.
    if (reduced) {
      const skip = window.setTimeout(() => done.current?.(), HOLD_MS);
      return () => window.clearTimeout(skip);
    }

    const ctx = canvas.getContext('2d');
    let raf = 0;
    let cancelled = false;
    let particles = [];
    let started = 0;
    let width = 0;
    let height = 0;

    /**
     * Draws the number once, reads it back, and turns it into embers.
     *
     * Waits on `document.fonts` first: the display face arrives over the
     * network, and a canvas asked to draw in it a moment too early silently
     * falls back to a serif - which is not a thing you would notice in
     * development and would absolutely notice on the day.
     */
    const build = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* no font loading API, or it failed - the fallback face is fine */
      }
      if (cancelled) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (!width || !height) return;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Big, but never wider than the screen it is on.
      const size = Math.min(height * 0.52, width * 0.42);
      const font = `400 ${size}px "Cormorant Garamond", Georgia, serif`;

      // An offscreen pass at device resolution, so the sampling grid reads the
      // glyph edges rather than a blurry upscale of them.
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const offCtx = off.getContext('2d', { willReadFrequently: true });
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.font = font;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#000';
      offCtx.fillText(String(age), width / 2, height / 2);

      const pixels = offCtx.getImageData(0, 0, off.width, off.height).data;

      // Denser on a big screen, sparser on a phone - the number is smaller
      // there, and the same grid would leave the digits looking moth-eaten.
      const step = Math.max(BASE_STEP, Math.round(BASE_STEP * (900 / Math.max(width, 320))));
      const next = [];

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          // The offscreen buffer is in device pixels; the loop is in CSS ones.
          const px = Math.floor(x * dpr);
          const py = Math.floor(y * dpr);
          const alpha = pixels[(py * off.width + px) * 4 + 3];
          if (alpha < 128) continue;

          next.push({
            x,
            y,
            // Where it drifts once it is loose. Embers rise and wander.
            vx: (Math.random() - 0.5) * 26,
            vy: -22 - Math.random() * 46,
            // Bottom of the number catches first, with enough jitter that the
            // fire line is ragged rather than a rising ruler.
            ignite: (1 - y / height) * IGNITE_SPREAD + Math.random() * 0.16,
            ember: EMBER[Math.floor(Math.random() * EMBER.length)],
            size: step * (0.7 + Math.random() * 0.5),
          });
        }
      }

      particles = next;
      started = performance.now();
      raf = requestAnimationFrame(render);
    };

    const render = (time) => {
      const elapsed = time - started;

      if (elapsed < HOLD_MS) {
        // Still just a number. Drawn from the same particles so that the
        // moment it starts to come apart there is no seam.
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#c2617f';
        for (const p of particles) ctx.fillRect(p.x, p.y, p.size, p.size);
        raf = requestAnimationFrame(render);
        return;
      }

      const t = Math.min(1, (elapsed - HOLD_MS) / BURN_MS);
      ctx.clearRect(0, 0, width, height);

      // Cold pass first, in one fill colour: everything the fire has not
      // reached yet is still the number, and setting fillStyle once for all of
      // it keeps the state changes down.
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c2617f';
      for (const p of particles) {
        if (t < p.ignite) ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      // Then the embers, which each need their own alpha as they burn out.
      for (const p of particles) {
        if (t < p.ignite) continue;
        // How far through its own life this particle is, not the burn's.
        const age01 = Math.min(1, (t - p.ignite) / (1 - p.ignite + 0.001));
        if (age01 >= 1) continue;

        const seconds = age01 * (BURN_MS / 1000);
        ctx.globalAlpha = 1 - age01;
        ctx.fillStyle = p.ember;
        ctx.fillRect(
          p.x + p.vx * seconds + Math.sin(seconds * 3 + p.x) * 5,
          // Accelerating upward: heat, not gravity.
          p.y + p.vy * seconds - seconds * seconds * 9,
          p.size,
          p.size,
        );
      }
      ctx.globalAlpha = 1;

      if (elapsed < HOLD_MS + BURN_MS + FADE_MS) {
        raf = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        done.current?.();
      }
    };

    build();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [age, reduced]);

  return (
    <canvas
      ref={canvasRef}
      className="ageburn"
      // The number is real content, not decoration - it is just made of pixels
      // rather than of text, and a canvas tells a screen reader nothing at all.
      role="img"
      aria-label={`${age}`}
    />
  );
}
