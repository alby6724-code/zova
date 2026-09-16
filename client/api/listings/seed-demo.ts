import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method === 'POST') {
    const result = db.seedDemoData(true);
    return res.status(200).json({
      success: true,
      sellersCount: result.sellersCount,
      listingsCount: result.listingsCount,
      message: `Successfully seeded ${result.listingsCount} demo products and ${result.sellersCount} demo sellers.`,
    });
  }

  if (req.method === 'DELETE') {
    const result = db.clearDemoData();
    return res.status(200).json({
      success: true,
      removedUsers: result.removedUsers,
      removedListings: result.removedListings,
      message: `Cleaned up ${result.removedListings} demo listings and ${result.removedUsers} demo sellers.`,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
