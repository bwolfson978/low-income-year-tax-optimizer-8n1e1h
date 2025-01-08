import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // ^7.0.0
import * as yup from 'yup'; // ^1.3.0
import { useAuth } from '../../hooks/useAuth';
import { ResetPasswordData } from '../../types/auth.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ResetPasswordFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Validation schema with security requirements
const validationSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email address is required')
    .email('Please enter a valid email address')
    .transform(value => value.toLowerCase())
    .max(255)
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email address'
    ),
});

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
  onError,
}) => {
  const { resetPassword, checkRateLimit } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rateLimitStatus, setRateLimitStatus] = useState({
    attempts: 0,
    resetTime: null as Date | null,
  });

  const {
    register,
    handleSubmit: formHandleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<ResetPasswordData>({
    resolver: async (data) => {
      try {
        await validationSchema.validate(data, { abortEarly: false });
        return { values: data, errors: {} };
      } catch (err) {
        if (err instanceof yup.ValidationError) {
          const errors = err.inner.reduce((acc, error) => {
            if (error.path) {
              acc[error.path] = error.message;
            }
            return acc;
          }, {} as Record<string, string>);
          return { values: {}, errors };
        }
        return { values: {}, errors: { email: 'Validation failed' } };
      }
    },
  });

  // Reset rate limit status when time expires
  useEffect(() => {
    if (rateLimitStatus.resetTime && new Date() >= rateLimitStatus.resetTime) {
      setRateLimitStatus({ attempts: 0, resetTime: null });
    }
  }, [rateLimitStatus.resetTime]);

  // Announce success/error messages to screen readers
  useEffect(() => {
    if (success) {
      const message = 'Password reset email sent successfully';
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = message;
      document.body.appendChild(announcement);
      return () => document.body.removeChild(announcement);
    }
  }, [success]);

  const handleSubmit = async (data: ResetPasswordData) => {
    try {
      // Check rate limiting
      const canProceed = await checkRateLimit();
      if (!canProceed) {
        onError('Too many attempts. Please try again later.');
        return;
      }

      setLoading(true);
      setSuccess(false);

      // Sanitize email input
      const sanitizedEmail = data.email.toLowerCase().trim();

      // Add CSRF token from session if available
      const csrfToken = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]'
      )?.content;

      const response = await resetPassword({
        email: sanitizedEmail,
        token: null,
        ...(csrfToken && { csrf: csrfToken }),
      });

      if (response.success) {
        setSuccess(true);
        resetForm();
        onSuccess();
        // Update rate limit tracking
        setRateLimitStatus(prev => ({
          attempts: prev.attempts + 1,
          resetTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        }));
      } else {
        throw new Error(response.error?.message || 'Password reset failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError(errorMessage);
      setRateLimitStatus(prev => ({
        attempts: prev.attempts + 1,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={formHandleSubmit(handleSubmit)}
      className="space-y-4 w-full max-w-md mx-auto"
      noValidate
    >
      <div className="space-y-2">
        <Input
          id="reset-password-email"
          type="email"
          label="Email Address"
          error={errors.email?.message}
          {...register('email')}
          disabled={loading}
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          placeholder="Enter your email address"
        />
        
        {rateLimitStatus.attempts > 0 && (
          <p
            className="text-sm text-yellow-500 dark:text-yellow-400"
            role="alert"
          >
            {`${5 - rateLimitStatus.attempts} attempts remaining`}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="default"
        size="lg"
        isLoading={loading}
        disabled={loading || rateLimitStatus.attempts >= 5}
        className="w-full"
        aria-label="Reset password"
      >
        Reset Password
      </Button>

      {success && (
        <p
          className="text-sm text-green-500 dark:text-green-400 text-center"
          role="status"
          aria-live="polite"
        >
          Check your email for password reset instructions
        </p>
      )}
    </form>
  );
};

export default ResetPasswordForm;