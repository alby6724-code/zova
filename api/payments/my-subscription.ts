import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query?.userId as string) || (req.headers?.['x-user-id'] as string);
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  const { plan, subscription, tier } = db.getUserActiveSubscription(userId);
  const userAds = db.listings.filter(
    (l) => l.sellerId === userId && (l.status === 'Active' || l.status === 'Pending')
  );

  return res.json({
    tier,
    plan,
    subscription,
    usage: {
      activeAdsCount: userAds.length,
      limit: plan.activeListingLimit,
      remaining: plan.activeListingLimit === -1 ? 9999 : Math.max(0, plan.activeListingLimit - userAds.length),
      featuredAdsUsedThisMonth: subscription?.featuredAdsUsedThisMonth || 0,
      featuredAdsLimit: plan.featuredAdsLimit,
    },
  });
});
