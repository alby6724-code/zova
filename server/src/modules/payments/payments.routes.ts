import { Router, Request, Response } from 'express';
import { db } from '../../database/store.js';
import { SubscriptionTier, Subscription, Payment } from '../../types/index.js';
import { broadcast } from '../../websocket/index.js';

const router = Router();

// GET all payments / orders
router.get('/', (req: Request, res: Response) => {
  const totalRevenue = db.payments.reduce((acc, curr) => acc + curr.amount, 0);
  res.json({
    totalRevenue,
    currency: '₹',
    payments: db.payments,
  });
});

// GET all available subscription plans
router.get('/plans', (req: Request, res: Response) => {
  res.json({
    plans: db.plans,
    currency: '₹',
  });
});

// GET user's current subscription & quota
router.get('/my-subscription', (req: Request, res: Response): void => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userId) {
    res.status(400).json({ error: 'userId is required.' });
    return;
  }

  const { plan, subscription, tier } = db.getUserActiveSubscription(userId);
  const userAds = db.listings.filter(
    (l) => l.sellerId === userId && (l.status === 'Active' || l.status === 'Pending')
  );

  res.json({
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

// POST create Razorpay/Cashfree subscription order
router.post('/create-subscription-order', (req: Request, res: Response): void => {
  const { userId, tier, billingCycle = 'MONTHLY' } = req.body;

  if (!userId || !tier || !['BASIC', 'PRO'].includes(tier)) {
    res.status(400).json({ error: 'Valid userId and tier (BASIC or PRO) are required.' });
    return;
  }

  const plan = db.plans.find((p) => p.id === tier);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  res.json({
    orderId,
    amount,
    currency: 'INR',
    tier,
    billingCycle,
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_classifieds_2026',
    customer: {
      id: userId,
    },
    notes: {
      planName: plan.name,
      description: `${plan.name} (${billingCycle.toLowerCase()} subscription)`,
    },
  });
});

// POST verify and activate subscription
router.post('/verify-subscription', (req: Request, res: Response): void => {
  const {
    userId,
    tier,
    billingCycle = 'MONTHLY',
    razorpayOrderId,
    razorpayPaymentId,
  } = req.body;

  if (!userId || !tier || !['BASIC', 'PRO'].includes(tier)) {
    res.status(400).json({ error: 'userId and tier (BASIC or PRO) are required.' });
    return;
  }

  const plan = db.plans.find((p) => p.id === tier);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
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
    payerEmail: user?.email || `${user?.phone || 'seller'}@zova.com`,
    status: 'Completed',
    createdAt: new Date().toISOString(),
  };
  db.payments.unshift(paymentRecord);

  // Broadcast WebSocket activity
  broadcast({
    type: 'SUBSCRIPTION_UPGRADED',
    payload: {
      userId,
      tier,
      planName: plan.name,
    },
  });

  res.json({
    success: true,
    message: `Congratulations! You have upgraded to ${plan.name}.`,
    subscription: newSub,
    plan,
  });
});

export default router;

