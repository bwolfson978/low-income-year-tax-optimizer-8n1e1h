import React, { createContext, useCallback, useEffect, useState } from 'react'; // ^18.0.0
import { User } from '@supabase/supabase-js'; // ^2.39.0
import { AuthState, AuthContextType, LoginCredentials, SignupData } from '../types/auth.types';
import { APIResponse, APIErrorCode } from '../types/api.types';
import supabase from '../lib/supabase';

// Initial authentication state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  sessionExpiry: null,
  rememberMe: false
};

// Authentication rate limiting and session duration constants
const AUTH_RATE_LIMIT = 100; // requests per minute
const SESSION_DURATION = {
  default: 1800000, // 30 minutes
  remembered: 2592000000 // 30 days
};

// Create the authentication context
export const AuthContext = createContext<AuthContextType>({
  authState: initialAuthState,
  login: async () => ({ success: false, error: null, data: null }),
  signup: async () => ({ success: false, error: null, data: null }),
  logout: async () => {},
  refreshSession: async () => ({ success: false, error: null, data: null })
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [rateLimitCounter, setRateLimitCounter] = useState<number>(0);

  // Reset rate limit counter every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimitCounter(0);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const expiryTime = new Date(session.expires_at! * 1000);
        setAuthState({
          isAuthenticated: true,
          user: session.user,
          loading: false,
          sessionExpiry: expiryTime,
          rememberMe: localStorage.getItem('rememberMe') === 'true'
        });
      } else {
        setAuthState({
          ...initialAuthState,
          loading: false
        });
      }
    });

    // Initial session check
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check current session status
  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session) {
        const expiryTime = new Date(session.expires_at! * 1000);
        setAuthState({
          isAuthenticated: true,
          user: session.user,
          loading: false,
          sessionExpiry: expiryTime,
          rememberMe: localStorage.getItem('rememberMe') === 'true'
        });
      } else {
        setAuthState({
          ...initialAuthState,
          loading: false
        });
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setAuthState({
        ...initialAuthState,
        loading: false
      });
    }
  };

  // Login handler with rate limiting
  const login = async (credentials: LoginCredentials): Promise<APIResponse> => {
    if (rateLimitCounter >= AUTH_RATE_LIMIT) {
      return {
        success: false,
        error: {
          code: APIErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many login attempts. Please try again later.'
        },
        data: null,
        metadata: null
      };
    }

    setRateLimitCounter(prev => prev + 1);
    setAuthState(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;

      const sessionDuration = credentials.rememberMe
        ? SESSION_DURATION.remembered
        : SESSION_DURATION.default;

      localStorage.setItem('rememberMe', credentials.rememberMe.toString());

      const expiryTime = new Date(Date.now() + sessionDuration);
      setAuthState({
        isAuthenticated: true,
        user: data.user,
        loading: false,
        sessionExpiry: expiryTime,
        rememberMe: credentials.rememberMe
      });

      return {
        success: true,
        data: data.user,
        error: null,
        metadata: null
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: APIErrorCode.UNAUTHORIZED,
          message: error.message || 'Authentication failed'
        },
        data: null,
        metadata: null
      };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Signup handler with validation
  const signup = async (data: SignupData): Promise<APIResponse> => {
    if (rateLimitCounter >= AUTH_RATE_LIMIT) {
      return {
        success: false,
        error: {
          code: APIErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many signup attempts. Please try again later.'
        },
        data: null,
        metadata: null
      };
    }

    setRateLimitCounter(prev => prev + 1);
    setAuthState(prev => ({ ...prev, loading: true }));

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            accepted_terms: data.acceptedTerms
          }
        }
      });

      if (error) throw error;

      return {
        success: true,
        data: authData,
        error: null,
        metadata: null
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: APIErrorCode.BAD_REQUEST,
          message: error.message || 'Signup failed'
        },
        data: null,
        metadata: null
      };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Logout handler with cleanup
  const logout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      localStorage.removeItem('rememberMe');
      setAuthState(initialAuthState);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Session refresh handler
  const refreshSession = async (): Promise<APIResponse> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (session) {
        const expiryTime = new Date(session.expires_at! * 1000);
        setAuthState({
          isAuthenticated: true,
          user: session.user,
          loading: false,
          sessionExpiry: expiryTime,
          rememberMe: localStorage.getItem('rememberMe') === 'true'
        });

        return {
          success: true,
          data: session,
          error: null,
          metadata: null
        };
      }

      throw new Error('Session refresh failed');
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: APIErrorCode.UNAUTHORIZED,
          message: error.message || 'Session refresh failed'
        },
        data: null,
        metadata: null
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        signup,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;