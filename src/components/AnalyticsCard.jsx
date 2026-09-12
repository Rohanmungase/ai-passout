import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Analytics metric card with animated count-up number.
 * @param {string} title - Metric label
 * @param {number} value - Numeric value
 * @param {string} suffix - Value suffix (e.g. '%', '/10')
 * @param {React.ReactNode} icon - Lucide icon
 * @param {string} color - Accent color for the icon background
 * @param {number} index - Index for stagger animation
 */
export default function AnalyticsCard({ title, value, suffix = '%', icon, color = 'bg-primary/10 text-primary', index = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animated count-up effect
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current * 10) / 10);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.03 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100
        dark:border-slate-700 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {typeof displayValue === 'number' ? displayValue.toFixed(suffix === '%' ? 0 : 1) : displayValue}
        <span className="text-lg font-medium text-gray-500 dark:text-gray-400 ml-1">{suffix}</span>
      </div>
    </motion.div>
  );
}
