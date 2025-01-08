import React, { useCallback, useMemo } from 'react';
import { cn } from 'class-variance-authority';
import * as Label from '@radix-ui/react-label';
import formatCurrency from 'currency-formatter';
import { useTheme } from '../../context/ThemeContext';
import { VALIDATION_RULES, UI_CONSTANTS } from '../../lib/constants';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'password' | 'currency';
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  name,
  type,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  step,
  precision = 2,
  className,
  ariaLabel,
  ariaDescribedBy,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Base classes with theme-aware styling
  const baseClasses = cn(
    'w-full rounded-md border px-3 py-2 text-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-primary-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500': !isDark,
      'bg-gray-800 text-gray-100 border-gray-700 placeholder:text-gray-400': isDark,
    },
    className
  );

  // Error-specific classes
  const errorClasses = cn(
    'border-red-500 focus:ring-red-500',
    'dark:border-red-400',
    'animate-shake'
  );

  // Currency-specific classes
  const currencyClasses = 'font-mono tabular-nums';

  // Format currency value for display
  const formatValue = useCallback((val: string | number): string => {
    if (type === 'currency' && val !== '') {
      try {
        const numericValue = typeof val === 'string' ? parseFloat(val) : val;
        return formatCurrency.format(numericValue, {
          locale: 'en-US',
          precision,
          symbol: '$',
        });
      } catch (error) {
        console.error('Currency formatting error:', error);
        return String(val);
      }
    }
    return String(val);
  }, [type, precision]);

  // Handle input changes with validation and formatting
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    if (type === 'currency') {
      // Strip non-numeric characters for currency
      newValue = newValue.replace(/[^0-9.]/g, '');
      
      // Validate against min/max if specified
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        if (min !== undefined && numValue < min) newValue = String(min);
        if (max !== undefined && numValue > max) newValue = String(max);
      }
    }

    if (type === 'number') {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        if (min !== undefined && numValue < min) newValue = String(min);
        if (max !== undefined && numValue > max) newValue = String(max);
      }
    }

    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: newValue,
      },
    };

    onChange(syntheticEvent);
  }, [type, min, max, onChange]);

  // Generate unique IDs for accessibility
  const errorId = useMemo(() => `${id}-error`, [id]);
  const labelId = useMemo(() => `${id}-label`, [id]);

  return (
    <div className="w-full">
      <Label.Root
        htmlFor={id}
        className={cn(
          'text-sm font-medium mb-1 block',
          {
            'text-gray-900 dark:text-gray-100': !error,
            'text-red-500 dark:text-red-400': error,
          }
        )}
        id={labelId}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label.Root>

      <div className="relative">
        {type === 'currency' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            $
          </span>
        )}

        <input
          id={id}
          name={name}
          type={type === 'currency' ? 'text' : type}
          value={formatValue(value)}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          className={cn(
            baseClasses,
            error && errorClasses,
            type === 'currency' && currencyClasses,
            type === 'currency' && 'pl-7'
          )}
          aria-label={ariaLabel || label}
          aria-invalid={!!error}
          aria-describedby={cn(
            error && errorId,
            ariaDescribedBy
          )}
          {...props}
        />
      </div>

      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-500 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;