import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sellerId = (req.query?.sellerId as string) || (req.headers?.['x-user-id'] as string);
  if (!sellerId) {
    return res.status(400).json({ error: 'sellerId is required.' });
  }

  const myAds = db.listings.filter((l) => l.sellerId === sellerId);
  const activeCount = myAds.filter((l) => l.status === 'Active').length;
  const pendingCount = myAds.filter((l) => l.status === 'Pending' || l.status === 'Under Review').length;
  const rejectedCount = myAds.filter((l) => l.status === 'Rejected' || l.status === 'Flagged').length;

  return res.json({
    data: myAds,
    summary: {
      total: myAds.length,
      active: activeCount,
      pending: pendingCount,
      rejected: rejectedCount,
    },
  });
});
