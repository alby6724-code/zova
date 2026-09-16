import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const resetResult = db.createPasswordResetToken(email);

  if (!resetResult) {
    return res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been dispatched.',
    });
  }

  return res.json({
    success: true,
    message: 'Password reset link dispatched.',
    token: resetResult.token,
    expiresAt: resetResult.expiresAt,
  });
});
