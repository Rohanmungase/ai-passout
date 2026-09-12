import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

/**
 * Categorized feedback display with strengths, weaknesses, and suggestions.
 * @param {{ strengths: string[], weaknesses: string[], suggestions: string[] }} feedback
 */
export default function FeedbackList({ feedback }) {
  if (!feedback) return null;

  const sections = [
    {
      key: 'strengths',
      title: 'Strengths',
      items: feedback.strengths || [],
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      key: 'weaknesses',
      title: 'Areas for Improvement',
      items: feedback.weaknesses || [],
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
    },
    {
      key: 'suggestions',
      title: 'Suggestions',
      items: feedback.suggestions || [],
      icon: <Lightbulb className="w-5 h-5" />,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIdx) => (
        section.items.length > 0 && (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: sectionIdx * 0.15 }}
            className={`rounded-2xl border ${section.border} ${section.bg} p-5`}
          >
            <div className={`flex items-center gap-2 mb-3 ${section.color}`}>
              {section.icon}
              <h4 className="font-semibold text-base">{section.title}</h4>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: sectionIdx * 0.15 + i * 0.08 }}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${section.color.replace('text-', 'bg-')}`} />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )
      ))}
    </div>
  );
}
