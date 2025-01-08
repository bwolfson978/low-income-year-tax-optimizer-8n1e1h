import React, { useEffect, useState } from 'react';
import { cn } from 'class-variance-authority';
import { Loader2 } from 'lucide-react'; // v0.3.0
import { useTheme } from '../../context/ThemeContext';
import { UI_CONSTANTS } from '../../lib/constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
  pressed?: boolean;
  loadingText?: string;
  ariaLabel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      disabled = false,
      children,
      asChild = false,
      pressed,
      loadingText = 'Loading...',
      ariaLabel,
      ...props
    },
    ref
  ) => {
    const { theme, isDark } = useTheme();
    const [isPressed, setIsPressed] = useState(false);

    // Handle theme-based transitions
    useEffect(() => {
      const transitionStyles = document.createElement('style');
      transitionStyles.innerHTML = `
        .button-transition {
          transition: all ${UI_CONSTANTS.ANIMATION_DURATION}ms ease-in-out;
        }
      `;
      document.head.appendChild(transitionStyles);

      return () => {
        document.head.removeChild(transitionStyles);
      };
    }, []);

    // Announce loading state to screen readers
    useEffect(() => {
      if (isLoading) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = loadingText;
        document.body.appendChild(announcement);

        return () => {
          document.body.removeChild(announcement);
        };
      }
    }, [isLoading, loadingText]);

    const buttonVariants = cn(
      // Base styles
      'button-transition inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      
      // Variants
      {
        'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
        'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
        'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
        'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
        'text-primary underline-offset-4 hover:underline': variant === 'link',
      },

      // Sizes
      {
        'h-10 px-4 py-2': size === 'default',
        'h-9 rounded-md px-3': size === 'sm',
        'h-11 rounded-md px-8': size === 'lg',
        'h-10 w-10': size === 'icon',
      },

      // Theme-specific styles
      {
        'dark:shadow-sm': isDark && variant !== 'ghost' && variant !== 'link',
        'dark:hover:bg-primary/70': isDark && variant === 'default',
        'dark:hover:bg-destructive/70': isDark && variant === 'destructive',
        'dark:border-slate-700': isDark && variant === 'outline',
      },

      // Loading and pressed states
      {
        'cursor-not-allowed opacity-70': isLoading,
        'aria-pressed': isPressed || pressed,
      },

      className
    );

    const handlePressStart = () => {
      setIsPressed(true);
    };

    const handlePressEnd = () => {
      setIsPressed(false);
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={buttonVariants}
        aria-disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handlePressStart();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handlePressEnd();
          }
        }}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="sr-only">{loadingText}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps };

// Export button variants function for reuse
export const buttonVariants = ({
  variant = 'default',
  size = 'default',
  className,
}: Partial<ButtonProps>) =>
  cn(
    'button-transition inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
      'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
      'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
      'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
      'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
      'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
      'text-primary underline-offset-4 hover:underline': variant === 'link',
    },
    {
      'h-10 px-4 py-2': size === 'default',
      'h-9 rounded-md px-3': size === 'sm',
      'h-11 rounded-md px-8': size === 'lg',
      'h-10 w-10': size === 'icon',
    },
    className
  );