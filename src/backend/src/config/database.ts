import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client/runtime/library';
import { DEFAULT_CACHE_TTL } from './constants';

/**
 * Custom error class for database operations with enhanced tracking
 * @version 1.0.0
 */
export class DatabaseError extends Error {
  public code: string;
  public meta: Record<string, any>;
  public severity: string;
  public context: Record<string, any>;
  public timestamp: Date;

  constructor(message: string, code: string, meta: Record<string, any> = {}) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.meta = meta;
    this.severity = this.determineSeverity(code);
    this.context = {};
    this.timestamp = new Date();
  }

  private determineSeverity(code: string): string {
    const criticalErrors = ['P1001', 'P1002', 'P2024', 'P2025'];
    const warningErrors = ['P2000', 'P2001', 'P2002'];
    return criticalErrors.includes(code) ? 'CRITICAL' : 
           warningErrors.includes(code) ? 'WARNING' : 'ERROR';
  }
}

/**
 * Handles and standardizes database errors with comprehensive tracking
 * @version 1.0.0
 */
function handleDatabaseError(error: Error, context: Record<string, any> = {}): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return new DatabaseError(
      error.message,
      error.code,
      { ...error.meta, ...context }
    );
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError(
      error.message,
      'VALIDATION_ERROR',
      context
    );
  } else {
    return new DatabaseError(
      error.message,
      'UNKNOWN_ERROR',
      context
    );
  }
}

/**
 * Creates and configures a new PrismaClient instance with comprehensive settings
 * @version 1.0.0
 */
function createPrismaClient(): PrismaClient {
  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Parse connection timeouts
  const connectionTimeout = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000');
  const queryTimeout = parseInt(process.env.DATABASE_QUERY_TIMEOUT || '10000');

  // Configure logging based on environment
  const logLevels: Prisma.LogLevel[] = ['error'];
  if (process.env.NODE_ENV !== 'production') {
    logLevels.push('query', 'warn', 'info');
  }

  // Initialize Prisma client with advanced configuration
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      }
    },
    log: logLevels,
    errorFormat: 'pretty',
    __internal: {
      engine: {
        cwd: process.cwd(),
        binaryPath: process.env.PRISMA_QUERY_ENGINE_BINARY,
        datamodelPath: process.env.PRISMA_DATAMODEL_PATH,
      }
    }
  });

  // Configure connection pool settings
  prisma.$connect()
    .then(() => {
      console.log('Database connection established successfully');
    })
    .catch((error) => {
      console.error('Failed to establish database connection:', error);
      process.exit(1);
    });

  // Configure query middleware for soft deletes
  prisma.$use(async (params, next) => {
    if (params.action === 'findUnique' || params.action === 'findFirst' || params.action === 'findMany') {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        deleted_at: null
      };
    }
    return next(params);
  });

  // Configure performance monitoring middleware
  prisma.$use(async (params, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;
    
    if (duration > queryTimeout) {
      console.warn(`Slow query detected (${duration}ms):`, params);
    }
    
    return result;
  });

  // Configure error handling middleware
  prisma.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      throw handleDatabaseError(error as Error, {
        model: params.model,
        action: params.action,
        args: params.args
      });
    }
  });

  // Configure automatic retries for transient errors
  prisma.$use(async (params, next) => {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await next(params);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // Retry only on connection errors
          if (['P1001', 'P1002'].includes(error.code) && attempt < maxRetries - 1) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }
        throw error;
      }
    }
  });

  return prisma;
}

// Create singleton instance
const prisma = createPrismaClient();

// Export configured client and error handling utilities
export { prisma, DatabaseError };