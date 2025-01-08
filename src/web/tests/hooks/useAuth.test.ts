import { renderHook, act, waitFor } from '@testing-library/react'; // ^14.0.0
import { describe, it, expect, jest } from '@jest/globals'; // ^29.0.0
import { User } from '@supabase/supabase-js'; // ^2.39.0
import { useAuth } from '../../src/hooks/useAuth';
import { AuthContext } from '../../src/context/AuthContext';
import { AuthState, LoginCredentials, SignupData } from '../../src/types/auth.types';
import { APIErrorCode } from '../../src/types/api.types';

// Mock user data
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  aud: 'authenticated',
  role: 'authenticated'
};

// Mock credentials
const mockLoginCredentials: LoginCredentials = {
  email: 'test@example.com',
  password: 'Password123!',
  rememberMe: true
};

const mockSignupData: SignupData = {
  email: 'test@example.com',
  password: 'Password123!',
  name: 'Test User',
  acceptedTerms: true
};

// Mock rate limit configuration
const mockRateLimitConfig = {
  maxAttempts: 5,
  timeWindow: 300000, // 5 minutes
  blockDuration: 900000 // 15 minutes
};

// Create mock auth context wrapper
const mockAuthContext = (initialState: Partial<AuthState> = {}, mockFunctions = {}) => {
  const defaultState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: false,
    sessionExpiry: null,
    rememberMe: false,
    ...initialState
  };

  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider
      value={{
        authState: defaultState,
        login: jest.fn().mockResolvedValue({ success: true, data: mockUser }),
        signup: jest.fn().mockResolvedValue({ success: true, data: mockUser }),
        logout: jest.fn().mockResolvedValue(undefined),
        refreshSession: jest.fn().mockResolvedValue({ success: true, data: mockUser }),
        ...mockFunctions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

describe('useAuth Hook', () => {
  // Initial state tests
  it('should initialize with default auth state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: mockAuthContext()
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Login functionality tests
  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext()
      });

      await act(async () => {
        const response = await result.current.login(mockLoginCredentials);
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockUser);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });

    it('should handle invalid credentials', async () => {
      const mockLoginError = {
        success: false,
        error: {
          code: APIErrorCode.UNAUTHORIZED,
          message: 'Invalid email or password'
        }
      };

      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext({}, {
          login: jest.fn().mockRejectedValue(mockLoginError)
        })
      });

      await act(async () => {
        const response = await result.current.login(mockLoginCredentials);
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(APIErrorCode.UNAUTHORIZED);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('should enforce rate limiting', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext()
      });

      // Attempt login multiple times
      for (let i = 0; i < mockRateLimitConfig.maxAttempts + 1; i++) {
        await act(async () => {
          await result.current.login(mockLoginCredentials);
        });
      }

      // Next attempt should be rate limited
      await act(async () => {
        const response = await result.current.login(mockLoginCredentials);
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(APIErrorCode.RATE_LIMIT_EXCEEDED);
      });
    });
  });

  // Signup functionality tests
  describe('signup', () => {
    it('should successfully register with valid data', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext()
      });

      await act(async () => {
        const response = await result.current.signup(mockSignupData);
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockUser);
      });
    });

    it('should validate signup data', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext()
      });

      const invalidData = { ...mockSignupData, email: 'invalid-email' };

      await act(async () => {
        const response = await result.current.signup(invalidData);
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(APIErrorCode.BAD_REQUEST);
      });
    });
  });

  // Logout functionality tests
  describe('logout', () => {
    it('should successfully logout', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext({
          isAuthenticated: true,
          user: mockUser
        })
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should clear rate limit counters on logout', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext({
          isAuthenticated: true,
          user: mockUser
        })
      });

      // Attempt some logins to increment counter
      await act(async () => {
        await result.current.login(mockLoginCredentials);
        await result.current.login(mockLoginCredentials);
      });

      // Logout should reset counters
      await act(async () => {
        await result.current.logout();
      });

      // Should be able to login again immediately
      await act(async () => {
        const response = await result.current.login(mockLoginCredentials);
        expect(response.success).toBe(true);
      });
    });
  });

  // Session management tests
  describe('session management', () => {
    it('should handle session expiry', async () => {
      const expiredSession = new Date(Date.now() - 1000);
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext({
          isAuthenticated: true,
          user: mockUser,
          sessionExpiry: expiredSession
        })
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });
    });

    it('should maintain session with remember me', async () => {
      const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext({
          isAuthenticated: true,
          user: mockUser,
          sessionExpiry: futureExpiry,
          rememberMe: true
        })
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  // Error handling tests
  describe('error handling', () => {
    it('should handle network errors', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext({}, {
          login: jest.fn().mockRejectedValue(new Error('Network error'))
        })
      });

      await act(async () => {
        const response = await result.current.login(mockLoginCredentials);
        expect(response.success).toBe(false);
        expect(response.error?.message).toContain('Network error');
      });
    });

    it('should clear errors on subsequent attempts', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: mockAuthContext()
      });

      // First attempt fails
      await act(async () => {
        await result.current.login({ ...mockLoginCredentials, password: 'wrong' });
      });
      expect(result.current.error).toBeTruthy();

      // Second attempt succeeds and clears error
      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });
      expect(result.current.error).toBeNull();
    });
  });
});