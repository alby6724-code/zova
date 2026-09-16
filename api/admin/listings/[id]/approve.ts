import { createHandler, getIdParam } from '../../../_lib/handler.js';
import { getAuthenticatedUser } from '../../../_lib/auth.js';
import { db } from '../../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  const listingId = getIdParam(req);
  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  try {
    const listing = db.approveListing(listingId, user.id, user.name);
    return res.json({
      success: true,
      message: `Listing "${listing.title}" approved and is now live!`,
      listing,
    });
  } catch (err: any) {
    return res.status(404).json({ error: err.message || 'Listing not found' });
  }
});
