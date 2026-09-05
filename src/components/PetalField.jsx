import { memo, useEffect, useRef } from 'react';
import useReducedMotion from '../hooks/useReducedMotion.js';

// Spent bougainvillea bracts on the way down. Pitched lighter than the hedge
// below, since these drift across the text and shouldn't fight it.
const PALETTE = [
  ['#f6a8c8', '#d4176e'], // magenta
  ['#f0b6e2', '#b32a93'], // purple
  ['#f8bcd0', '#e4568f'], // rose
  ['#f4a9ae', '#c62a4a'], // crimson
  ['#f9c6ac', '#e2693f'], // coral
  ['#fdeade', '#f2c3b4'], // the pale cream variety
];

const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);

// The size every sprite is rasterised at, and the largest a petal ever gets.
// Petals are only ever scaled *down* from here, so a cached bitmap never has to
// be magnified past the resolution it was drawn at.
const REF = 26;
// Half the sprite's side, in petal-local units. The bract reaches a full REF
// above and below the origin and about 0.74 of one to each side; the remainder
// is padding for the vein strokes.
const HALF = REF + 3;

function makePetal(width, height, seeded) {
  const size = rand(9, 26);
  return {
    x: rand(-40, width + 40),
    y: seeded ? rand(-height, height) : rand(-height * 0.4, -20),
    size,
    // Bigger petals fall faster — cheap depth cue.
    fall: rand(14, 34) * (size / 18),
    sway: rand(16, 46),
    swaySpeed: rand(0.25, 0.7),
    phase: rand(0, TAU),
    spin: rand(-0.6, 0.6),
    angle: rand(0, TAU),
    tilt: rand(0.45, 1),
    opacity: rand(0.35, 0.85),
    // Which of the twelve cached sprites this one blits. Colour and vein detail
    // are baked in, so nothing about how the petal looks is decided again after
    // this line — a recycled petal picks a new sprite along with everything
    // else, which is what keeps it from keeping the old one's colours.
    sprite: Math.floor(Math.random() * PALETTE.length) * 2 + (size > 14 ? 1 : 0),
  };
}

function drawPetal(ctx, size, colors, veined) {
  const gradient = ctx.createLinearGradient(0, -size, 0, size);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  // A bract, not a petal: pointed at the tip, widest below the middle, and
  // narrowing again to the little stalk it detached from.
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.55, -size * 0.62, size * 0.74, -size * 0.05, size * 0.5, size * 0.55);
  ctx.bezierCurveTo(size * 0.3, size * 0.95, size * 0.12, size, 0, size);
  ctx.bezierCurveTo(-size * 0.12, size, -size * 0.3, size * 0.95, -size * 0.5, size * 0.55);
  ctx.bezierCurveTo(-size * 0.74, -size * 0.05, -size * 0.55, -size * 0.62, 0, -size);
  ctx.closePath();
  ctx.fill();

  // The midrib, plus the papery cross-veins bougainvillea bracts are known for.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = Math.max(0.6, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.82);
  ctx.quadraticCurveTo(size * 0.08, 0, 0, size * 0.88);
  ctx.stroke();

  // Only the bigger bracts carry these, which is the whole reason there are two
  // sprites per colour rather than one.
  if (veined) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.lineWidth = Math.max(0.4, size * 0.03);
    ctx.beginPath();
    for (const at of [-0.35, 0.05, 0.45]) {
      ctx.moveTo(0, size * at);
      ctx.quadraticCurveTo(size * 0.3, size * (at + 0.16), size * 0.46, size * (at + 0.3));
      ctx.moveTo(0, size * at);
      ctx.quadraticCurveTo(-size * 0.3, size * (at + 0.16), -size * 0.46, size * (at + 0.3));
    }
    ctx.stroke();
  }
}

