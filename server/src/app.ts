import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './modules/auth/auth.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import listingsRoutes from './modules/listings/listings.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import chatsRoutes from './modules/chats/chats.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import healthRoutes from './modules/health/health.routes.js';

import otpRoutes from './modules/auth/otp.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { db } from './database/store.js';

export const createApp = () => {
  const app = express();

  // Trust proxy for X-Forwarded-For headers behind Nginx / load balancers
  app.set('trust proxy', true);

  // 1. Enterprise Security Headers (OWASP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    })
  );

  // 2. CORS configuration
  app.use(cors({ origin: true, credentials: true }));

  // 3. Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Rate limiting on all API routes
  app.use('/api', rateLimiter(1000, 60 * 1000));

  // 5. Mount API modules
  app.use('/api/auth/otp', otpRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/listings', listingsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/chats', chatsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/system', healthRoutes);

  // Public tiers endpoint (single source of truth for public single-view)
  app.get('/api/tiers', (req: Request, res: Response) => {
    const tiers = db.getTiers(false);
    res.json({ tiers, total: tiers.length, currency: '₹' });
  });

  // Public packages endpoint
  app.get('/api/packages', (req: Request, res: Response) => {
    const packages = db.getPackages(undefined, false);
    const tiers = db.getTiers(false);
    res.json({ packages, tiers, total: packages.length, currency: '₹' });
  });

  // Dynamic server-side custom package quotation
  app.post('/api/packages/custom-quote', (req: Request, res: Response) => {
    try {
      const { tierId, adsCount } = req.body;
      if (!tierId || !adsCount) {
        res.status(400).json({ error: 'tierId and adsCount are required.' });
        return;
      }
      const quote = db.calculateCustomQuote(tierId, Number(adsCount));
      res.json({ success: true, quote });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to calculate quote' });
    }
  });

  // Secure package purchase endpoint (price determined exclusively server-side from DB)
  app.post('/api/packages/purchase', (req: Request, res: Response) => {
    try {
      const { packageId, tierId, adsCount, email, city, category, userId } = req.body;
      const result = db.purchasePackageOrder({
        packageId,
        tierId,
        adsCount: adsCount ? Number(adsCount) : undefined,
        email,
        city,
        category,
        userId,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Purchase failed.' });
    }
  });

  // Public company branding settings endpoint
  app.get('/api/settings/public', (req: Request, res: Response) => {
    res.json({ settings: db.getSettings() });
  });

  // Root endpoint info
  app.get('/api', (req: Request, res: Response) => {
    res.json({
      name: 'ZOVA API',
      version: '1.0.0',
      description: 'ZOVA Marketplace REST & WebSocket API',
      endpoints: {
        auth: '/api/auth',
        dashboard: '/api/dashboard',
        listings: '/api/listings',
        users: '/api/users',
        chats: '/api/chats',
        reports: '/api/reports',
        payments: '/api/payments',
        auditLogs: '/api/audit-logs',
        health: '/api/system/health',
        metrics: '/api/system/metrics',
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Central error handling
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  return app;
};
