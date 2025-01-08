import { Request, Response } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v7.1.0
import { trace, metrics } from '@opentelemetry/api'; // v1.4.1
import { ExportService } from '../services/export.service';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateExportRequest } from '../middleware/validation.middleware';
import { APIResponse } from '../types/api.types';

// Constants for export operations
const CONTENT_TYPE_PDF = 'application/pdf';
const DOWNLOAD_HEADER = 'attachment; filename=tax-optimization-report.pdf';
const MAX_FILE_SIZE = 10485760; // 10MB
const EXPORT_RATE_LIMIT = '10 per 1 minute';

// Create tracer for monitoring
const tracer = trace.getTracer('export-controller');
const meter = metrics.getMeter('export-metrics');

// Create rate limiter for export endpoints
const exportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: 'Too many export requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Controller class handling secure PDF export functionality with monitoring
 * @version 1.0.0
 */
export class ExportController {
  private readonly exportService: ExportService;
  private readonly exportCounter = meter.createCounter('export_requests_total');
  private readonly exportDuration = meter.createHistogram('export_duration_ms');

  constructor(exportService: ExportService) {
    this.exportService = exportService;
  }

  /**
   * Handles secure PDF generation and export with comprehensive monitoring
   */
  @authenticateRequest
  @validateExportRequest
  @exportRateLimiter
  public async exportScenarioPDF = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const startTime = Date.now();
    const scenarioId = req.params.scenarioId;

    return tracer.startActiveSpan('export_scenario_pdf', async (span) => {
      try {
        // Record export attempt
        this.exportCounter.add(1, { scenarioId });
        span.setAttribute('scenarioId', scenarioId);

        // Generate PDF with security measures
        const result = await this.exportService.exportScenario(scenarioId);

        if (!result.success || !result.data) {
          throw new Error(result.error?.message || 'PDF generation failed');
        }

        const filePath = result.data;

        // Validate file size
        const stats = await this.exportService.getFileStats(filePath);
        if (stats.size > MAX_FILE_SIZE) {
          throw new Error('Generated file exceeds maximum allowed size');
        }

        // Set secure headers
        res.setHeader('Content-Type', CONTENT_TYPE_PDF);
        res.setHeader('Content-Disposition', DOWNLOAD_HEADER);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Stream file with monitoring
        await this.streamFileWithMonitoring(filePath, res, span);

        // Record successful export duration
        const duration = Date.now() - startTime;
        this.exportDuration.record(duration, { success: 'true' });
        span.setAttribute('duration_ms', duration);

        // Cleanup temporary file
        await this.exportService.cleanupExportedFile(filePath);

        span.setStatus({ code: trace.SpanStatusCode.OK });
      } catch (error) {
        // Record failed export
        const duration = Date.now() - startTime;
        this.exportDuration.record(duration, { success: 'false' });

        span.setStatus({
          code: trace.SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Export failed'
        });

        const response: APIResponse<null> = {
          success: false,
          data: null,
          error: {
            code: 'EXPORT_FAILED',
            message: error instanceof Error ? error.message : 'Export failed',
            details: null,
            stack: process.env.NODE_ENV === 'development' ? 
              error instanceof Error ? error.stack : undefined : null
          },
          metadata: {
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] as string,
            processingTime: duration,
            version: '1.0.0'
          }
        };

        res.status(500).json(response);
      } finally {
        span.end();
      }
    });
  };

  /**
   * Streams file to client with progress monitoring
   */
  private async streamFileWithMonitoring(
    filePath: string,
    res: Response,
    span: trace.Span
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = this.exportService.createReadStream(filePath);
      let bytesTransferred = 0;

      stream.on('data', (chunk) => {
        bytesTransferred += chunk.length;
        span.setAttribute('bytes_transferred', bytesTransferred);
      });

      stream.on('end', () => {
        span.setAttribute('total_bytes', bytesTransferred);
        resolve();
      });

      stream.on('error', (error) => {
        span.setAttribute('stream_error', error.message);
        reject(error);
      });

      stream.pipe(res);
    });
  }
}