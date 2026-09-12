import { useAppContext } from '../context/AppContext';

/**
 * Custom hook for theme management.
 * Provides the current theme and a toggle function.
 */
export function useTheme() {
  const { state, dispatch } = useAppContext();

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const setTheme = (theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  return {
    theme: state.theme,
    isDark: state.theme === 'dark',
    toggleTheme,
    setTheme,
  };
}
