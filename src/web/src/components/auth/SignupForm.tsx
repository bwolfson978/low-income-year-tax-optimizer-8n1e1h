import React, { useCallback, useEffect } from 'react';
import { z } from 'zod'; // v3.22.0
import { SignupData } from '../../types/auth.types';
import useForm from '../../hooks/useForm';
import { Button } from '../ui/Button';
import Input from '../ui/Input';
import { useAuthContext } from '../../context/AuthContext';

// Enhanced password validation regex requiring uppercase, lowercase, numbers, and special characters
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Comprehensive signup validation schema with detailed error messages
const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, numbers, and special characters'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  acceptedTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions')
});

const SignupForm: React.FC = () => {
  const { signup } = useAuthContext();

  // Initialize form with enhanced validation and error handling
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    setFieldError
  } = useForm<SignupData>({
    initialValues: {
      email: '',
      password: '',
      name: '',
      acceptedTerms: false
    },
    validationSchema: signupSchema,
    onSubmit: async (formData) => {
      try {
        const response = await signup(formData);
        if (!response.success) {
          throw new Error(response.error?.message || 'Signup failed');
        }
        return response;
      } catch (error) {
        setFieldError('form', error instanceof Error ? error.message : 'An unexpected error occurred');
        return {
          success: false,
          error: { message: 'Signup failed' },
          data: null
        };
      }
    }
  });

  // Announce form errors to screen readers
  useEffect(() => {
    const formErrors = Object.values(errors).filter(Boolean);
    if (formErrors.length > 0) {
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = formErrors.join('. ');
      document.body.appendChild(announcement);

      return () => {
        document.body.removeChild(announcement);
      };
    }
  }, [errors]);

  // Handle form submission with error boundaries
  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await handleSubmit(e);
    },
    [handleSubmit]
  );

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-6"
      noValidate
      aria-label="Signup form"
    >
      <Input
        id="name"
        name="name"
        type="text"
        label="Full Name"
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.name ? errors.name : undefined}
        required
        autoComplete="name"
        aria-required="true"
        aria-invalid={!!errors.name}
        aria-describedby={errors.name ? 'name-error' : undefined}
      />

      <Input
        id="email"
        name="email"
        type="email"
        label="Email Address"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.email ? errors.email : undefined}
        required
        autoComplete="email"
        aria-required="true"
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'email-error' : undefined}
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.password ? errors.password : undefined}
        required
        autoComplete="new-password"
        aria-required="true"
        aria-invalid={!!errors.password}
        aria-describedby={errors.password ? 'password-error' : undefined}
      />

      <div className="flex items-center space-x-2">
        <input
          id="acceptedTerms"
          name="acceptedTerms"
          type="checkbox"
          checked={values.acceptedTerms}
          onChange={handleChange}
          onBlur={handleBlur}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          aria-required="true"
          aria-invalid={!!errors.acceptedTerms}
          aria-describedby={errors.acceptedTerms ? 'terms-error' : undefined}
        />
        <label
          htmlFor="acceptedTerms"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          I accept the terms and conditions
        </label>
      </div>
      {touched.acceptedTerms && errors.acceptedTerms && (
        <p
          id="terms-error"
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {errors.acceptedTerms}
        </p>
      )}

      {errors.form && (
        <div
          className="rounded-md bg-red-50 dark:bg-red-900/20 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-700 dark:text-red-200">{errors.form}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        isLoading={isSubmitting}
        className="w-full"
        aria-label={isSubmitting ? 'Signing up...' : 'Sign up'}
      >
        {isSubmitting ? 'Signing up...' : 'Sign up'}
      </Button>
    </form>
  );
};

export default SignupForm;