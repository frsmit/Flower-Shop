import { motion } from 'framer-motion';
import RollingNumber from './RollingNumber.jsx';

const FLOURISH = (
  <svg className="countdown__flourish" viewBox="0 0 24 24" aria-hidden="true">
    <g fill="currentColor">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse key={deg} cx="12" cy="6.2" rx="2.5" ry="5" transform={`rotate(${deg} 12 12)`} />
      ))}
    </g>
    <circle cx="12" cy="12" r="2.4" fill="#fff6de" />
  </svg>
);

export default function Countdown({ days, hours, minutes, seconds }) {
  const units = [
    { key: 'days', label: 'days', value: days, pad: String(days).length > 2 ? 3 : 2 },
    { key: 'hours', label: 'hours', value: hours, pad: 2 },
    { key: 'minutes', label: 'minutes', value: minutes, pad: 2 },
    { key: 'seconds', label: 'seconds', value: seconds, pad: 2 },
  ];

  return (
    <div className="countdown" role="timer" aria-live="off">
      {units.map((unit, index) => (
        <motion.div
          className="countdown__group"
          key={unit.key}
          initial={{ opacity: 0, y: 26, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35 + index * 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="countdown__tile">
            <span className="countdown__value">
              <RollingNumber value={unit.value} pad={unit.pad} />
            </span>
            <span className="countdown__sheen" aria-hidden="true" />
          </div>
          <span className="countdown__label">{unit.label}</span>
          {index < units.length - 1 && FLOURISH}
        </motion.div>
      ))}
    </div>
  );
}
