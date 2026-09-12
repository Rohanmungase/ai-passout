import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated linear progress bar.
 * @param {number} value - Current progress (0-100)
 * @param {string} label - Optional label text
 * @param {string} color - Tailwind bg color class
 * @param {boolean} showValue - Whether to show the numeric value
 * @param {'sm'|'md'|'lg'} size - Bar height
 */
export default function ProgressBar({
  value = 0,
  label = '',
  color = 'bg-primary',
  showValue = true,
  size = 'md',
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const heightMap = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className="w-full" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${heightMap[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${animatedValue}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
