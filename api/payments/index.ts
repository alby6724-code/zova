import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const totalRevenue = db.payments.reduce((acc, curr) => acc + curr.amount, 0);
  return res.json({
    totalRevenue,
    currency: '₹',
    payments: db.payments,
  });
});
