import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  const pending = db.listings.filter(
    (l) => l.status === 'Pending' || l.status === 'Under Review' || l.status === 'Flagged'
  );

  return res.json({
    data: pending,
    total: pending.length,
    flaggedCount: pending.filter((l) => l.status === 'Flagged' || l.autoFlagged).length,
  });
});
