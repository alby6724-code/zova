import { createHandler, getIdParam, getClientIp } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';
import { UserStatus, UserRole } from '../../_lib/types.js';

export default createHandler((req, res) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
  if (!user) return;

  const targetId = getIdParam(req);
  if (!targetId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const targetUser = db.users.find((u) => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { status, role } = req.body || {};

  if (status) {
    targetUser.status = status as UserStatus;
  }

  if (role) {
    targetUser.role = role as UserRole;
  }

  db.logAction(
    user.id,
    user.name,
    user.role,
    'USER_MODIFIED',
    targetUser.id,
    `Updated status: ${status || 'unchanged'}, role: ${role || 'unchanged'} for ${targetUser.email}`,
    getClientIp(req)
  );

  const { passwordHash, ...safeUser } = targetUser;
  return res.json(safeUser);
});
