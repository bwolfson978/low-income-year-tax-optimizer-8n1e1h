import { AuthError } from '@supabase/supabase-js'; // ^2.39.0
import winston from 'winston'; // ^3.11.0
import { UserProfile, UserAuthRequest } from '../../types/user.types';
import { supabase } from '../../config/supabase';
import { generateToken, verifyToken } from '../../utils/security/jwt';
import { RateLimiter, createRateLimiter } from '../../utils/security/rate-limiter';
import { APIError, APIErrorCode } from '../../types/api.types';
import { SYSTEM_CONFIG } from '../../config/constants';

/**
 * Comprehensive authentication service with enhanced security features
 * @version 1.0.0
 */
export class AuthService {
  private readonly rateLimiter: RateLimiter;
  private readonly logger: winston.Logger;
  private readonly loginAttempts: Map<string, number>;
  private readonly lockoutTimestamps: Map<string, number>;

  constructor() {
    // Initialize rate limiter for auth endpoints
    this.rateLimiter = createRateLimiter({
      points: SYSTEM_CONFIG.MAX_LOGIN_ATTEMPTS,
      duration: SYSTEM_CONFIG.LOCKOUT_DURATION_MINUTES * 60,
      errorMessage: 'Too many authentication attempts'
    });

    // Initialize login tracking
    this.loginAttempts = new Map();
    this.lockoutTimestamps = new Map();

    // Configure secure logging
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'auth-events.log' })
      ]
    });
  }

  /**
   * Registers a new user with comprehensive security checks
   * @param registrationData User registration data
   * @returns Promise resolving to user profile and tokens
   * @throws APIError for validation or registration failures
   */
  public async signUp(registrationData: UserAuthRequest): Promise<{
    user: UserProfile;
    token: string;
  }> {
    try {
      // Validate password strength
      this.validatePassword(registrationData.password);

      // Check rate limiting for registration
      await this.rateLimiter.consume(registrationData.email);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          emailRedirectTo: `${process.env.APP_URL}/verify-email`
        }
      });

      if (authError) throw authError;

      // Create user profile
      const userProfile: UserProfile = {
        id: authData.user!.id,
        email: authData.user!.email!,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        created_by: authData.user!.id,
        updated_by: authData.user!.id,
        version: 1
      };

      // Generate secure tokens
      const token = await generateToken(userProfile, registrationData.userAgent);

      // Log successful registration
      this.logger.info('User registration successful', {
        userId: userProfile.id,
        email: userProfile.email
      });

      return { user: userProfile, token };
    } catch (error) {
      this.handleAuthError(error, 'User registration failed');
    }
  }

  /**
   * Authenticates user with enhanced security measures
   * @param credentials User login credentials
   * @returns Promise resolving to user profile and tokens
   * @throws APIError for invalid credentials or security violations
   */
  public async signIn(credentials: UserAuthRequest): Promise<{
    user: UserProfile;
    token: string;
  }> {
    try {
      // Check account lockout
      if (this.isAccountLocked(credentials.email)) {
        throw new APIError({
          code: APIErrorCode.UNAUTHORIZED,
          message: 'Account temporarily locked',
          details: { remainingTime: this.getLockoutRemaining(credentials.email) },
          stack: null
        });
      }

      // Check rate limiting
      await this.rateLimiter.consume(credentials.email);

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (authError) {
        this.incrementLoginAttempts(credentials.email);
        throw authError;
      }

      // Reset login attempts on successful login
      this.loginAttempts.delete(credentials.email);

      const userProfile: UserProfile = {
        id: authData.user.id,
        email: authData.user.email!,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        created_by: authData.user.id,
        updated_by: authData.user.id,
        version: 1
      };

      // Generate secure token
      const token = await generateToken(userProfile, credentials.userAgent);

      // Log successful login
      this.logger.info('User login successful', {
        userId: userProfile.id,
        email: userProfile.email
      });

      return { user: userProfile, token };
    } catch (error) {
      this.handleAuthError(error, 'Login failed');
    }
  }

  /**
   * Securely terminates user session
   * @param token Current session token
   * @returns Promise resolving to void
   * @throws APIError for invalid tokens or logout failures
   */
  public async signOut(token: string): Promise<void> {
    try {
      // Verify token before processing logout
      await verifyToken(token, '');

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Log successful logout
      this.logger.info('User logout successful', {
        token: token.substring(0, 10) + '...'
      });
    } catch (error) {
      this.handleAuthError(error, 'Logout failed');
    }
  }

  /**
   * Handles secure password reset process
   * @param email User email address
   * @returns Promise resolving to void
   * @throws APIError for invalid email or reset failures
   */
  public async resetPassword(email: string): Promise<void> {
    try {
      // Check rate limiting for password reset
      await this.rateLimiter.consume(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.APP_URL}/reset-password`
      });

      if (error) throw error;

      // Log password reset request
      this.logger.info('Password reset requested', { email });
    } catch (error) {
      this.handleAuthError(error, 'Password reset failed');
    }
  }

  /**
   * Validates and processes email verification
   * @param token Email verification token
   * @returns Promise resolving to verification status
   * @throws APIError for invalid tokens or verification failures
   */
  public async verifyEmail(token: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) throw error;

      // Log successful verification
      this.logger.info('Email verification successful', {
        token: token.substring(0, 10) + '...'
      });

      return true;
    } catch (error) {
      this.handleAuthError(error, 'Email verification failed');
    }
  }

  /**
   * Validates password strength against security requirements
   * @param password Password to validate
   * @throws APIError for insufficient password strength
   */
  private validatePassword(password: string): void {
    const minLength = SYSTEM_CONFIG.PASSWORD_MIN_LENGTH;
    const requiresSpecial = SYSTEM_CONFIG.PASSWORD_REQUIRES_SPECIAL;

    if (password.length < minLength) {
      throw new APIError({
        code: APIErrorCode.VALIDATION_ERROR,
        message: `Password must be at least ${minLength} characters long`,
        details: null,
        stack: null
      });
    }

    if (requiresSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new APIError({
        code: APIErrorCode.VALIDATION_ERROR,
        message: 'Password must contain at least one special character',
        details: null,
        stack: null
      });
    }
  }

  /**
   * Tracks failed login attempts and manages account lockouts
   * @param email User email address
   */
  private incrementLoginAttempts(email: string): void {
    const attempts = (this.loginAttempts.get(email) || 0) + 1;
    this.loginAttempts.set(email, attempts);

    if (attempts >= SYSTEM_CONFIG.MAX_LOGIN_ATTEMPTS) {
      this.lockoutTimestamps.set(email, Date.now());
      this.logger.warn('Account locked due to multiple failed attempts', { email });
    }
  }

  /**
   * Checks if an account is currently locked out
   * @param email User email address
   * @returns boolean indicating lockout status
   */
  private isAccountLocked(email: string): boolean {
    const lockoutTime = this.lockoutTimestamps.get(email);
    if (!lockoutTime) return false;

    const lockoutDuration = SYSTEM_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000;
    const isLocked = Date.now() - lockoutTime < lockoutDuration;

    if (!isLocked) {
      this.lockoutTimestamps.delete(email);
      this.loginAttempts.delete(email);
    }

    return isLocked;
  }

  /**
   * Calculates remaining lockout time
   * @param email User email address
   * @returns Remaining lockout time in seconds
   */
  private getLockoutRemaining(email: string): number {
    const lockoutTime = this.lockoutTimestamps.get(email);
    if (!lockoutTime) return 0;

    const lockoutDuration = SYSTEM_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000;
    const remaining = Math.max(0, lockoutDuration - (Date.now() - lockoutTime));
    return Math.ceil(remaining / 1000);
  }

  /**
   * Handles authentication errors with logging and standardized responses
   * @param error Error to handle
   * @param message Error context message
   * @throws APIError with standardized format
   */
  private handleAuthError(error: unknown, message: string): never {
    this.logger.error(message, { error });

    if (error instanceof APIError) throw error;

    if (error instanceof AuthError) {
      throw new APIError({
        code: APIErrorCode.UNAUTHORIZED,
        message: error.message,
        details: { supabaseError: error.name },
        stack: error.stack
      });
    }

    throw new APIError({
      code: APIErrorCode.INTERNAL_ERROR,
      message,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      stack: error instanceof Error ? error.stack : null
    });
  }
}