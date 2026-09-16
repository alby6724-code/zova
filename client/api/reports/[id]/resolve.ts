import { createHandler, getIdParam, getClientIp } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR']);
  if (!user) return;

  const reportId = getIdParam(req);
  if (!reportId) {
    return res.status(400).json({ error: 'Report ID is required' });
  }

  const { action, note } = req.body || {}; // 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER'
  const report = db.reports.find((r) => r.id === reportId);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const listing = db.listings.find((l) => l.id === report.listingId);

  if (action === 'REMOVE_LISTING' && listing) {
    listing.status = 'Removed';
    report.status = 'Action Taken';
  } else if (action === 'BAN_USER' && listing) {
    listing.status = 'Removed';
    const seller = db.users.find((u) => u.id === listing.sellerId);
    if (seller) {
      seller.status = 'BANNED';
    }
    report.status = 'Action Taken';
  } else {
    report.status = 'Dismissed';
  }

  db.logAction(
    user.id,
    user.name,
    user.role,
    'REPORT_RESOLVED',
    report.id,
    `Resolved report on "${report.listingTitle}" with action: ${action}. Note: ${note || 'None'}`,
    getClientIp(req)
  );

  return res.json({ success: true, report });
});
