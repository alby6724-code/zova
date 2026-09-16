import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';
import { broadcast } from '../_lib/websocket.js';
import { Subscription, SubscriptionTier, Payment } from '../_lib/types.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    userId,
    tier,
    billingCycle = 'MONTHLY',
    razorpayOrderId,
    razorpayPaymentId,
  } = req.body || {};

  if (!userId || !tier || !['BASIC', 'PRO'].includes(tier)) {
    return res.status(400).json({ error: 'userId and tier (BASIC or PRO) are required.' });
  }

  const plan = db.plans.find((p) => p.id === tier);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const user = db.users.find((u) => u.id === userId);
  const now = new Date();
  const expiresDate = new Date();
  if (billingCycle === 'YEARLY') {
    expiresDate.setFullYear(now.getFullYear() + 1);
  } else {
    expiresDate.setDate(now.getDate() + 30);
  }

  // Deactivate any existing active subscriptions for this user
  db.subscriptions.forEach((s) => {
    if (s.userId === userId && s.status === 'ACTIVE') {
      s.status = 'CANCELLED';
    }
  });

  const newSub: Subscription = {
    id: `sub-${Date.now()}`,
    userId,
    tier: tier as SubscriptionTier,
    billingCycle: billingCycle as 'MONTHLY' | 'YEARLY',
    startDate: now.toISOString(),
    expiresAt: expiresDate.toISOString(),
    status: 'ACTIVE',
    featuredAdsUsedThisMonth: 0,
  };
  db.subscriptions.unshift(newSub);

  // Upgrade user's active listings to featured if Pro
  if (tier === 'PRO') {
    db.listings.forEach((l) => {
      if (l.sellerId === userId) {
        l.featured = true;
        l.tier = 'PRO';
      }
    });
  } else if (tier === 'BASIC') {
    db.listings.forEach((l) => {
      if (l.sellerId === userId) {
        l.tier = 'BASIC';
      }
    });
  }

  const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

  // Record payment transaction
  const paymentRecord: Payment = {
    id: razorpayPaymentId || `pay-${Date.now()}`,
    adId: newSub.id,
    adTitle: `${plan.name} Subscription`,
    amount,
    currency: '₹',
    type: 'Verified Seller',
    payerName: user?.name || 'Seller',
    payerEmail: user?.email || `${user?.phone || 'seller'}@ZOVA.com`,
    status: 'Completed',
    createdAt: new Date().toISOString(),
  };
  db.payments.unshift(paymentRecord);

  broadcast({
    type: 'SUBSCRIPTION_UPGRADED',
    payload: {
      userId,
      tier,
      planName: plan.name,
    },
  });

  return res.json({
    success: true,
    message: `Congratulations! You have upgraded to ${plan.name}.`,
    subscription: newSub,
    plan,
  });
});

