/**
 * Authentication and authorization middleware with JWT validation and role-based access control
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'; // ^4.18.2
import { verifyToken, refreshToken } from '../utils/security/jwt';
import { ApplicationError } from './error.middleware';
import { UserProfile } from '../types/user.types';
import { APIErrorCode } from '../types/api.types';

// Extend Express Request type to include user profile
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

/**
 * Role hierarchy configuration for inheritance-based authorization
 */
const ROLE_HIERARCHY: Record<string, string[]> = {
  ADMIN: ['USER', 'ANALYST'],
  ANALYST: ['USER'],
  USER: []
};

/**
 * Validates and processes authentication tokens for incoming requests
 * Implements automatic token refresh within 5-minute window
 */
export const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApplicationError(
        'No authentication token provided',
        APIErrorCode.UNAUTHORIZED,
        401
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApplicationError(
        'Invalid token format',
        APIErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Get user agent for token fingerprinting
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Verify token and extract user profile
    const userProfile = await verifyToken(token, userAgent);

    // Check for token refresh need
    const newToken = await refreshToken(token, userAgent);
    if (newToken) {
      res.setHeader('X-New-Token', newToken);
    }

    // Attach user profile to request
    req.user = userProfile;

    // Continue to next middleware
    next();
  } catch (error) {
    if (error instanceof ApplicationError) {
      next(error);
    } else {
      next(
        new ApplicationError(
          'Authentication failed',
          APIErrorCode.UNAUTHORIZED,
          401,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }
};

/**
 * Checks if a user has the required role or inherited permissions
 * @param userRoles User's assigned roles
 * @param requiredRole Role to check for
 * @returns boolean indicating if user has required role
 */
const hasRole = (userRoles: string[], requiredRole: string): boolean => {
  return userRoles.some(userRole => {
    // Direct role match
    if (userRole === requiredRole) return true;
    
    // Check role hierarchy
    const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
    return inheritedRoles.includes(requiredRole);
  });
};

/**
 * Middleware factory for role-based authorization
 * Supports role hierarchies and multiple allowed roles
 */
export const authorizeRole = (allowedRoles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new ApplicationError(
          'User profile not found',
          APIErrorCode.UNAUTHORIZED,
          401
        );
      }

      // Check if user has any of the allowed roles
      const hasAllowedRole = allowedRoles.some(role => 
        hasRole(user.roles || [], role)
      );

      if (!hasAllowedRole) {
        throw new ApplicationError(
          'Insufficient permissions',
          APIErrorCode.FORBIDDEN,
          403,
          { 
            requiredRoles: allowedRoles,
            userRoles: user.roles 
          }
        );
      }

      next();
    } catch (error) {
      if (error instanceof ApplicationError) {
        next(error);
      } else {
        next(
          new ApplicationError(
            'Authorization failed',
            APIErrorCode.FORBIDDEN,
            403,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          )
        );
      }
    }
  };
};