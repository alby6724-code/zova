import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

// Public endpoint: returns only ACTIVE packages sorted by sortOrder.
// Used by the marketplace checkout and public storefront.
export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const packages = db.getAdCreditPackages(false); // active only

  return res.json({
    packages,
    total: packages.length,
    currency: 'INR',
    currencySymbol: 'Rs.',
  });
});