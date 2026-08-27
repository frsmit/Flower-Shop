import { memo } from 'react';
import { motion } from 'framer-motion';

const SIZE = 190;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A ring that fills as the year between two birthdays runs out, with a flower
 * riding the leading edge.
 */
function BloomProgress({ progress, days }) {
  const pct = Math.round(progress * 100);
  const angle = progress * 360 - 90;

  return (
    <motion.div
      className="bloom"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.9, duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="bloom__svg" aria-hidden="true">
        <defs>
          <linearGradient id="bloomStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f7a9c0" />
            <stop offset="45%" stopColor="#e79ad4" />
            <stop offset="100%" stopColor="#f6c98f" />
          </linearGradient>
        </defs>

        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(214, 148, 170, 0.22)"
          strokeWidth={STROKE}
        />

        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#bloomStroke)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 1 }}
        />

        <g transform={`rotate(${angle} ${SIZE / 2} ${SIZE / 2})`}>
          <g transform={`translate(${SIZE / 2 + RADIUS} ${SIZE / 2})`}>
            <g className="bloom__marker">
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="0"
                  cy="-5"
                  rx="3.1"
                  ry="6"
                  fill="#fff"
                  opacity="0.95"
                  transform={`rotate(${deg})`}
                />
              ))}
              <circle r="2.6" fill="#f6c98f" />
            </g>
          </g>
        </g>
      </svg>

      <div className="bloom__center">
        <span className="bloom__pct">{pct}%</span>
        <span className="bloom__caption">
          {days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} of petals left` : 'in full bloom'}
        </span>
      </div>
    </motion.div>
  );
}

// With progress quantised upstream, this now re-renders roughly twice a day
// instead of once a second.
export default memo(BloomProgress);
