/**
 * Express router configuration for secure PDF export and download endpoints
 * Implements comprehensive security measures, rate limiting, and monitoring
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import { ExportController } from '../controllers/export.controller';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateScenarioId } from '../middleware/validation.middleware';
import rateLimitMiddleware from '../middleware/rate-limit.middleware';
import { ApplicationError } from '../middleware/error.middleware';
import { APIErrorCode } from '../types/api.types';
import { metrics } from '@opentelemetry/api';

// Constants for export routes
const EXPORT_ROUTE_PREFIX = '/api/export';
const EXPORT_PDF_ROUTE = '/pdf/:scenarioId';
const DOWNLOAD_PDF_ROUTE = '/download/:filePath';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const RATE_LIMIT_MAX = 100;
const CLEANUP_INTERVAL = 3600000; // 1 hour

// Create metrics for monitoring
const exportMetrics = {
  requestCounter: metrics.getMeter('export').createCounter('export_requests_total'),
  errorCounter: metrics.getMeter('export').createCounter('export_errors_total'),
  latencyHistogram: metrics.getMeter('export').createHistogram('export_latency_ms')
};

/**
 * Configures and returns the export router with defined routes and security middleware
 * @param exportController Instance of ExportController for handling export operations
 * @returns Configured Express router
 */
const configureRoutes = (exportController: ExportController): Router => {
  const router = express.Router();

  // Apply security headers
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        downloadSrc: ["'self'"]
      }
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
  }));

  // Apply authentication to all routes
  router.use(authenticateRequest);

  // Apply rate limiting
  router.use(rateLimitMiddleware);

  // Route for generating PDF export
  router.post(
    EXPORT_PDF_ROUTE,
    validateScenarioId,
    async (req, res, next) => {
      const startTime = Date.now();
      try {
        exportMetrics.requestCounter.add(1, {
          route: 'generate_pdf',
          userId: req.user?.id
        });

        // Validate request size
        const contentLength = parseInt(req.headers['content-length'] || '0');
        if (contentLength > MAX_FILE_SIZE) {
          throw new ApplicationError(
            'Request size exceeds maximum allowed size',
            APIErrorCode.BAD_REQUEST,
            400
          );
        }

        await exportController.exportScenarioPDF(req, res);

        exportMetrics.latencyHistogram.record(Date.now() - startTime, {
          route: 'generate_pdf',
          success: 'true'
        });
      } catch (error) {
        exportMetrics.errorCounter.add(1, {
          route: 'generate_pdf',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        exportMetrics.latencyHistogram.record(Date.now() - startTime, {
          route: 'generate_pdf',
          success: 'false'
        });

        next(error);
      }
    }
  );

  // Route for downloading generated PDF
  router.get(
    DOWNLOAD_PDF_ROUTE,
    async (req, res, next) => {
      const startTime = Date.now();
      try {
        exportMetrics.requestCounter.add(1, {
          route: 'download_pdf',
          userId: req.user?.id
        });

        // Validate file path
        const filePath = req.params.filePath;
        if (!filePath.match(/^[a-zA-Z0-9-_]+\.pdf$/)) {
          throw new ApplicationError(
            'Invalid file path',
            APIErrorCode.BAD_REQUEST,
            400
          );
        }

        // Set secure headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=tax-optimization-report.pdf');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        await exportController.downloadPDF(req, res);

        exportMetrics.latencyHistogram.record(Date.now() - startTime, {
          route: 'download_pdf',
          success: 'true'
        });
      } catch (error) {
        exportMetrics.errorCounter.add(1, {
          route: 'download_pdf',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        exportMetrics.latencyHistogram.record(Date.now() - startTime, {
          route: 'download_pdf',
          success: 'false'
        });

        next(error);
      }
    }
  );

  // Cleanup temporary files periodically
  setInterval(() => {
    try {
      exportController.cleanupTemporaryFiles();
    } catch (error) {
      console.error('Failed to cleanup temporary files:', error);
    }
  }, CLEANUP_INTERVAL);

  return router;
};

// Create and export the configured router
export const exportRouter = configureRoutes(new ExportController());