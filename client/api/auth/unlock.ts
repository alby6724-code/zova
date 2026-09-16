import { createHandler, getClientIp } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
  if (!user) return;

  const { targetEmailOrUserId } = req.body || {};
  const ip = getClientIp(req);

  if (!targetEmailOrUserId) {
    return res.status(400).json({ error: 'Target email or user ID is required.' });
  }

  const result = db.adminUnlock(targetEmailOrUserId, user.id, user.name, ip);

  return res.json({
    success: true,
    message: `Account ${result.email} unlocked successfully. Failed attempt counters cleared.`,
  });
});
