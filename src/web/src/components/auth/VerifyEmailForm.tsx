import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { analytics } from '@segment/analytics-next';
import { buttonVariants } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { APIErrorCode } from '../../types/api.types';

interface VerifyEmailFormProps {
  className?: string;
  onVerificationComplete?: () => void;
}

const VerifyEmailForm: React.FC<VerifyEmailFormProps> = ({
  className,
  onVerificationComplete
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(3);
  const [rateLimitReset, setRateLimitReset] = useState(0);

  // Hooks
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerification, getRateLimitStatus } = useAuth();
  const { toast } = useToast();

  // Extract token from URL if present
  const token = searchParams.get('token');

  // Handle automatic verification when token is present
  useEffect(() => {
    if (token && !isVerified) {
      handleVerification(token);
    }
  }, [token]);

  // Monitor rate limit status
  useEffect(() => {
    const checkRateLimit = async () => {
      const { remaining, resetTime } = await getRateLimitStatus();
      setRateLimitRemaining(remaining);
      setRateLimitReset(resetTime);
    };

    checkRateLimit();
  }, [getRateLimitStatus]);

  /**
   * Handles email verification process with security checks
   */
  const handleVerification = async (verificationToken: string) => {
    // Validate token format
    if (!verificationToken.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
      toast({
        type: 'error',
        message: 'Invalid verification token format',
        ariaLabel: 'Verification error'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Track verification attempt
      analytics.track('Email Verification Attempted', {
        hasToken: true,
        timestamp: new Date().toISOString()
      });

      const response = await verifyEmail(verificationToken);

      if (response.success) {
        setIsVerified(true);
        toast({
          type: 'success',
          message: 'Email verified successfully',
          ariaLabel: 'Verification successful'
        });
        onVerificationComplete?.();

        // Track successful verification
        analytics.track('Email Verification Completed', {
          success: true,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(response.error?.message || 'Verification failed');
      }
    } catch (error: any) {
      // Handle specific error cases
      const errorMessage = error.code === APIErrorCode.RATE_LIMIT_EXCEEDED
        ? 'Too many verification attempts. Please try again later.'
        : error.message || 'Failed to verify email. Please try again.';

      toast({
        type: 'error',
        message: errorMessage,
        ariaLabel: 'Verification error'
      });

      // Track failed verification
      analytics.track('Email Verification Failed', {
        error: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles resending verification email with rate limiting
   */
  const handleResendVerification = async () => {
    if (rateLimitRemaining <= 0) {
      const resetInMinutes = Math.ceil((rateLimitReset - Date.now()) / 60000);
      toast({
        type: 'warning',
        message: `Rate limit reached. Please try again in ${resetInMinutes} minutes.`,
        ariaLabel: 'Rate limit warning'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Track resend attempt
      analytics.track('Verification Email Resend Attempted', {
        timestamp: new Date().toISOString()
      });

      const response = await resendVerification();

      if (response.success) {
        toast({
          type: 'success',
          message: 'Verification email sent successfully',
          ariaLabel: 'Email sent'
        });

        // Update rate limit status
        setRateLimitRemaining(prev => prev - 1);

        // Track successful resend
        analytics.track('Verification Email Resent', {
          success: true,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(response.error?.message || 'Failed to resend verification email');
      }
    } catch (error: any) {
      toast({
        type: 'error',
        message: error.message || 'Failed to resend verification email. Please try again.',
        ariaLabel: 'Resend error'
      });

      // Track failed resend
      analytics.track('Verification Email Resend Failed', {
        error: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col items-center space-y-4 p-6 ${className}`}
      role="region"
      aria-label="Email verification"
    >
      {/* Verification Status */}
      <div
        className="text-center"
        role="status"
        aria-live="polite"
      >
        {isVerified ? (
          <p className="text-green-600 dark:text-green-400 font-medium">
            ✓ Email verified successfully
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">
            Please verify your email address to continue
          </p>
        )}
      </div>

      {/* Resend Button */}
      {!isVerified && (
        <button
          onClick={handleResendVerification}
          disabled={isLoading || rateLimitRemaining <= 0}
          className={buttonVariants({
            variant: 'outline',
            size: 'lg',
            className: 'w-full max-w-sm'
          })}
          aria-busy={isLoading}
          aria-disabled={isLoading || rateLimitRemaining <= 0}
        >
          {isLoading ? 'Sending...' : 'Resend Verification Email'}
        </button>
      )}

      {/* Rate Limit Information */}
      {rateLimitRemaining < 3 && !isVerified && (
        <p
          className="text-sm text-gray-500 dark:text-gray-400"
          role="alert"
          aria-live="polite"
        >
          {rateLimitRemaining > 0
            ? `${rateLimitRemaining} attempts remaining`
            : `Please try again in ${Math.ceil((rateLimitReset - Date.now()) / 60000)} minutes`
          }
        </p>
      )}
    </div>
  );
};

export default VerifyEmailForm;