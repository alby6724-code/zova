import { Router, Response } from 'express';
import { db } from '../../database/store.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();

// Dashboard overview data
router.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  const kpis = db.getKPIs();
  const categories = db.getCategoriesBreakdown();
  const activity = db.getPlatformActivity();
  const userTypes = db.getUserTypeDistribution();
  const topSellers = db.getTopSellers();
  const recentActivity = db.activities.slice(0, 10);
  const recentListings = db.listings.filter((l) => l.status === 'Active');
  const reportedListings = db.reports.slice(0, 5);
  const recentChats = db.chats.slice(0, 4);

  res.json({
    kpis,
    categories,
    activity,
    userTypes,
    topSellers,
    recentActivity,
    recentListings,
    reportedListings,
    recentChats,
  });
});

router.get('/kpis', (req: AuthenticatedRequest, res: Response) => {
  res.json(db.getKPIs());
});

router.get('/categories', (req: AuthenticatedRequest, res: Response) => {
  res.json(db.getCategoriesBreakdown());
});

router.get('/activity', (req: AuthenticatedRequest, res: Response) => {
  res.json(db.getPlatformActivity());
});

router.get('/user-types', (req: AuthenticatedRequest, res: Response) => {
  res.json(db.getUserTypeDistribution());
});

router.get('/top-sellers', (req: AuthenticatedRequest, res: Response) => {
  res.json(db.getTopSellers());
});

router.get('/recent-activity', (req: AuthenticatedRequest, res: Response) => {
  res.json(db.activities);
});

export default router;
