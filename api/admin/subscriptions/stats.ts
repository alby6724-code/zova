import { createHandler } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  const activeSubs = db.subscriptions.filter((s) => s.status === 'ACTIVE');
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const freeCount = db.users.length - activeSubs.length;
  const basicCount = activeSubs.filter((s) => s.tier === 'BASIC').length;
  const proCount = activeSubs.filter((s) => s.tier === 'PRO').length;

  // Use dynamic plan prices instead of hardcoded values
  const basicPlan = db.plans.find((p) => p.id === 'BASIC');
  const proPlan = db.plans.find((p) => p.id === 'PRO');
  const totalMonthlyRevenue =
    basicCount * (basicPlan?.priceMonthly ?? 199) +
    proCount * (proPlan?.priceMonthly ?? 499);

  const expiringSoon = activeSubs
    .filter((s) => {
      const expTime = new Date(s.expiresAt).getTime();
      return expTime > now && expTime - now < sevenDays;
    })
    .map((s) => {
      const u = db.users.find((userObj) => userObj.id === s.userId);
      return {
        ...s,
        userName: u?.name || 'Seller',
        userPhone: u?.phone || '',
      };
    });

  return res.json({
    totalMonthlyRevenue,
    currency: '₹',
    tiers: {
      free: Math.max(0, freeCount),
      basic: basicCount,
      pro: proCount,
    },
    totalSubscribers: activeSubs.length,
    expiringSoon,
  });
});