/**
 * Every petal shape the field can hold, rasterised once up front.
 *
 * The drawing only ever varies by palette and by whether it carries the
 * cross-veins - twelve possibilities in total. Everything else that makes one
 * petal look unlike another (size, spin, tilt, opacity) is a transform applied
 * at blit time and costs nothing to vary.
 *
 * Traced live, each petal was five bezier curves, a quadratic midrib and, for
 * the big ones, six more quadratics, all rebuilt from scratch every frame; a
 * hundred of those is a great deal of path work to hand the rasteriser thirty
 * times a second for a picture that never actually changes. As sprites it is a
 * hundred blits of a bitmap the GPU already has.
 *
 * Supersampled at twice the device ratio on purpose: the sprite is drawn at REF
 * and then scaled down to as little as a third of it, and a bract's tip goes
 * visibly blunt when it comes off a bitmap rasterised at its own size.
 */
function buildSprites(dpr) {
  const ss = dpr * 2;
  const side = HALF * 2;

  return PALETTE.flatMap((colors) =>
    [false, true].map((veined) => {
      const sprite = document.createElement('canvas');
      sprite.width = Math.ceil(side * ss);
      sprite.height = Math.ceil(side * ss);

      const ctx = sprite.getContext('2d');
      // Petal-local units in, device pixels out, origin in the middle - so the
      // drawing code below is identical to what it was drawing in place.
      ctx.setTransform(ss, 0, 0, ss, HALF * ss, HALF * ss);
      drawPetal(ctx, REF, colors, veined);

      return sprite;
    }),
  );
}

function PetalField({ density = 1 }) {
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let petals = [];
    let sprites = [];
    let spriteDpr = 0;
    let raf = 0;
    let last = performance.now();

    // Petals drift slowly enough that 30fps is indistinguishable from 60, and
    // halving the canvas work leaves the main thread free for the countdown's
    // animation on the frames that matter.
    const FRAME_MS = 1000 / 30;
    let lastDraw = -Infinity;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rebuilt only when the ratio genuinely moves. A window resize does not
      // change how a sprite should be rasterised, and dragging a window edge
      // fires this handler continuously.
      if (dpr !== spriteDpr) {
        sprites = buildSprites(dpr);
        spriteDpr = dpr;
      }

      const count = Math.round(
        Math.min(70, Math.max(18, (width * height) / 26000)) * density,
      );
      petals = Array.from({ length: count }, () => makePetal(width, height, true));
    };

    const render = (time) => {
      if (!reduced) raf = requestAnimationFrame(render);
      if (time - lastDraw < FRAME_MS) return;

      const dt = Math.min((time - last) / 1000, 0.08);
      last = time;
      lastDraw = time;
      ctx.clearRect(0, 0, width, height);

      for (const petal of petals) {
        if (!reduced) {
          petal.y += petal.fall * dt;
          petal.phase += petal.swaySpeed * dt;
          petal.angle += petal.spin * dt;

          if (petal.y - petal.size > height) {
            Object.assign(petal, makePetal(width, height, false));
          }
        }

        const drift = Math.sin(petal.phase) * petal.sway;
        // The sprite is a REF-sized bract, so everything below is the same
        // transform it always was with one extra factor folded in.
        const scale = petal.size / REF;
        ctx.save();
        ctx.translate(petal.x + drift, petal.y);
        ctx.rotate(petal.angle + Math.sin(petal.phase) * 0.35);
        // Squash on the horizontal axis so petals feel like they're turning.
        ctx.scale(petal.tilt * (0.7 + 0.3 * Math.cos(petal.phase)), 1);
        ctx.globalAlpha = petal.opacity;
        ctx.drawImage(
          sprites[petal.sprite],
          -HALF * scale,
          -HALF * scale,
          HALF * 2 * scale,
          HALF * 2 * scale,
        );
        ctx.restore();
      }
    };

    resize();
    raf = requestAnimationFrame(render);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [density, reduced]);

  return <canvas ref={canvasRef} className="petal-field" aria-hidden="true" />;
}

// The canvas drives itself from rAF; it has no reason to re-render on each tick.
export default memo(PetalField);
