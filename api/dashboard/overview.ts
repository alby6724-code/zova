import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res);
  if (!user) return;

  const kpis = db.getKPIs();
  const categories = db.getCategoriesBreakdown();
  const activity = db.getPlatformActivity();
  const userTypes = db.getUserTypeDistribution();
  const topSellers = db.getTopSellers();
  const recentActivity = db.activities.slice(0, 10);
  const recentListings = db.listings.filter((l) => l.status === 'Active');
  const reportedListings = db.reports.slice(0, 5);
  const recentChats = db.chats.slice(0, 4);

  return res.json({
    kpis,
    categories,
    activity,
    userTypes,
    topSellers,
    recentActivity,
    recentListings,
    reportedListings,
    recentChats,
  });
});
