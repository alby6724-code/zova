import { createHandler, getIdParam, getClientIp } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';
import { broadcast } from '../../_lib/websocket.js';
import { ListingStatus } from '../../_lib/types.js';

export default createHandler((req, res) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR']);
  if (!user) return;

  const listingId = getIdParam(req);
  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const { status, featured, rejectionReason } = req.body || {};

  if (status) {
    listing.status = status as ListingStatus;
  }

  if (rejectionReason) {
    listing.rejectionReason = rejectionReason;
  } else if (status === 'Active') {
    listing.rejectionReason = undefined;
  }

  if (typeof featured === 'boolean') {
    listing.featured = featured;
  }

  db.logAction(
    user.id,
    user.name,
    user.role,
    'LISTING_STATUS_UPDATE',
    listing.id,
    `Status updated to ${status || 'unchanged'}, rejectionReason: ${rejectionReason || 'none'}, featured: ${listing.featured}`,
    getClientIp(req)
  );

  broadcast({
    type: 'LISTING_UPDATED',
    payload: listing,
  });

  return res.json(listing);
});
