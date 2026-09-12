import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated circular/radial progress indicator.
 * @param {number} value - Progress value (0-100)
 * @param {number} size - SVG size in pixels
 * @param {number} strokeWidth - Stroke width
 * @param {string} color - Stroke color (CSS color)
 * @param {string} label - Center label
 * @param {boolean} showValue - Whether to show value in center
 */
export default function CircularProgress({
  value = 0,
  size = 120,
  strokeWidth = 8,
  color = '#2563EB',
  label = '',
  showValue = true,
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(animatedValue)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
      )}
    </div>
  );
}
