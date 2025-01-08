import { Resend } from 'resend'; // v1.0.0
import winston from 'winston'; // v3.8.0
import { API_VERSION } from './constants';

/**
 * Interface defining email template structure with version support
 */
interface EmailTemplate {
  subject: string;
  templateId: string;
  version: string;
  category: string;
}

/**
 * Interface defining rate limit configuration for email categories
 */
interface EmailRateLimit {
  limit: number;
  window: string;
  category: string;
}

/**
 * Email templates configuration with versioning and categories
 */
const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    subject: 'Welcome to Tax Optimizer',
    templateId: 'welcome-template',
    version: 'v1',
    category: 'onboarding'
  },
  verification: {
    subject: 'Verify Your Email',
    templateId: 'verification-template',
    version: 'v1',
    category: 'security'
  },
  passwordReset: {
    subject: 'Reset Your Password',
    templateId: 'password-reset-template',
    version: 'v1',
    category: 'security'
  },
  calculationComplete: {
    subject: 'Your Tax Optimization Results',
    templateId: 'calculation-complete-template',
    version: 'v1',
    category: 'notification'
  }
};

/**
 * Rate limiting configuration for different email categories
 */
const EMAIL_RATE_LIMITS: Record<string, EmailRateLimit> = {
  verificationEmails: {
    limit: 5,
    window: '1h',
    category: 'security'
  },
  passwordResetEmails: {
    limit: 3,
    window: '1h',
    category: 'security'
  },
  calculationEmails: {
    limit: 10,
    window: '1h',
    category: 'notification'
  }
};

/**
 * Logger configuration for email-related events
 */
const emailLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'email-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/email-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/email-combined.log' })
  ]
});

/**
 * Creates and configures Resend email client instance with error handling and retry logic
 */
const createResendClient = (): Resend => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  if (!process.env.EMAIL_FROM_ADDRESS) {
    throw new Error('EMAIL_FROM_ADDRESS environment variable is not set');
  }

  const retryAttempts = parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3', 10);
  const retryDelay = parseInt(process.env.EMAIL_RETRY_DELAY || '1000', 10);

  const client = new Resend(process.env.RESEND_API_KEY);

  // Add retry logic wrapper
  const originalSend = client.emails.send;
  client.emails.send = async (...args) => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const result = await originalSend.apply(client.emails, args);
        if (attempt > 1) {
          emailLogger.info('Email sent successfully after retry', {
            attempt,
            templateId: args[0].template_id
          });
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        emailLogger.error('Email send attempt failed', {
          attempt,
          error: lastError.message,
          templateId: args[0].template_id
        });
        
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    throw lastError;
  };

  return client;
};

/**
 * Validates email configuration including templates and rate limits
 */
const validateEmailConfig = (): boolean => {
  try {
    // Validate environment variables
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM_ADDRESS) {
      throw new Error('Required environment variables are not set');
    }

    // Validate email templates
    for (const [key, template] of Object.entries(EMAIL_TEMPLATES)) {
      if (!template.templateId || !template.version || !template.category) {
        throw new Error(`Invalid template configuration for ${key}`);
      }
    }

    // Validate rate limits
    for (const [key, limit] of Object.entries(EMAIL_RATE_LIMITS)) {
      if (!limit.limit || !limit.window || !limit.category) {
        throw new Error(`Invalid rate limit configuration for ${key}`);
      }
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.EMAIL_FROM_ADDRESS)) {
      throw new Error('Invalid EMAIL_FROM_ADDRESS format');
    }

    emailLogger.info('Email configuration validated successfully');
    return true;
  } catch (error) {
    emailLogger.error('Email configuration validation failed', {
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Centralized email configuration object with comprehensive settings
 */
export const emailConfig = {
  client: createResendClient(),
  fromAddress: process.env.EMAIL_FROM_ADDRESS as string,
  templates: EMAIL_TEMPLATES,
  rateLimits: EMAIL_RATE_LIMITS,
  apiVersion: API_VERSION,
  logger: emailLogger,
  validate: validateEmailConfig
};