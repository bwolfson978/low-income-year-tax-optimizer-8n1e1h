import React from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group'; // v1.1.3
import { cn } from 'class-variance-authority'; // v0.7.0
import { useTheme } from '../../hooks/useTheme';

/**
 * Props interface for the Radio component with comprehensive type safety
 */
interface RadioProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'data-testid'?: string;
}

/**
 * A reusable, accessible radio button component that follows the application's design system.
 * Supports light/dark themes, error states, and meets WCAG 2.1 Level AA compliance.
 */
const Radio = React.memo(({
  id,
  name,
  value,
  checked,
  onChange,
  disabled = false,
  label,
  description,
  error,
  size = 'md',
  className,
  'data-testid': dataTestId,
}: RadioProps) => {
  // Get current theme with error boundary fallback
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Compose class names for radio button
  const radioClasses = cn(
    // Base styles
    'relative inline-flex items-center justify-center rounded-full border-2 transition-all duration-200',
    // Size variants
    {
      'h-3 w-3': size === 'sm',
      'h-4 w-4': size === 'md',
      'h-5 w-5': size === 'lg',
    },
    // Theme and state styles
    {
      'border-gray-300 bg-white': !isDark && !checked && !error,
      'border-gray-600 bg-gray-800': isDark && !checked && !error,
      'border-primary bg-primary': checked && !error,
      'border-red-500': error,
      'opacity-50 cursor-not-allowed': disabled,
      'cursor-pointer': !disabled,
    },
    className
  );

  // Compose class names for label
  const labelClasses = cn(
    'text-sm font-medium transition-colors duration-200 select-none',
    {
      'text-gray-700': !isDark && !disabled,
      'text-gray-200': isDark && !disabled,
      'text-gray-400': disabled,
      'text-red-500': error,
    }
  );

  // Compose class names for description
  const descriptionClasses = cn(
    'text-xs mt-1 transition-colors duration-200',
    {
      'text-gray-500': !isDark && !error,
      'text-gray-400': isDark && !error,
      'text-red-400': error,
    }
  );

  // Memoized change handler
  const handleChange = React.useCallback((value: string) => {
    if (!disabled) {
      onChange(value);
    }
  }, [disabled, onChange]);

  return (
    <div className="relative" data-testid={dataTestId}>
      <RadioGroup.Item
        id={id}
        value={value}
        checked={checked}
        disabled={disabled}
        onCheckedChange={() => handleChange(value)}
        className={radioClasses}
        aria-describedby={description ? `${id}-description` : undefined}
        aria-invalid={error ? true : undefined}
        aria-errormessage={error ? `${id}-error` : undefined}
      >
        <RadioGroup.Indicator
          className={cn(
            'flex items-center justify-center w-full h-full relative',
            'after:content-[""] after:block after:w-1/2 after:h-1/2',
            'after:rounded-full after:bg-white',
            'after:transition-transform after:duration-200',
            'after:scale-0 data-[state=checked]:after:scale-100'
          )}
        />
      </RadioGroup.Item>

      <label
        htmlFor={id}
        className={cn('ml-2 inline-block', labelClasses)}
      >
        {label}
        {description && (
          <span
            id={`${id}-description`}
            className={descriptionClasses}
          >
            {description}
          </span>
        )}
      </label>

      {error && (
        <span
          id={`${id}-error`}
          className="text-xs text-red-500 dark:text-red-400 mt-1 block"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';

export default Radio;