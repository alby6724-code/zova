import { createHandler } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  const { id } = req.query as { id: string };

  if (!id) {
    return res.status(400).json({ error: 'Package ID is required.' });
  }

  // --- PUT /api/admin/packages/:id ---
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
    if (!user) return;

    const { tierId, name, adsCount, credits, price, durationValue, durationDays, durationUnit, active, status, displayOrder, sortOrder, badge } = req.body || {};

    const updates: any = {};
    if (tierId !== undefined) updates.tierId = tierId;
    if (name !== undefined) updates.name = String(name).trim();
    if (adsCount !== undefined || credits !== undefined) updates.adsCount = Number(adsCount ?? credits);
    if (price !== undefined) updates.price = Number(price);
    if (durationValue !== undefined) updates.durationValue = Number(durationValue);
    else if (durationDays !== undefined) updates.durationValue = Math.round(Number(durationDays) / 30) || 1;
    if (durationUnit !== undefined) updates.durationUnit = durationUnit;
    if (active !== undefined) updates.active = Boolean(active);
    else if (status !== undefined) updates.active = status === 'ACTIVE';
    if (displayOrder !== undefined || sortOrder !== undefined) updates.displayOrder = Number(displayOrder ?? sortOrder);
    if (badge !== undefined) updates.badge = badge ? String(badge).trim() : undefined;

    try {
      const updated = db.updatePackage(id, updates);
      db.logAction(user.id, user.name, user.role, 'UPDATE_AD_PACKAGE', id, `Updated package "${updated.name}" (₹${updated.price}, ${updated.adsCount} ads)`, '127.0.0.1');
      return res.json({ success: true, package: updated });
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  // --- DELETE /api/admin/packages/:id ---
  if (req.method === 'DELETE') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
    if (!user) return;

    try {
      db.deletePackage(id);
      db.logAction(user.id, user.name, user.role, 'DELETE_AD_PACKAGE', id, `Permanently deleted package ID: ${id}`, '127.0.0.1');
      return res.json({ success: true, message: 'Package deleted successfully.' });
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});