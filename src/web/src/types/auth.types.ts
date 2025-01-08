import { User } from '@supabase/supabase-js'; // v2.39.0
import { APIResponse } from '../types/api.types';

/**
 * Represents the global authentication state of the application
 * Includes user information, authentication status, and session management
 */
export interface AuthState {
  /** Indicates if user is currently authenticated */
  isAuthenticated: boolean;
  /** Current user information from Supabase, null if not authenticated */
  user: User | null;
  /** Indicates if authentication state is being determined */
  loading: boolean;
  /** Timestamp for session expiration, null if no active session */
  sessionExpiry: Date | null;
}

/**
 * Login credentials structure with remember me functionality
 * Used for user authentication requests
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  /** User's password (will be securely hashed) */
  password: string;
  /** Indicates if the session should be remembered */
  rememberMe: boolean;
}

/**
 * Registration data structure with required user information
 * Includes terms acceptance for legal compliance
 */
export interface SignupData {
  /** User's email address */
  email: string;
  /** User's password (must meet security requirements) */
  password: string;
  /** User's full name */
  name: string;
  /** Indicates user has accepted terms and conditions */
  acceptedTerms: boolean;
}

/**
 * Password reset request data structure
 * Supports both initiating reset and confirming with token
 */
export interface ResetPasswordData {
  /** User's email address */
  email: string;
  /** Reset token received via email, null when initiating reset */
  token: string | null;
}

/**
 * Type alias for authentication operation responses
 * Extends generic APIResponse with AuthState type
 */
export type AuthResponse = APIResponse<AuthState>;

/**
 * Comprehensive authentication context interface for React
 * Provides all necessary authentication operations and state management
 */
export interface AuthContextType {
  /** Current authentication state */
  authState: AuthState;
  
  /**
   * Authenticates user with provided credentials
   * @param credentials User login credentials
   * @returns Promise resolving to authentication response
   */
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  
  /**
   * Registers new user with provided data
   * @param data User registration data
   * @returns Promise resolving to authentication response
   */
  signup: (data: SignupData) => Promise<AuthResponse>;
  
  /**
   * Logs out current user and clears session
   * @returns Promise resolving when logout is complete
   */
  logout: () => Promise<void>;
  
  /**
   * Initiates or confirms password reset process
   * @param data Password reset request data
   * @returns Promise resolving to authentication response
   */
  resetPassword: (data: ResetPasswordData) => Promise<AuthResponse>;
  
  /**
   * Refreshes current authentication session
   * @returns Promise resolving to authentication response
   */
  refreshSession: () => Promise<AuthResponse>;
}