import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  const lockedUsersCount = db.failedAttempts.filter(
    (f) => f.lockedUntil && new Date(f.lockedUntil).getTime() > Date.now()
  ).length;

  const totalUsers = db.users.length;
  const adminStaff = db.users.filter((u) => ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'].includes(u.role)).length;
  const twoFactorEnforced = db.users.filter((u) => u.twoFactorEnabled).length;

  return res.json({
    platformStatus: 'HEALTHY',
    timestamp: new Date().toISOString(),
    security: {
      activeLocks: lockedUsersCount,
      totalRegisteredUsers: totalUsers,
      administrativeStaff: adminStaff,
      twoFactorCoveragePercent: totalUsers > 0 ? Math.round((twoFactorEnforced / totalUsers) * 100) : 0,
      recentFailedAttempts: db.failedAttempts.length,
    },
    system: {
      nodeVersion: process.version,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});
