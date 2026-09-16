import { createHandler, getIdParam } from '../../_lib/handler.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const listingId = getIdParam(req);
  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  const userId = (req.body?.userId as string) || (req.headers?.['x-user-id'] as string) || 'guest';
  const isFavorited = db.toggleFavorite(userId, listingId);
  return res.json({ success: true, favorited: isFavorited, isFavorite: isFavorited, listingId });
});
