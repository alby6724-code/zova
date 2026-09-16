import { createHandler, getIdParam, getClientIp } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
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

  const result = db.adminUnlock(targetUser.id, user.id, user.name, getClientIp(req));
  return res.json({
    success: true,
    message: `Account for ${result.email} successfully unlocked.`,
  });
});
