import { motion } from 'framer-motion';

/**
 * Loading skeleton component for async content placeholders.
 * @param {'text'|'card'|'circle'|'rect'} variant - Shape variant
 * @param {number} lines - Number of text lines (for 'text' variant)
 * @param {string} className - Additional CSS classes
 */
export default function LoadingSkeleton({ variant = 'text', lines = 3, className = '' }) {
  if (variant === 'circle') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`skeleton rounded-full w-20 h-20 ${className}`}
        aria-label="Loading..."
      />
    );
  }

  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`skeleton rounded-2xl h-40 w-full ${className}`}
        aria-label="Loading..."
      />
    );
  }

  if (variant === 'rect') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`skeleton rounded-xl h-12 w-full ${className}`}
        aria-label="Loading..."
      />
    );
  }

  // Default: text lines
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-3 ${className}`}
      aria-label="Loading..."
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton rounded-lg h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </motion.div>
  );
}
