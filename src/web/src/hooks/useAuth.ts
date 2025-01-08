import { useState, useCallback } from 'react'; // ^18.0.0
import { useAuthContext } from '../context/AuthContext';
import { AuthState, LoginCredentials, SignupData, AuthResponse } from '../types/auth.types';
import { APIErrorCode } from '../types/api.types';

// Error messages for user-facing feedback
const ERROR_MESSAGES = {
  LOGIN_FAILED: 'Login failed. Please check your credentials and try again.',
  SIGNUP_FAILED: 'Registration failed. Please verify your information and try again.',
  LOGOUT_FAILED: 'Logout failed. Please try again or contact support.',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid email or password format.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  NETWORK_ERROR: 'Network error. Please check your connection.'
} as const;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  BLOCK_DURATION_MS: 15 * 60 * 1000 // 15 minutes
} as const;

// Interface for authentication errors
interface AuthError {
  code: APIErrorCode;
  message: string;
  timestamp: Date;
}

/**
 * Custom hook for managing authentication state and operations with enhanced security
 * and comprehensive error handling.
 */
export function useAuth() {
  const { authState, login: contextLogin, signup: contextSignup, logout: contextLogout } = useAuthContext();
  const [error, setError] = useState<AuthError | null>(null);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Check rate limiting status
  const checkRateLimit = useCallback((): boolean => {
    if (!lastAttempt) return true;

    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();

    // Reset attempts if window has passed
    if (timeSinceLastAttempt > RATE_LIMIT_CONFIG.WINDOW_MS) {
      setAttemptCount(0);
      setLastAttempt(null);
      return true;
    }

    // Check if blocked
    if (attemptCount >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
      if (timeSinceLastAttempt < RATE_LIMIT_CONFIG.BLOCK_DURATION_MS) {
        setError({
          code: APIErrorCode.RATE_LIMIT_EXCEEDED,
          message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
          timestamp: new Date()
        });
        return false;
      }
      // Reset after block duration
      setAttemptCount(0);
      setLastAttempt(null);
      return true;
    }

    return true;
  }, [lastAttempt, attemptCount]);

  // Enhanced login handler with security checks
  const handleLogin = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (!checkRateLimit()) {
      return {
        success: false,
        error: {
          code: APIErrorCode.RATE_LIMIT_EXCEEDED,
          message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
        },
        data: null,
        metadata: null
      };
    }

    setError(null);
    setLastAttempt(new Date());
    setAttemptCount(prev => prev + 1);

    try {
      // Validate credentials format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credentials.email) || !credentials.password) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      const response = await contextLogin(credentials);
      
      if (!response.success) {
        throw new Error(response.error?.message || ERROR_MESSAGES.LOGIN_FAILED);
      }

      setAttemptCount(0);
      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: err.code || APIErrorCode.UNAUTHORIZED,
        message: err.message || ERROR_MESSAGES.LOGIN_FAILED,
        timestamp: new Date()
      };
      setError(authError);
      
      return {
        success: false,
        error: authError,
        data: null,
        metadata: null
      };
    }
  }, [contextLogin, checkRateLimit]);

  // Enhanced signup handler with validation
  const handleSignup = useCallback(async (data: SignupData): Promise<AuthResponse> => {
    if (!checkRateLimit()) {
      return {
        success: false,
        error: {
          code: APIErrorCode.RATE_LIMIT_EXCEEDED,
          message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
        },
        data: null,
        metadata: null
      };
    }

    setError(null);
    setLastAttempt(new Date());
    setAttemptCount(prev => prev + 1);

    try {
      // Validate signup data
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
      
      if (!emailRegex.test(data.email) || !passwordRegex.test(data.password)) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      if (!data.acceptedTerms) {
        throw new Error('Terms and conditions must be accepted.');
      }

      const response = await contextSignup(data);
      
      if (!response.success) {
        throw new Error(response.error?.message || ERROR_MESSAGES.SIGNUP_FAILED);
      }

      setAttemptCount(0);
      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: err.code || APIErrorCode.BAD_REQUEST,
        message: err.message || ERROR_MESSAGES.SIGNUP_FAILED,
        timestamp: new Date()
      };
      setError(authError);
      
      return {
        success: false,
        error: authError,
        data: null,
        metadata: null
      };
    }
  }, [contextSignup, checkRateLimit]);

  // Enhanced logout handler with cleanup
  const handleLogout = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await contextLogout();
      // Clear any sensitive data from memory
      setAttemptCount(0);
      setLastAttempt(null);
    } catch (err: any) {
      const authError: AuthError = {
        code: APIErrorCode.INTERNAL_ERROR,
        message: ERROR_MESSAGES.LOGOUT_FAILED,
        timestamp: new Date()
      };
      setError(authError);
    }
  }, [contextLogout]);

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    error,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout
  };
}