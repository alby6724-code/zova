import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'ZOVA-enterprise-jwt-super-secret-key-2026',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'ZOVA-refresh-secret-rotation-key-2026',
  jwtExpiresIn: '1h',
  jwtRefreshExpiresIn: '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 mins
  rateLimitMax: 1000,
  adminTotpIssuer: 'ZOVA',
};

