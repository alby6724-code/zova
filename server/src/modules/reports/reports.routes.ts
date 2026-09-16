import { Router, Request, Response } from 'express';
import { db } from '../../database/store.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();

// GET all reports
router.get('/', (req: Request, res: Response) => {
  res.json(db.reports);
});

// POST resolve a report
router.post('/:id/resolve', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req: AuthenticatedRequest, res: Response): void => {
  const { action, note } = req.body; // 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER'
  const report = db.reports.find((r) => r.id === req.params.id);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
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
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'REPORT_RESOLVED',
    report.id,
    `Resolved report on "${report.listingTitle}" with action: ${action}. Note: ${note || 'None'}`,
    req.ip || '127.0.0.1'
  );

  res.json({ success: true, report });
});

export default router;
