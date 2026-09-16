import { createHandler } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res);
  if (!user) return;

  const secret = 'JBSWY3DPEHPK3PXP';
  const otpAuthUrl = `otpauth://totp/ZOVA:${user.email}?secret=${secret}&issuer=ZOVA`;

  return res.json({
    secret,
    otpAuthUrl,
    backupCodes: ['8821-4412', '9102-7731', '3341-9981', '6620-1144'],
  });
});

