import { createHandler } from '../_lib/handler.js';
import jwt from 'jsonwebtoken';
import { db } from '../_lib/database/store.js';
import { config } from '../_lib/config.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string };
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user || user.status === 'BANNED') {
      return res.status(401).json({ error: 'User invalid or inactive.' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    return res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});
