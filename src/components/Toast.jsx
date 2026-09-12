import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

/**
 * Toast notification container.
 * Renders all active toasts with slide-in animation and auto-dismiss.
 */

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
};

const bgMap = {
  success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
};

export default function Toast() {
  const { state, dispatch } = useAppContext();

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {state.toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${
              bgMap[toast.type] || bgMap.info
            }`}
            role="alert"
          >
            <span className="mt-0.5 shrink-0">{iconMap[toast.type] || iconMap.info}</span>
            <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">
              {toast.message}
            </p>
            <button
              onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
              className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
