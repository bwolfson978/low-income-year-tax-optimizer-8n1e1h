'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from 'class-variance-authority';
import { useTheme } from '../../hooks/useTheme';

// Version comments for dependencies
// @radix-ui/react-select: ^1.2.0
// lucide-react: ^0.3.0
// class-variance-authority: ^0.7.0

/**
 * Props interface for the Select component with comprehensive type safety
 */
export interface SelectProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  loading?: boolean;
  ariaLabel?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

/**
 * Props interface for individual select items
 */
interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Enhanced Select component with theme support and accessibility features
 */
export const Select = React.memo(({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error,
  className,
  loading = false,
  ariaLabel,
  onBlur,
  onFocus,
}: SelectProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  // Base styles with theme awareness
  const rootStyles = cn(
    'relative w-full',
    className
  );

  const triggerStyles = cn(
    'flex h-10 w-full items-center justify-between rounded-md border px-3 py-2',
    'bg-background text-sm ring-offset-background placeholder:text-muted-foreground',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    error && 'border-destructive focus:ring-destructive',
    isDarkTheme ? 'border-gray-700' : 'border-gray-200',
    loading && 'animate-pulse bg-muted',
    className
  );

  const contentStyles = cn(
    'relative z-50 min-w-[8rem] overflow-hidden rounded-md border',
    'bg-popover text-popover-foreground shadow-md',
    'animate-in fade-in-80 zoom-in-95',
    isDarkTheme ? 'border-gray-700' : 'border-gray-200'
  );

  const itemStyles = cn(
    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
    'outline-none focus:bg-accent focus:text-accent-foreground',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
  );

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onChange}
      disabled={disabled || loading}
    >
      <div className={rootStyles}>
        <SelectPrimitive.Trigger
          id={id}
          className={triggerStyles}
          aria-label={ariaLabel || name}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onBlur={onBlur}
          onFocus={onFocus}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ml-2">
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className={contentStyles}>
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>

        {error && (
          <span
            id={`${id}-error`}
            className="mt-1 text-sm text-destructive"
            role="alert"
          >
            {error}
          </span>
        )}
      </div>
    </SelectPrimitive.Root>
  );
});

/**
 * Individual select item component with enhanced accessibility
 */
const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, children, className, disabled }, ref) => {
    const { theme } = useTheme();
    const isDarkTheme = theme === 'dark';

    const itemStyles = cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
      'outline-none focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
      className
    );

    return (
      <SelectPrimitive.Item
        ref={ref}
        value={value}
        disabled={disabled}
        className={itemStyles}
      >
        <SelectPrimitive.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <ChevronDown className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </SelectPrimitive.Item>
    );
  }
);

SelectItem.displayName = 'SelectItem';
Select.displayName = 'Select';

export { SelectItem };