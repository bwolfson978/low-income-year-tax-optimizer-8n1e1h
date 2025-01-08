/**
 * JWT utility functions for secure token generation, verification, and management
 * Implements RS256 signing with automatic refresh capabilities
 * @version 1.0.0
 */

import { sign, verify, decode, JwtPayload } from 'jsonwebtoken'; // ^9.0.0
import { createHash } from 'crypto';
import { UserProfile } from '../../types/user.types';
import { APIError, APIErrorCode } from '../../types/api.types';

// Environment variables and constants
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
const JWT_EXPIRATION = 1800; // 30 minutes in seconds
const JWT_REFRESH_WINDOW = 300; // 5 minutes in seconds
const JWT_ALGORITHM = 'RS256';

// In-memory token blacklist (should be replaced with Redis in production)
const tokenBlacklist = new Set<string>();

/**
 * Generates a fingerprint for additional token security
 * @param userAgent - Client user agent string
 * @returns Token fingerprint hash
 */
const generateFingerprint = (userAgent: string): string => {
  const timestamp = new Date().toISOString();
  return createHash('sha256')
    .update(`${userAgent}${timestamp}`)
    .digest('hex');
};

/**
 * Generates a secure JWT token for authenticated users
 * @param user - User profile data to encode in token
 * @param userAgent - Client user agent for fingerprinting
 * @returns Promise resolving to signed JWT token
 * @throws APIError if token generation fails
 */
export const generateToken = async (
  user: UserProfile,
  userAgent: string
): Promise<string> => {
  try {
    if (!JWT_PRIVATE_KEY) {
      throw new APIError({
        code: APIErrorCode.INTERNAL_ERROR,
        message: 'JWT signing key not configured',
        details: null,
        stack: null
      });
    }

    const fingerprint = generateFingerprint(userAgent);
    const jti = createHash('sha256').update(crypto.randomBytes(32)).digest('hex');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fingerprint,
      iss: 'tax-optimizer',
      aud: 'tax-optimizer-client',
      jti,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRATION
    };

    const token = sign(payload, JWT_PRIVATE_KEY, {
      algorithm: JWT_ALGORITHM
    });

    return token;
  } catch (error) {
    throw new APIError({
      code: APIErrorCode.INTERNAL_ERROR,
      message: 'Failed to generate token',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      stack: error instanceof Error ? error.stack : null
    });
  }
};

/**
 * Verifies JWT token authenticity and extracts user data
 * @param token - JWT token to verify
 * @param userAgent - Client user agent for fingerprint validation
 * @returns Promise resolving to decoded user profile
 * @throws APIError for invalid or expired tokens
 */
export const verifyToken = async (
  token: string,
  userAgent: string
): Promise<UserProfile> => {
  try {
    if (!JWT_PUBLIC_KEY) {
      throw new APIError({
        code: APIErrorCode.INTERNAL_ERROR,
        message: 'JWT verification key not configured',
        details: null,
        stack: null
      });
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      throw new APIError({
        code: APIErrorCode.UNAUTHORIZED,
        message: 'Token has been invalidated',
        details: null,
        stack: null
      });
    }

    const decoded = verify(token, JWT_PUBLIC_KEY, {
      algorithms: [JWT_ALGORITHM]
    }) as JwtPayload;

    // Verify fingerprint
    const currentFingerprint = generateFingerprint(userAgent);
    if (decoded.fingerprint !== currentFingerprint) {
      throw new APIError({
        code: APIErrorCode.UNAUTHORIZED,
        message: 'Invalid token fingerprint',
        details: null,
        stack: null
      });
    }

    return {
      id: decoded.sub as string,
      email: decoded.email as string
    } as UserProfile;
  } catch (error) {
    if (error instanceof APIError) throw error;

    throw new APIError({
      code: APIErrorCode.UNAUTHORIZED,
      message: 'Invalid or expired token',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      stack: error instanceof Error ? error.stack : null
    });
  }
};

/**
 * Implements sliding window refresh for tokens near expiration
 * @param currentToken - Current JWT token
 * @param userAgent - Client user agent for new token generation
 * @returns Promise resolving to new token if refresh needed, null otherwise
 * @throws APIError if refresh fails
 */
export const refreshToken = async (
  currentToken: string,
  userAgent: string
): Promise<string | null> => {
  try {
    const decoded = decode(currentToken) as JwtPayload;
    if (!decoded || !decoded.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    // Only refresh if within refresh window
    if (timeUntilExpiry > JWT_REFRESH_WINDOW) return null;

    // Verify current token is still valid before refreshing
    const user = await verifyToken(currentToken, userAgent);

    // Generate new token
    const newToken = await generateToken(user, userAgent);

    // Invalidate old token
    tokenBlacklist.add(decoded.jti as string);

    return newToken;
  } catch (error) {
    throw new APIError({
      code: APIErrorCode.UNAUTHORIZED,
      message: 'Token refresh failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      stack: error instanceof Error ? error.stack : null
    });
  }
};

/**
 * Checks if a token has been invalidated
 * @param token - JWT token to check
 * @returns Promise resolving to blacklist status
 */
const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const decoded = decode(token) as JwtPayload;
    if (!decoded || !decoded.jti) return true;
    return tokenBlacklist.has(decoded.jti);
  } catch {
    return true;
  }
};