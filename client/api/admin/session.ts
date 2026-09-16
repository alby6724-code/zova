import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
    },
    permissions: {
      canManageUsers: ['SUPER_ADMIN', 'ADMIN'].includes(user.role),
      canManageListings: true,
      canModerateReports: true,
      canViewFinancials: ['SUPER_ADMIN', 'ADMIN'].includes(user.role),
      canUnlockAccounts: ['SUPER_ADMIN', 'ADMIN'].includes(user.role),
    },
  });
});
