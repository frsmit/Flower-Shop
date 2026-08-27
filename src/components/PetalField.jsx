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
    colors: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    // Built on first draw and reused; must be reset here so a recycled petal
    // doesn't keep the previous one's colours.
    gradient: null,
  };
}

function drawPetal(ctx, petal) {
  const { size, colors } = petal;

  if (!petal.gradient) {
    petal.gradient = ctx.createLinearGradient(0, -size, 0, size);
    petal.gradient.addColorStop(0, colors[0]);
    petal.gradient.addColorStop(1, colors[1]);
  }

  ctx.fillStyle = petal.gradient;
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

  if (size > 14) {
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
        ctx.save();
        ctx.translate(petal.x + drift, petal.y);
        ctx.rotate(petal.angle + Math.sin(petal.phase) * 0.35);
        // Squash on the horizontal axis so petals feel like they're turning.
        ctx.scale(petal.tilt * (0.7 + 0.3 * Math.cos(petal.phase)), 1);
        ctx.globalAlpha = petal.opacity;
        drawPetal(ctx, petal);
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
