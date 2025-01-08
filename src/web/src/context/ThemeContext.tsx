import React, { createContext, useEffect, useState, useCallback } from 'react';
import { UI_CONSTANTS } from '../lib/constants';

/**
 * Storage key for theme preference in localStorage
 */
const STORAGE_KEY = 'theme-preference';

/**
 * Media query for system dark mode preference
 */
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Debounce time for theme switching to prevent flashing
 */
const THEME_SWITCH_DEBOUNCE = 150;

/**
 * Type definition for theme context value
 */
type ThemeContextValue = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isDark: boolean;
  isSystemTheme: boolean;
};

/**
 * Props interface for ThemeProvider component
 */
interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Validates theme value against allowed options
 */
const validateTheme = (theme: string): theme is 'light' | 'dark' => {
  return ['light', 'dark'].includes(theme);
};

/**
 * Determines initial theme based on stored preference or system preference
 */
const getInitialTheme = (): 'light' | 'dark' => {
  try {
    // Check localStorage first
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    if (storedTheme && validateTheme(storedTheme)) {
      return storedTheme;
    }

    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const isDarkMode = window.matchMedia(MEDIA_QUERY).matches;
      return isDarkMode ? 'dark' : 'light';
    }
  } catch (error) {
    console.error('Error determining initial theme:', error);
  }

  // Default to light theme if all else fails
  return 'light';
};

/**
 * Create theme context with default values
 */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
  isSystemTheme: true,
});

/**
 * Theme provider component with comprehensive theme management
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [isSystemTheme, setIsSystemTheme] = useState<boolean>(
    !localStorage.getItem(STORAGE_KEY)
  );

  /**
   * Updates document classes and meta theme-color
   */
  const updateDocumentTheme = useCallback((newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    const isDark = newTheme === 'dark';

    // Use requestAnimationFrame for smooth theme transitions
    requestAnimationFrame(() => {
      root.classList.remove(isDark ? 'light' : 'dark');
      root.classList.add(newTheme);

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          isDark ? '#1a1a1a' : '#ffffff'
        );
      }
    });
  }, []);

  /**
   * Handles theme toggling with system preference consideration
   */
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
        setIsSystemTheme(false);
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
      return newTheme;
    });
  }, []);

  /**
   * Effect for syncing theme changes with document and localStorage
   */
  useEffect(() => {
    let timeoutId: number;

    timeoutId = window.setTimeout(() => {
      updateDocumentTheme(theme);
    }, THEME_SWITCH_DEBOUNCE);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [theme, updateDocumentTheme]);

  /**
   * Effect for handling system theme changes
   */
  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (isSystemTheme) {
        setTheme(event.matches ? 'dark' : 'light');
      }
    };

    try {
      // Modern browsers
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } catch (err1) {
      try {
        // Fallback for older browsers
        mediaQuery.addListener(handleSystemThemeChange);
      } catch (err2) {
        console.error('Error setting up theme listener:', err2);
      }
    }

    return () => {
      try {
        // Modern browsers cleanup
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } catch (err1) {
        try {
          // Fallback cleanup
          mediaQuery.removeListener(handleSystemThemeChange);
        } catch (err2) {
          console.error('Error removing theme listener:', err2);
        }
      }
    };
  }, [isSystemTheme]);

  const contextValue: ThemeContextValue = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isSystemTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};