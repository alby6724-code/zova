import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env robustly whether started from server/ or workspace root
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
  path.resolve(process.cwd(), '..', '.env'),
];

for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'ZOVAmarket-enterprise-jwt-super-secret-key-2026',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'ZOVAmarket-refresh-secret-rotation-key-2026',
  jwtExpiresIn: '1h',
  jwtRefreshExpiresIn: '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 mins
  rateLimitMax: 1000,
  adminTotpIssuer: 'ZOVAmarket',
};

