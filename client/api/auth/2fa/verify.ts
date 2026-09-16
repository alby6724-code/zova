import { createHandler, getClientIp } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res);
  if (!user) return;

  const { code } = req.body || {};
  if (!code || (code !== '123456' && code.length !== 6)) {
    return res.status(400).json({ error: 'Invalid 6-digit verification code.' });
  }

  const foundUser = db.users.find((u) => u.id === user.id);
  if (foundUser) {
    foundUser.twoFactorEnabled = true;
    db.logAction(
      foundUser.id,
      foundUser.name,
      foundUser.role,
      '2FA_ENABLED',
      'Security',
      'Two-Factor Authentication successfully activated',
      getClientIp(req)
    );
  }

  return res.json({ success: true, message: 'Two-Factor Authentication activated successfully.' });
});
