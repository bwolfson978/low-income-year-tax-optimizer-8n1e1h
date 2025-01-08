import { useContext } from 'react'; // v18.0.0
import { ThemeContext } from '../context/ThemeContext';

/**
 * Type definition for theme context value with strict theme options
 */
type ThemeContextValue = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isDark: boolean;
};

/**
 * Type guard to validate theme value
 * @param theme - Theme value to validate
 */
const isValidTheme = (theme: unknown): theme is 'light' | 'dark' => {
  return typeof theme === 'string' && ['light', 'dark'].includes(theme);
};

/**
 * Custom hook that provides access to theme state and toggle functionality
 * with enhanced error handling and type safety.
 * 
 * @returns {ThemeContextValue} Object containing theme state and controls
 * @throws {Error} If hook is used outside ThemeProvider context
 * 
 * @example
 * const { theme, toggleTheme, isDark } = useTheme();
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider component.\n' +
      'Please ensure:\n' +
      '1. ThemeProvider is present in the component tree\n' +
      '2. useTheme is called within a component that is a child of ThemeProvider\n' +
      '3. There are no context provider mismatches'
    );
  }

  // Validate theme value using type guard
  if (!isValidTheme(context.theme)) {
    throw new Error(
      `Invalid theme value: ${context.theme}. ` +
      'Theme must be either "light" or "dark".'
    );
  }

  // Return strongly-typed theme context value
  return {
    theme: context.theme,
    toggleTheme: context.toggleTheme,
    isDark: context.isDark,
  };
};

/**
 * Default export for convenient importing
 */
export default useTheme;