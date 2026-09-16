import { Router, Response } from 'express';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth.js';
import { db } from '../../database/store.js';

const router = Router();

// Enforce strict authentication and administrative role requirement on all /api/admin routes
router.use(authenticateJWT);
router.use(requireRoles(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']));

// Admin session verification
router.get('/session', (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    authenticated: true,
    user: {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
      twoFactorEnabled: req.user!.twoFactorEnabled,
    },
    permissions: {
      canManageUsers: ['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role),
      canManageListings: true,
      canModerateReports: true,
      canViewFinancials: ['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role),
      canUnlockAccounts: ['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role),
    },
  });
});

// Admin security & health metrics
router.get('/metrics', (req: AuthenticatedRequest, res: Response): void => {
  const lockedUsersCount = db.failedAttempts.filter(
    (f) => f.lockedUntil && new Date(f.lockedUntil).getTime() > Date.now()
  ).length;

  const totalUsers = db.users.length;
  const adminStaff = db.users.filter((u) => ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'].includes(u.role)).length;
  const twoFactorEnforced = db.users.filter((u) => u.twoFactorEnabled).length;

  res.json({
    platformStatus: 'HEALTHY',
    timestamp: new Date().toISOString(),
    security: {
      activeLocks: lockedUsersCount,
      totalRegisteredUsers: totalUsers,
      administrativeStaff: adminStaff,
      twoFactorCoveragePercent: totalUsers > 0 ? Math.round((twoFactorEnforced / totalUsers) * 100) : 0,
      recentFailedAttempts: db.failedAttempts.length,
    },
    system: {
      nodeVersion: process.version,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

// Admin audit trail
router.get('/audit-trail', (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    total: db.auditLogs.length,
    logs: db.auditLogs.slice(-50).reverse(),
  });
});

// Admin account unlock override
router.post('/lockout/reset', (req: AuthenticatedRequest, res: Response): void => {
  const { targetEmailOrUserId } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!targetEmailOrUserId) {
    res.status(400).json({ error: 'targetEmailOrUserId is required.' });
    return;
  }

  const result = db.adminUnlock(targetEmailOrUserId, req.user!.id, req.user!.name, ip);
  res.json({
    success: true,
    message: `Account ${result.email} has been unlocked by ${req.user!.name}. Failed attempt counters reset.`,
  });
});

// --- PENDING ADS MODERATION QUEUE ---
router.get('/pending-listings', (req: AuthenticatedRequest, res: Response): void => {
  const pending = db.listings.filter(
    (l) => l.status === 'Pending' || l.status === 'Under Review' || l.status === 'Flagged'
  );
  res.json({
    data: pending,
    total: pending.length,
    flaggedCount: pending.filter((l) => l.status === 'Flagged' || l.autoFlagged).length,
  });
});

// Approve Ad
router.post('/listings/:id/approve', (req: AuthenticatedRequest, res: Response): void => {
  const listingId = req.params.id as string;
  try {
    const listing = db.approveListing(listingId, req.user!.id, req.user!.name);
    res.json({
      success: true,
      message: `Listing "${listing.title}" approved and is now live!`,
      listing,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Listing not found' });
  }
});

// Reject Ad with specific reason
router.post('/listings/:id/reject', (req: AuthenticatedRequest, res: Response): void => {
  const listingId = req.params.id as string;
  const { reason = 'Does not comply with community marketplace guidelines.' } = req.body;
  try {
    const listing = db.rejectListing(listingId, reason, req.user!.id, req.user!.name);
    res.json({
      success: true,
      message: `Listing "${listing.title}" has been rejected. Reason logged.`,
      listing,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Listing not found' });
  }
});

// Bulk Moderate Ads
router.post('/listings/bulk-moderate', (req: AuthenticatedRequest, res: Response): void => {
  const { listingIds, action, reason } = req.body;
  if (!Array.isArray(listingIds) || !['APPROVE', 'REJECT'].includes(action)) {
    res.status(400).json({ error: 'listingIds array and action (APPROVE/REJECT) are required.' });
    return;
  }

  const result = db.bulkModerateListings(listingIds, action, reason, req.user!.id, req.user!.name);
  res.json({
    success: true,
    modifiedCount: result.modifiedCount,
    message: `Successfully executed bulk ${action} on ${result.modifiedCount} listing(s).`,
  });
});

// Edit Ad details before approving
router.put('/listings/:id', (req: AuthenticatedRequest, res: Response): void => {
  const listingId = req.params.id as string;
  try {
    const updated = db.updateListingDetails(listingId, req.body, req.user!.id, req.user!.name);
    res.json({ success: true, listing: updated });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Listing not found' });
  }
});

// Suspend User
router.post('/users/:id/suspend', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.params.id as string;
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  user.status = 'SUSPENDED';
  // Unpublish all user's listings
  db.listings.forEach((l) => {
    if (l.sellerId === user.id) {
      l.status = 'Removed';
    }
  });

  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    adminId: req.user!.id,
    adminName: req.user!.name,
    adminRole: req.user!.role,
    action: 'USER_SUSPENDED',
    target: user.id,
    details: `Suspended user ${user.name} (${user.email || user.phone}) and unpublished all active ads.`,
    ip: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: `User ${user.name} has been suspended.` });
});

// --- SUBSCRIPTION REVENUE & SUBSCRIBERS ---
router.get('/subscriptions/stats', (req: AuthenticatedRequest, res: Response): void => {
  const activeSubs = db.subscriptions.filter((s) => s.status === 'ACTIVE');
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const freeCount = db.users.length - activeSubs.length;
  const basicCount = activeSubs.filter((s) => s.tier === 'BASIC').length;
  const proCount = activeSubs.filter((s) => s.tier === 'PRO').length;

  const totalMonthlyRevenue =
    basicCount * 199 + proCount * 499;

  const expiringSoon = activeSubs
    .filter((s) => {
      const expTime = new Date(s.expiresAt).getTime();
      return expTime > now && expTime - now < sevenDays;
    })
    .map((s) => {
      const user = db.users.find((u) => u.id === s.userId);
      return {
        ...s,
        userName: user?.name || 'Seller',
        userPhone: user?.phone || '',
      };
    });

  res.json({
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

// --- BANNED KEYWORD BLOCKLIST MANAGEMENT ---
router.get('/keyword-blocklist', (req: AuthenticatedRequest, res: Response): void => {
  res.json({ keywords: db.bannedKeywords });
});

router.post('/keyword-blocklist', (req: AuthenticatedRequest, res: Response): void => {
  const { keyword } = req.body;
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: 'keyword string is required.' });
    return;
  }
  const clean = keyword.trim().toLowerCase();
  if (!db.bannedKeywords.includes(clean)) {
    db.bannedKeywords.push(clean);
  }
  res.json({ success: true, keywords: db.bannedKeywords });
});

// --- PREMIUM TIERS MANAGEMENT (ADMIN CRUD) ---
router.get('/tiers', (req: AuthenticatedRequest, res: Response): void => {
  const tiers = db.getTiers(true);
  res.json({ tiers, total: tiers.length });
});

router.post('/tiers', (req: AuthenticatedRequest, res: Response): void => {
  const { name, description, benefits, active, displayOrder, featured, badge, perAdPrice, maxCustomAds } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Tier name is required.' });
    return;
  }
  const tier = db.createTier({
    name,
    description: description || '',
    benefits: Array.isArray(benefits) ? benefits : [benefits].filter(Boolean),
    active: active !== false,
    displayOrder: Number(displayOrder) || db.tiers.length + 1,
    featured: Boolean(featured),
    badge,
    perAdPrice: Number(perAdPrice) || 150,
    maxCustomAds: Number(maxCustomAds) || 28,
  });
  res.status(201).json({ success: true, tier });
});

router.put('/tiers/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const tier = db.updateTier(req.params.id as string, req.body);
    res.json({ success: true, tier });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Tier not found' });
  }
});

router.delete('/tiers/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    db.deleteTier(req.params.id as string);
    res.json({ success: true, message: 'Tier deleted successfully' });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Tier not found' });
  }
});

// --- PREMIUM PACKAGES MANAGEMENT (ADMIN CRUD) ---
router.get('/packages', (req: AuthenticatedRequest, res: Response): void => {
  const packages = db.getPackages(undefined, true);
  const tiers = db.getTiers(true);
  res.json({ packages, tiers, total: packages.length });
});

router.post('/packages', (req: AuthenticatedRequest, res: Response): void => {
  const { tierId, name, adsCount, credits, durationDays, durationValue, durationUnit, price, badge, status, active, displayOrder, sortOrder } = req.body;
  const count = adsCount ?? credits;
  if (!name || count === undefined || price === undefined) {
    res.status(400).json({ error: 'Missing required fields: name, adsCount/credits, price' });
    return;
  }
  const resolvedTierId = tierId || 'tier-platinum';
  const isActive = active !== undefined ? Boolean(active) : (status !== 'INACTIVE');
  const durVal = durationValue ? Number(durationValue) : (durationDays ? Math.round(Number(durationDays) / 30) || 1 : 1);

  const pkg = db.createPackage({
    tierId: resolvedTierId,
    name,
    adsCount: Number(count),
    price: Number(price),
    currency: '₹',
    durationValue: durVal,
    durationUnit: durationUnit || 'Month',
    active: isActive,
    displayOrder: Number(displayOrder ?? sortOrder) || 0,
    badge: badge ? String(badge) : undefined,
  });
  res.status(201).json({ success: true, package: pkg });
});

router.put('/packages/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { tierId, name, adsCount, credits, price, durationValue, durationDays, durationUnit, active, status, displayOrder, sortOrder, badge } = req.body;
    const updates: any = {};
    if (tierId !== undefined) updates.tierId = tierId;
    if (name !== undefined) updates.name = name;
    if (adsCount !== undefined || credits !== undefined) updates.adsCount = Number(adsCount ?? credits);
    if (price !== undefined) updates.price = Number(price);
    if (durationValue !== undefined) updates.durationValue = Number(durationValue);
    else if (durationDays !== undefined) updates.durationValue = Math.round(Number(durationDays) / 30) || 1;
    if (durationUnit !== undefined) updates.durationUnit = durationUnit;
    if (active !== undefined) updates.active = Boolean(active);
    else if (status !== undefined) updates.active = status === 'ACTIVE';
    if (displayOrder !== undefined || sortOrder !== undefined) updates.displayOrder = Number(displayOrder ?? sortOrder);
    if (badge !== undefined) updates.badge = badge;

    const pkg = db.updatePackage(req.params.id as string, updates);
    res.json({ success: true, package: pkg });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Package not found' });
  }
});

router.delete('/packages/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    db.deletePackage(req.params.id as string);
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Package not found' });
  }
});

// --- GLOBAL COMPANY BRANDING SETTINGS (ADMIN) ---
router.get('/settings', (req: AuthenticatedRequest, res: Response): void => {
  res.json({ settings: db.getSettings() });
});

router.put('/settings', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const updated = db.updateSettings(req.body, req.user?.id, req.user?.name);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update settings' });
  }
});

export default router;

