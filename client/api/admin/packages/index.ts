import { createHandler } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  // --- GET /api/admin/packages ---
  // Returns all packages including inactive ones (admin view)
  if (req.method === 'GET') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
    if (!user) return;

    const packages = db.getPackages(undefined, true);
    const tiers = db.getTiers(true);
    return res.json({ packages, tiers, total: packages.length });
  }

  // --- POST /api/admin/packages ---
  // Create a new Premium Package
  if (req.method === 'POST') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
    if (!user) return;

    const { tierId, name, adsCount, credits, durationDays, durationValue, durationUnit, price, badge, status, active, displayOrder, sortOrder } = req.body || {};
    const count = adsCount ?? credits;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Package name is required.' });
    }
    if (count === undefined || typeof Number(count) !== 'number' || Number(count) < 1) {
      return res.status(400).json({ error: 'Valid ads count or credits is required.' });
    }
    if (price === undefined || typeof Number(price) !== 'number' || Number(price) < 0) {
      return res.status(400).json({ error: 'Valid price is required.' });
    }

    const resolvedTierId = tierId || 'tier-platinum';
    const isActive = active !== undefined ? Boolean(active) : (status !== 'INACTIVE');
    const durVal = durationValue ? Number(durationValue) : (durationDays ? Math.round(Number(durationDays) / 30) || 1 : 1);

    const pkg = db.createPackage({
      tierId: resolvedTierId,
      name: String(name).trim(),
      adsCount: Number(count),
      price: Number(price),
      currency: '₹',
      durationValue: durVal,
      durationUnit: durationUnit || 'Month',
      active: isActive,
      displayOrder: Number(displayOrder ?? sortOrder) || 0,
      badge: badge ? String(badge).trim() : undefined,
    });

    db.logAction(user.id, user.name, user.role, 'CREATE_AD_PACKAGE', pkg.id, `Created package "${pkg.name}" (₹${pkg.price}, ${pkg.adsCount} ads)`, '127.0.0.1');

    return res.status(201).json({ success: true, package: pkg });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
