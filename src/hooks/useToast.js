import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Custom hook for toast notification management.
 * Provides functions to show success, error, info, and warning toasts.
 * Toasts auto-dismiss after a configurable duration.
 */
export function useToast() {
  const { dispatch } = useAppContext();

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    dispatch({
      type: 'ADD_TOAST',
      payload: { id, message, type, duration },
    });

    // Auto-dismiss
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, duration);

    return id;
  }, [dispatch]);

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, [dispatch]);

  return {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    remove: removeToast,
  };
}
