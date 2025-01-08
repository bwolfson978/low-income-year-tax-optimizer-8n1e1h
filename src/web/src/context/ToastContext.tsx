import React, { createContext, useState, useCallback, useContext, useEffect } from 'react'; // v18.0.0
import { AnimatePresence, motion } from 'framer-motion'; // v10.0.0
import { Alert } from '../components/ui/Alert';
import { useTheme } from '../hooks/useTheme';

// Global constants for toast configuration
const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;
const TOAST_Z_INDEX = 50;

// Toast variant type matching Alert component variants
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

// Comprehensive toast interface with accessibility properties
interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  dismissible: boolean;
  createdAt: Date;
  role: 'alert' | 'status';
  ariaLive: 'assertive' | 'polite';
}

// Configuration options for creating new toasts
interface ToastOptions {
  message: string;
  variant: ToastVariant;
  duration?: number;
  dismissible?: boolean;
  onDismiss?: () => void;
  priority?: number;
}

// Context value interface with toast management functions
interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

// Context provider props interface
interface ToastProviderProps {
  children: React.ReactNode;
}

// Create context with default values
export const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  dismissToast: () => {},
});

// Animation variants for toast enter/exit
const toastAnimationVariants = {
  initial: { opacity: 0, y: 50, scale: 0.3 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastQueue, setToastQueue] = useState<Toast[]>([]);
  const { theme } = useTheme();

  // Process queue when space becomes available
  useEffect(() => {
    if (toasts.length < MAX_TOASTS && toastQueue.length > 0) {
      const [nextToast, ...remainingQueue] = toastQueue;
      setToasts(current => [...current, nextToast]);
      setToastQueue(remainingQueue);
    }
  }, [toasts, toastQueue]);

  const dismissToast = useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const newToast: Toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: options.message,
      variant: options.variant,
      duration: options.duration ?? DEFAULT_DURATION,
      dismissible: options.dismissible ?? true,
      createdAt: new Date(),
      role: options.variant === 'error' ? 'alert' : 'status',
      ariaLive: options.variant === 'error' ? 'assertive' : 'polite',
    };

    if (toasts.length >= MAX_TOASTS) {
      // Add to queue with priority handling
      setToastQueue(current => {
        const newQueue = [...current, newToast];
        return options.priority 
          ? newQueue.sort((a, b) => (b as any).priority - (a as any).priority)
          : newQueue;
      });
    } else {
      setToasts(current => [...current, newToast]);
    }

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(newToast.id);
        options.onDismiss?.();
      }, newToast.duration);
    }
  }, [toasts.length, dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        className={`fixed bottom-0 right-0 z-${TOAST_Z_INDEX} p-4 space-y-4 max-w-md w-full pointer-events-none`}
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              layout
              initial="initial"
              animate="animate"
              exit="exit"
              variants={toastAnimationVariants}
              className="pointer-events-auto"
            >
              <Alert
                variant={toast.variant}
                dismissible={toast.dismissible}
                onDismiss={() => dismissToast(toast.id)}
                role={toast.role}
                ariaLive={toast.ariaLive}
                className="shadow-lg"
              >
                {toast.message}
              </Alert>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// Custom hook for using toast functionality
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

export default ToastProvider;