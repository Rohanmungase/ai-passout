import { motion } from 'framer-motion';

/**
 * Feature card for the home page features grid.
 * @param {React.ReactNode} icon - Lucide icon component
 * @param {string} title - Feature title
 * @param {string} description - Feature description
 * @param {number} index - Card index for stagger animation
 */
export default function FeatureCard({ icon, title, description, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-[2rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 dark:hover:shadow-blue-500/10
        border border-slate-100 dark:border-slate-700/50 transition-all duration-300 cursor-default"
    >
      {/* Glow effect behind the icon */}
      <div className="absolute top-8 left-8 w-16 h-16 bg-blue-500/20 dark:bg-blue-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-900 flex items-center justify-center
        text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm border border-blue-100 dark:border-slate-700">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
