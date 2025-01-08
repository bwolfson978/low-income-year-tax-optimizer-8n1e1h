import http from 'http';
import winston from 'winston';
import pino from 'pino';
import app from './app';

// Initialize logger with ISO timestamps and structured format
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'tax-optimizer-server' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Initialize performance monitoring
const metrics = pino({
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime
});

/**
 * Normalizes port value with validation
 * @param val Port value to normalize
 * @returns Normalized port number or false if invalid
 */
const normalizePort = (val: string | number): number | string | false => {
  const port = parseInt(val as string, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    // Validate against reserved and system ports
    if (port < 1024) {
      logger.warn('Warning: Using system reserved port');
    }
    if (port > 65535) {
      return false;
    }
    return port;
  }

  return false;
};

// Get port from environment and normalize
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

/**
 * Enhanced error event handler for HTTP server
 */
const onError = (error: NodeJS.ErrnoException): void => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    case 'ECONNRESET':
      logger.warn('Connection reset by peer');
      break;
    default:
      throw error;
  }
};

/**
 * Server startup event handler with health check initialization
 */
const onListening = (): void => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  
  logger.info(`Server listening on ${bind}`, {
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    pid: process.pid
  });

  metrics.info({
    event: 'server_start',
    port: port,
    timestamp: new Date().toISOString()
  });
};

/**
 * Configures graceful shutdown with connection draining
 */
const setupGracefulShutdown = (): void => {
  // Handle SIGTERM signal
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Starting graceful shutdown...');
    
    server.close(() => {
      logger.info('Server closed. Process terminating...');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Attempt graceful shutdown
    server.close(() => {
      process.exit(1);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      process.exit(1);
    }, 30000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
      timestamp: new Date().toISOString()
    });
  });
};

// Set up error handlers and start server
server.on('error', onError);
server.on('listening', onListening);
setupGracefulShutdown();

// Start server
server.listen(port);

export default server;