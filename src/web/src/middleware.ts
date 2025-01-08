import { NextResponse } from 'next/server'; // v14.0.0
import { NextRequest } from 'next/server'; // v14.0.0
import winston from 'winston'; // v3.11.0
import { supabase } from './lib/supabase';
import { APIErrorCode } from './types/api.types';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/reset-password',
  '/',
  '/privacy',
  '/terms'
];

// Rate limiting configuration
const RATE_LIMIT = {
  window: '1m',
  max: 100
};

// Comprehensive security headers for all responses
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://*.supabase.co",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-XSS-Protection': '1; mode=block',
  'X-DNS-Prefetch-Control': 'off'
};

// Configure logger for monitoring
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Rate limiting implementation using Map
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const limit = RATE_LIMIT.max;

  const record = rateLimitStore.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count += 1;
  }

  rateLimitStore.set(ip, record);
  return record.count <= limit;
};

/**
 * NextJS middleware function for handling authentication, security, and monitoring
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  // Check rate limiting
  if (!checkRateLimit(ip)) {
    logger.warn({
      message: 'Rate limit exceeded',
      ip,
      requestId,
      path: request.nextUrl.pathname
    });

    return new NextResponse(JSON.stringify({
      success: false,
      error: {
        code: APIErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests',
        details: null,
        timestamp: new Date(),
        path: request.nextUrl.pathname
      }
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...SECURITY_HEADERS
      }
    });
  }

  // Check if route requires authentication
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (!isPublicRoute) {
    try {
      // Verify JWT token
      const token = request.cookies.get('sb-access-token')?.value;
      if (!token) {
        throw new Error('No authentication token');
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        throw error || new Error('Invalid authentication');
      }

      // Add user context to request headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', user.id);
      requestHeaders.set('x-user-role', user.role || 'user');

      // Create response with modified headers
      const response = NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });

      // Add security headers
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Log successful request
      logger.info({
        message: 'Authenticated request processed',
        requestId,
        userId: user.id,
        path: request.nextUrl.pathname,
        duration: Date.now() - startTime,
        ip
      });

      return response;
    } catch (error) {
      // Log authentication failure
      logger.error({
        message: 'Authentication failed',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        path: request.nextUrl.pathname,
        ip
      });

      // Redirect to login for authenticated routes
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle public routes
  const response = NextResponse.next();

  // Add security headers to public routes
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Log public route access
  logger.info({
    message: 'Public route accessed',
    requestId,
    path: request.nextUrl.pathname,
    duration: Date.now() - startTime,
    ip
  });

  return response;
}

// Configure middleware to run on all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)'
  ]
};