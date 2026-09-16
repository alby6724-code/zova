import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, tier, billingCycle = 'MONTHLY' } = req.body || {};

  if (!userId || !tier || !['BASIC', 'PRO'].includes(tier)) {
    return res.status(400).json({ error: 'Valid userId and tier (BASIC or PRO) are required.' });
  }

  const plan = db.plans.find((p) => p.id === tier);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return res.json({
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
