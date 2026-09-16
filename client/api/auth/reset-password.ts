import { createHandler } from '../_lib/handler.js';
import bcrypt from 'bcryptjs';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  const result = db.resetPasswordWithToken(token, newHash);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({
    success: true,
    message: 'Password has been updated successfully. You can now login with your new credentials.',
  });
});
