import React, { useCallback, useRef } from 'react';
import { Check } from 'lucide-react'; // v0.3.0
import { cn } from 'class-variance-authority'; // v0.7.0
import { useTheme } from '../../hooks/useTheme';

/**
 * Props interface for the Checkbox component with comprehensive type safety
 */
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  error?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * A fully accessible checkbox component with theme support and form integration.
 * Implements WCAG 2.1 Level AA standards for keyboard navigation and screen readers.
 */
const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  id,
  name,
  disabled = false,
  className = '',
  required = false,
  error,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID if not provided
  const uniqueId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${uniqueId}-error` : undefined;

  // Handle keyboard interactions for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  }, [checked, disabled, onChange]);

  // Handle click events
  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
      inputRef.current?.focus();
    }
  }, [checked, disabled, onChange]);

  // Compute dynamic classes based on state
  const containerClasses = cn(
    'relative flex items-center gap-2 transition-all duration-200',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  const checkboxClasses = cn(
    'h-4 w-4 rounded border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
    checked ? 'bg-primary border-transparent' : 'bg-white dark:bg-gray-800',
    !disabled && 'hover:border-primary dark:hover:border-primary-light',
    error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
    theme === 'dark' ? 'dark' : 'light'
  );

  const labelClasses = cn(
    'text-sm font-medium transition-colors duration-200',
    theme === 'dark' ? 'text-gray-200' : 'text-gray-700',
    disabled && 'opacity-50',
    error && 'text-red-500'
  );

  return (
    <div className="flex flex-col">
      <div
        className={containerClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={label ? `${uniqueId}-label` : undefined}
        aria-describedby={ariaDescribedBy || errorId}
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="checkbox"
            id={uniqueId}
            name={name}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            required={required}
            className="sr-only"
            aria-label={ariaLabel}
            aria-invalid={!!error}
            aria-describedby={errorId}
          />
          <div className={checkboxClasses}>
            {checked && (
              <Check
                className="h-3 w-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        {label && (
          <label
            id={`${uniqueId}-label`}
            htmlFor={uniqueId}
            className={labelClasses}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-500 transition-colors duration-200"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Checkbox;