import { createHandler, getIdParam, getClientIp } from '../../../_lib/handler.js';
import { getAuthenticatedUser } from '../../../_lib/auth.js';
import { db } from '../../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  const targetUserId = getIdParam(req);
  if (!targetUserId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const targetUser = db.users.find((u) => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  targetUser.status = 'SUSPENDED';
  // Unpublish all user's listings
  db.listings.forEach((l) => {
    if (l.sellerId === targetUser.id) {
      l.status = 'Removed';
    }
  });

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    adminId: user.id,
    adminName: user.name,
    adminRole: user.role,
    action: 'USER_SUSPENDED',
    target: targetUser.id,
    details: `Suspended user ${targetUser.name} (${targetUser.email || targetUser.phone}) and unpublished all active ads.`,
    ip: getClientIp(req),
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true, message: `User ${targetUser.name} has been suspended.` });
});
