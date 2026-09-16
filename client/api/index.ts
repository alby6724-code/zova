import { createHandler } from './_lib/handler.js';

export default createHandler((req, res) => {
  res.json({
    name: 'ZOVA API',
    version: '1.0.0',
    description: 'ZOVA Marketplace Serverless REST API',
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

