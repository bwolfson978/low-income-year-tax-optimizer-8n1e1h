import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react'; // v0.3.0
import { useTheme } from '../../hooks/useTheme';
import { buttonVariants } from '../ui/Button';
import { UI_CONSTANTS } from '../../lib/constants';

/**
 * Props interface for ThemeToggle component
 */
interface ThemeToggleProps {
  className?: string;
}

/**
 * A theme toggle button component that switches between light and dark modes
 * with smooth transitions and full accessibility support.
 */
const ThemeToggle = React.memo<ThemeToggleProps>(({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle animation cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isAnimating) {
      timeoutId = setTimeout(() => {
        setIsAnimating(false);
      }, UI_CONSTANTS.ANIMATION_DURATION);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAnimating]);

  const handleThemeToggle = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      toggleTheme();
    }
  };

  return (
    <button
      type="button"
      onClick={handleThemeToggle}
      className={buttonVariants({
        variant: 'ghost',
        size: 'icon',
        className: `relative ${className}`,
      })}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-pressed={isDark}
      disabled={isAnimating}
      data-state={theme}
    >
      <Sun
        className={`h-5 w-5 transition-all duration-${UI_CONSTANTS.ANIMATION_DURATION} ${
          isDark ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        } absolute`}
        aria-hidden="true"
      />
      <Moon
        className={`h-5 w-5 transition-all duration-${UI_CONSTANTS.ANIMATION_DURATION} ${
          isDark ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        } absolute`}
        aria-hidden="true"
      />
      <span className="sr-only">
        {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      </span>
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;