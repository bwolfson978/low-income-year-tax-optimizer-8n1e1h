import { useContext, useCallback, useRef } from 'react'; // v18.0.0
import { ToastContext } from '../context/ToastContext';

/**
 * Interface for toast notification options with comprehensive configuration
 */
interface ToastOptions {
  /** The message to display in the toast */
  message: string;
  /** The type/variant of the toast notification */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Duration in milliseconds before auto-dismissing (0 for no auto-dismiss) */
  duration?: number;
  /** Whether the toast can be manually dismissed */
  dismissible?: boolean;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Callback function when toast is dismissed */
  onDismiss?: () => void;
  /** Priority level for queue management */
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Interface for the return value of the useToast hook
 */
interface UseToastReturn {
  /** Function to show a new toast notification */
  toast: (options: ToastOptions) => string;
  /** Function to dismiss a specific toast by ID */
  dismiss: (id: string) => void;
  /** Function to dismiss all active toasts */
  dismissAll: () => void;
}

/**
 * Rate limiting configuration to prevent toast spam
 */
const RATE_LIMIT = {
  MAX_TOASTS_PER_MINUTE: 10,
  RESET_INTERVAL: 60000, // 1 minute
};

/**
 * Custom hook that provides an interface to the toast notification system
 * with enhanced type safety, accessibility, and performance optimizations.
 * 
 * @returns {UseToastReturn} Object containing memoized toast management functions
 * @throws {Error} If used outside of ToastProvider context
 */
export const useToast = (): UseToastReturn => {
  const context = useContext(ToastContext);
  const toastQueueRef = useRef<ToastOptions[]>([]);
  const toastCountRef = useRef<number>(0);
  const lastResetRef = useRef<number>(Date.now());

  // Throw detailed error if hook is used outside ToastProvider
  if (!context) {
    throw new Error(
      'useToast must be used within a ToastProvider.\n' +
      'Please ensure:\n' +
      '1. ToastProvider is present in the component tree\n' +
      '2. useToast is called within a child component of ToastProvider'
    );
  }

  /**
   * Resets the rate limiting counter if enough time has passed
   */
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastResetRef.current >= RATE_LIMIT.RESET_INTERVAL) {
      toastCountRef.current = 0;
      lastResetRef.current = now;
    }
    return toastCountRef.current < RATE_LIMIT.MAX_TOASTS_PER_MINUTE;
  }, []);

  /**
   * Process the next toast in the queue if any
   */
  const processQueue = useCallback(() => {
    if (toastQueueRef.current.length > 0 && checkRateLimit()) {
      const nextToast = toastQueueRef.current.shift();
      if (nextToast) {
        context.showToast(nextToast);
        toastCountRef.current++;
      }
    }
  }, [context, checkRateLimit]);

  /**
   * Shows a new toast notification with rate limiting and queue management
   */
  const toast = useCallback((options: ToastOptions): string => {
    // Validate required options
    if (!options.message) {
      throw new Error('Toast message is required');
    }

    // Prepare toast options with defaults
    const toastOptions: ToastOptions = {
      dismissible: true,
      duration: 5000,
      priority: 'normal',
      ariaLabel: options.type === 'error' ? 'Error notification' : 'Notification',
      ...options,
    };

    // Check rate limiting
    if (!checkRateLimit()) {
      // Add to queue based on priority
      const queueIndex = toastOptions.priority === 'high' ? 0 : toastQueueRef.current.length;
      toastQueueRef.current.splice(queueIndex, 0, toastOptions);
      return 'queued';
    }

    // Increment toast count
    toastCountRef.current++;

    // Show toast through context
    return context.showToast(toastOptions);
  }, [context, checkRateLimit]);

  /**
   * Dismisses a specific toast notification with cleanup
   */
  const dismiss = useCallback((id: string): void => {
    context.hideToast(id);
    // Process next queued toast if available
    setTimeout(processQueue, 0);
  }, [context, processQueue]);

  /**
   * Dismisses all active toast notifications with proper cleanup
   */
  const dismissAll = useCallback((): void => {
    context.clearAllToasts();
    toastQueueRef.current = [];
    toastCountRef.current = 0;
  }, [context]);

  return {
    toast,
    dismiss,
    dismissAll,
  };
};

export default useToast;