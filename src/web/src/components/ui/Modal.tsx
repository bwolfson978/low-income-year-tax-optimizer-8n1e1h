import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog'; // v1.0.0
import { X } from 'lucide-react'; // v0.3.0
import { cn } from 'class-variance-authority'; // v0.7.0
import * as FocusScope from '@radix-ui/react-focus-scope'; // v1.0.0
import { buttonVariants } from './Button';
import { useTheme } from '../../hooks/useTheme';
import { UI_CONSTANTS } from '../../lib/constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  animationDuration?: number;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  preventScroll?: boolean;
  ariaLabel?: string;
  role?: 'dialog' | 'alertdialog';
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      className,
      showCloseButton = true,
      initialFocus,
      animationDuration = UI_CONSTANTS.ANIMATION_DURATION,
      closeOnEscape = true,
      closeOnOutsideClick = true,
      preventScroll = true,
      ariaLabel,
      role = 'dialog',
    },
    ref
  ) => {
    const { theme, isDark } = useTheme();
    const [isAnimating, setIsAnimating] = useState(false);
    const animationTimeoutRef = useRef<number>();
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Handle animation and cleanup on mount/unmount
    useEffect(() => {
      if (isOpen) {
        setIsAnimating(true);
        if (preventScroll) {
          document.body.style.overflow = 'hidden';
          // iOS-specific scroll fix
          document.body.style.position = 'fixed';
          document.body.style.width = '100%';
        }
        // Store previously focused element
        previousFocusRef.current = document.activeElement as HTMLElement;
      }

      animationTimeoutRef.current = window.setTimeout(() => {
        setIsAnimating(false);
      }, animationDuration);

      return () => {
        if (animationTimeoutRef.current) {
          window.clearTimeout(animationTimeoutRef.current);
        }
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        // Restore focus on unmount
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }, [isOpen, animationDuration, preventScroll]);

    // Handle escape key
    const handleEscapeKey = React.useCallback(
      (event: KeyboardEvent) => {
        if (closeOnEscape && event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    // Handle outside click
    const handleOutsideClick = React.useCallback(
      (event: React.MouseEvent) => {
        if (
          closeOnOutsideClick &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
      },
      [closeOnOutsideClick, onClose]
    );

    const overlayClassName = cn(
      'fixed inset-0 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      isDark && 'bg-black/70',
      isAnimating && 'transition-opacity duration-200'
    );

    const contentClassName = cn(
      'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
      'gap-4 border bg-background p-6 shadow-lg duration-200',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
      'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
      'sm:rounded-lg',
      isDark && 'border-slate-800',
      className
    );

    return (
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className={overlayClassName} />
          <FocusScope.Root trapped restoreFocus>
            <Dialog.Content
              ref={ref}
              className={contentClassName}
              onPointerDownOutside={handleOutsideClick}
              onEscapeKeyDown={handleEscapeKey}
              aria-label={ariaLabel}
              role={role}
              onOpenAutoFocus={(event) => {
                if (initialFocus?.current) {
                  event.preventDefault();
                  initialFocus.current.focus();
                }
              }}
            >
              {(title || description) && (
                <Dialog.Header className="flex flex-col space-y-1.5 text-center sm:text-left">
                  {title && (
                    <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
                      {title}
                    </Dialog.Title>
                  )}
                  {description && (
                    <Dialog.Description className="text-sm text-muted-foreground">
                      {description}
                    </Dialog.Description>
                  )}
                </Dialog.Header>
              )}
              {children}
              {showCloseButton && (
                <Dialog.Close
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity',
                    'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    'disabled:pointer-events-none',
                    'data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'
                  )}
                  aria-label={UI_CONSTANTS.ACCESSIBILITY.ARIA_LABELS.CLOSE_BUTTON}
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              )}
            </Dialog.Content>
          </FocusScope.Root>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
);

Modal.displayName = 'Modal';

export { Modal };
export type { ModalProps };