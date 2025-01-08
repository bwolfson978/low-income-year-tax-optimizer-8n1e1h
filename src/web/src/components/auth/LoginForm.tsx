import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // ^7.0.0
import * as yup from 'yup'; // ^1.3.0
import Link from 'next/link'; // ^14.0.0
import { useAuth } from '../../hooks/useAuth';
import { Button, buttonVariants } from '../ui/Button';
import Input from '../ui/Input';
import { Eye, EyeOff } from 'lucide-react'; // ^0.3.0

// Form data interface
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Validation schema with security requirements
const validationSchema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .max(255, 'Email is too long'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  rememberMe: yup.boolean()
});

const LoginForm: React.FC = () => {
  const { login, error: authError, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginFormData>({
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      setSubmitError(null);
    };
  }, []);

  // Handle auth error updates
  useEffect(() => {
    if (authError) {
      setSubmitError(authError.message);
    }
  }, [authError]);

  // Secure form submission handler
  const onSubmit = async (data: LoginFormData) => {
    try {
      setSubmitError(null);
      const response = await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error: any) {
      setSubmitError(error.message);
      // Reset password field on error for security
      setError('password', {
        type: 'manual',
        message: 'Please re-enter your password'
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 w-full max-w-md mx-auto p-6 rounded-lg shadow-md dark:shadow-none"
      noValidate
      aria-label="Login form"
    >
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
        Log In
      </h1>

      {submitError && (
        <div
          className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded-md dark:text-red-400 dark:bg-red-900/30"
          role="alert"
          aria-live="polite"
        >
          {submitError}
        </div>
      )}

      <div className="space-y-2">
        <Input
          id="email"
          type="email"
          label="Email"
          {...register('email')}
          error={errors.email?.message}
          disabled={loading}
          required
          autoComplete="email"
          autoFocus
          aria-label="Email address"
        />
      </div>

      <div className="space-y-2 relative">
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          label="Password"
          {...register('password')}
          error={errors.password?.message}
          disabled={loading}
          required
          autoComplete="current-password"
          aria-label="Password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('rememberMe')}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Remember me
          </span>
        </label>

        <Link
          href="/forgot-password"
          className={buttonVariants({
            variant: 'link',
            className: 'text-sm px-0'
          })}
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        isLoading={loading}
        loadingText="Logging in..."
        aria-label={loading ? 'Logging in...' : 'Log in'}
      >
        Log in
      </Button>

      <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className={buttonVariants({
            variant: 'link',
            className: 'text-sm px-0'
          })}
        >
          Sign up
        </Link>
      </p>
    </form>
  );
};

export default LoginForm;