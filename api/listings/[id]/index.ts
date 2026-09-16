import { createHandler, getIdParam, getClientIp } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  const listingId = getIdParam(req);
  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  // GET /api/listings/:id
  if (req.method === 'GET') {
    const listing = db.listings.find((l) => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    listing.views += 1;
    return res.json(listing);
  }

  // DELETE /api/listings/:id
  if (req.method === 'DELETE') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
    if (!user) return;

    const index = db.listings.findIndex((l) => l.id === listingId);
    if (index === -1) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const [removed] = db.listings.splice(index, 1);

    db.logAction(
      user.id,
      user.name,
      user.role,
      'LISTING_DELETED',
      removed.id,
      `Removed listing: ${removed.title}`,
      getClientIp(req)
    );

    return res.json({ success: true, message: 'Listing deleted successfully.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
