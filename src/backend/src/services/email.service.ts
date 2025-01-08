import { injectable } from 'inversify';
import { Resend } from 'resend'; // v1.0.0
import { emailConfig } from '../config/email';
import { APIResponse, APIError, APIErrorCode } from '../types/api.types';
import { RateLimiter } from 'limiter'; // v2.0.0
import { Queue } from 'bull'; // v4.10.0
import { validate as validateEmail } from 'email-validator'; // v2.0.4

/**
 * Interface for email sending options with comprehensive configuration
 */
interface EmailOptions {
  to: string | string[];
  subject: string;
  templateId: string;
  data: Record<string, any>;
  trackingEnabled?: boolean;
  priority?: 'high' | 'normal' | 'low';
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Interface for email analytics tracking
 */
interface EmailAnalytics {
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
}

@injectable()
export class EmailService {
  private readonly client: Resend;
  private readonly fromAddress: string;
  private readonly templates: Record<string, any>;
  private readonly rateLimiter: Record<string, RateLimiter>;
  private readonly emailQueue: Queue;
  private readonly analytics: EmailAnalytics;

  constructor() {
    this.client = emailConfig.client;
    this.fromAddress = emailConfig.fromAddress;
    this.templates = emailConfig.templates;
    
    // Initialize rate limiters for different email categories
    this.rateLimiter = Object.entries(emailConfig.rateLimits).reduce((acc, [key, limit]) => ({
      ...acc,
      [key]: new RateLimiter({
        tokensPerInterval: limit.limit,
        interval: limit.window
      })
    }), {});

    // Initialize email queue
    this.emailQueue = new Queue('email-queue', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true
      }
    });

    // Initialize analytics
    this.analytics = {
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      opened: 0,
      clicked: 0
    };

    this.setupQueueHandlers();
  }

  /**
   * Sends welcome email to new users
   */
  public async sendWelcomeEmail(
    email: string,
    name: string,
    options?: Partial<EmailOptions>
  ): Promise<APIResponse> {
    try {
      if (!validateEmail(email)) {
        return {
          success: false,
          error: {
            code: APIErrorCode.VALIDATION_ERROR,
            message: 'Invalid email address',
            details: null,
            stack: null
          },
          data: null,
          metadata: null
        };
      }

      const template = this.templates.welcome;
      const emailData = {
        to: email,
        subject: template.subject,
        templateId: template.templateId,
        data: {
          name,
          year: new Date().getFullYear(),
          ...options?.data
        },
        trackingEnabled: options?.trackingEnabled ?? true,
        priority: 'normal',
        metadata: {
          category: 'onboarding',
          templateVersion: template.version,
          ...options?.metadata
        }
      };

      const result = await this.queueEmail(emailData);

      return {
        success: true,
        data: result,
        error: null,
        metadata: {
          emailId: result.id,
          category: 'onboarding',
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleEmailError(error);
    }
  }

  /**
   * Sends verification email with secure token
   */
  public async sendVerificationEmail(
    email: string,
    verificationToken: string,
    options?: Partial<EmailOptions>
  ): Promise<APIResponse> {
    try {
      if (!await this.rateLimiter.verificationEmails.tryRemoveTokens(1)) {
        return {
          success: false,
          error: {
            code: APIErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Verification email rate limit exceeded',
            details: null,
            stack: null
          },
          data: null,
          metadata: null
        };
      }

      const template = this.templates.verification;
      const emailData = {
        to: email,
        subject: template.subject,
        templateId: template.templateId,
        data: {
          verificationToken,
          expiryHours: 24,
          ...options?.data
        },
        trackingEnabled: true,
        priority: 'high',
        metadata: {
          category: 'security',
          templateVersion: template.version,
          ...options?.metadata
        }
      };

      const result = await this.queueEmail(emailData);

      return {
        success: true,
        data: result,
        error: null,
        metadata: {
          emailId: result.id,
          category: 'security',
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleEmailError(error);
    }
  }

  /**
   * Sends calculation complete notification
   */
  public async sendCalculationCompleteEmail(
    email: string,
    calculationId: string,
    options?: Partial<EmailOptions>
  ): Promise<APIResponse> {
    try {
      const template = this.templates.calculationComplete;
      const emailData = {
        to: email,
        subject: template.subject,
        templateId: template.templateId,
        data: {
          calculationId,
          resultUrl: `${process.env.APP_URL}/calculations/${calculationId}`,
          ...options?.data
        },
        trackingEnabled: true,
        priority: 'normal',
        metadata: {
          category: 'notification',
          templateVersion: template.version,
          calculationId,
          ...options?.metadata
        }
      };

      const result = await this.queueEmail(emailData);

      return {
        success: true,
        data: result,
        error: null,
        metadata: {
          emailId: result.id,
          category: 'notification',
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleEmailError(error);
    }
  }

  /**
   * Sets up email queue handlers and event listeners
   */
  private setupQueueHandlers(): void {
    this.emailQueue.process(async (job) => {
      const { data: emailData } = job;
      
      try {
        const result = await this.client.emails.send({
          from: this.fromAddress,
          ...emailData,
          headers: {
            'X-Entity-Ref-ID': job.id,
            'X-Template-Version': emailData.metadata.templateVersion
          }
        });

        this.analytics.sent++;
        return result;
      } catch (error) {
        this.analytics.failed++;
        throw error;
      }
    });

    this.emailQueue.on('completed', (job) => {
      this.analytics.delivered++;
      emailConfig.logger.info('Email sent successfully', {
        jobId: job.id,
        template: job.data.templateId
      });
    });

    this.emailQueue.on('failed', (job, error) => {
      emailConfig.logger.error('Email sending failed', {
        jobId: job.id,
        template: job.data.templateId,
        error: error.message
      });
    });
  }

  /**
   * Queues an email for sending with retry logic
   */
  private async queueEmail(emailData: EmailOptions): Promise<any> {
    const job = await this.emailQueue.add(emailData, {
      priority: emailData.priority === 'high' ? 1 : emailData.priority === 'low' ? 3 : 2,
      attempts: emailData.retryConfig?.maxAttempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: emailData.retryConfig?.backoffMs ?? 1000
      }
    });

    return job.data;
  }

  /**
   * Handles email-related errors and returns standardized API response
   */
  private handleEmailError(error: any): APIResponse {
    emailConfig.logger.error('Email error occurred', { error });
    
    return {
      success: false,
      error: {
        code: APIErrorCode.INTERNAL_ERROR,
        message: 'Failed to send email',
        details: { error: error.message },
        stack: process.env.NODE_ENV === 'development' ? error.stack : null
      },
      data: null,
      metadata: null
    };
  }
}