import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';
import { broadcast } from '../_lib/websocket.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const count = Number(req.query?.count) || Number(req.body?.count) || 20;
  const added = db.addRandomProducts(count);

  try {
    broadcast({
      type: 'BATCH_LISTINGS_ADDED',
      payload: {
        count: added.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {}

  return res.status(201).json({
    success: true,
    addedCount: added.length,
    totalListings: db.listings.length,
    message: `Successfully added ${added.length} random products to the marketplace. Total active listings: ${db.listings.length}.`,
    listings: added,
  });
});
