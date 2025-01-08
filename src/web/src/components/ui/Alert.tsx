import React from 'react'; // v18.0.0
import { cn } from 'class-variance-authority'; // v0.7.0
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'; // v0.3.0
import { useTheme } from '../../hooks/useTheme';

// Type definition for alert variants
type AlertVariant = 'success' | 'error' | 'warning' | 'info';

// Props interface with enhanced accessibility support
interface AlertProps {
  variant: AlertVariant;
  className?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  role?: 'alert' | 'status';
  ariaLive?: 'assertive' | 'polite';
}

// Function to get appropriate icon based on variant and theme
const getAlertIcon = (variant: AlertVariant, theme: string): React.ReactNode => {
  const iconProps = {
    className: 'w-5 h-5',
    'aria-hidden': 'true',
  };

  switch (variant) {
    case 'success':
      return <CheckCircle {...iconProps} />;
    case 'error':
      return <XCircle {...iconProps} />;
    case 'warning':
      return <AlertTriangle {...iconProps} />;
    case 'info':
      return <Info {...iconProps} />;
  }
};

export const Alert: React.FC<AlertProps> = ({
  variant,
  className,
  children,
  dismissible = false,
  onDismiss,
  role = 'alert',
  ariaLive = 'polite',
}) => {
  const { theme } = useTheme();

  // Base styles with theme-aware transitions
  const baseStyles = 'relative flex items-center gap-4 rounded-lg border p-4 transition-all duration-200';

  // Variant-specific styles with dark mode support
  const variantStyles = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/30',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/30',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30',
  };

  // Combine styles using class-variance-authority
  const alertClasses = cn(
    baseStyles,
    variantStyles[variant],
    dismissible && 'pr-12',
    className
  );

  return (
    <div
      className={alertClasses}
      role={role}
      aria-live={ariaLive}
      data-variant={variant}
      data-theme={theme}
    >
      {/* Alert Icon */}
      <span className="flex-shrink-0" aria-hidden="true">
        {getAlertIcon(variant, theme)}
      </span>

      {/* Alert Content */}
      <div className="flex-grow">{children}</div>

      {/* Dismiss Button */}
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss alert"
        >
          <XCircle className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

// Default export for convenient importing
export default Alert;