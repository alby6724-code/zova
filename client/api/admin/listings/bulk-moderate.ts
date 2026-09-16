import { createHandler } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  const { listingIds, action, reason } = req.body || {};
  if (!Array.isArray(listingIds) || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'listingIds array and action (APPROVE/REJECT) are required.' });
  }

  const result = db.bulkModerateListings(listingIds, action, reason, user.id, user.name);
  return res.json({
    success: true,
    modifiedCount: result.modifiedCount,
    message: `Successfully executed bulk ${action} on ${result.modifiedCount} listing(s).`,
  });
});
