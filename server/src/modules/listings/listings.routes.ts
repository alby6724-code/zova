import { Router, Request, Response } from 'express';
import { db } from '../../database/store.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth.js';
import { broadcast } from '../../websocket/index.js';
import { Listing, ListingCategory, ListingStatus } from '../../types/index.js';

const router = Router();

import { calculateDistanceKm } from '../../database/store.js';

const CATEGORY_MAP: Record<string, ListingCategory> = {
  mobiles: 'Mobiles',
  'mobiles & tablets': 'Mobiles',
  mobile: 'Mobiles',
  tablets: 'Mobiles',
  phones: 'Mobiles',
  smartphones: 'Mobiles',
  laptops: 'Laptops',
  laptop: 'Laptops',
  computers: 'Laptops',
  pc: 'Laptops',
  notebooks: 'Laptops',
  macbook: 'Laptops',
  vehicles: 'Vehicles',
  vehicle: 'Vehicles',
  cars: 'Vehicles',
  bikes: 'Vehicles',
  motorcycles: 'Vehicles',
  scooters: 'Vehicles',
  'home-living': 'Home & Living',
  'home & living': 'Home & Living',
  'home & furniture': 'Home & Living',
  home: 'Home & Living',
  living: 'Home & Living',
  'home-and-living': 'Home & Living',
  kitchen: 'Home & Living',
  furniture: 'Furniture',
  furnitures: 'Furniture',
  sofa: 'Furniture',
  tables: 'Furniture',
  beds: 'Furniture',
  chairs: 'Furniture',
  electronics: 'Electronics',
  electronic: 'Electronics',
  audio: 'Electronics',
  appliances: 'Electronics',
  gadgets: 'Electronics',
  tv: 'Electronics',
  fashion: 'Fashion',
  'fashion & beauty': 'Fashion',
  clothing: 'Fashion',
  shoes: 'Fashion',
  apparel: 'Fashion',
  beauty: 'Fashion',
  jobs: 'Jobs',
  job: 'Jobs',
  employment: 'Jobs',
  careers: 'Jobs',
  vacancies: 'Jobs',
  services: 'Services',
  service: 'Services',
  repair: 'Services',
  freelance: 'Services',
  others: 'Services',
};

function normalizeCategory(cat: string): ListingCategory | string {
  if (!cat) return cat;
  const clean = cat.trim().toLowerCase();
  return CATEGORY_MAP[clean] || cat;
}

// GET all listings (with search, category, status, geolocation radius filters, priority search & pagination)
router.get('/', (req: Request, res: Response) => {
  const { search, category, status, featured, lat, lng, radius, page = '1', limit = '10', publicOnly } = req.query;

  let results = [...db.listings];

  // Geolocation & Haversine distance filtering
  if (lat && lng) {
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const radiusKm = radius ? parseFloat(radius as string) : null;

    if (!isNaN(userLat) && !isNaN(userLng)) {
      results = results
        .map((l) => {
          const dist = calculateDistanceKm(userLat, userLng, l.coordinates.lat, l.coordinates.lng);
          return { ...l, distanceKm: dist };
        })
        .filter((l) => (radiusKm ? (l.distanceKm !== undefined && l.distanceKm <= radiusKm) : true))
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }
  }

  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.sellerName.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'All') {
    const target = normalizeCategory(category as string).toLowerCase();
    results = results.filter((l) => {
      const itemCat = normalizeCategory(l.category).toLowerCase();
      return itemCat === target || l.category.toLowerCase() === (category as string).toLowerCase();
    });
  }

  // Public storefront filter: only show Active approved listings unless status explicitly requested
  if (publicOnly === 'true') {
    results = results.filter((l) => l.status === 'Active');
  } else if (status) {
    results = results.filter((l) => l.status.toLowerCase() === (status as string).toLowerCase());
  }

  if (featured === 'true') {
    results = results.filter((l) => l.featured);
  }

  // Priority Search: Pro tier & featured ads rank at the top
  results.sort((a, b) => {
    const aPriority = (a.tier === 'PRO' ? 2 : 0) + (a.featured ? 1 : 0);
    const bPriority = (b.tier === 'PRO' ? 2 : 0) + (b.featured ? 1 : 0);
    return bPriority - aPriority;
  });

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedResults = results.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginatedResults,
    pagination: {
      total: results.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(results.length / limitNum),
    },
  });
});

// GET seller's own listings (active, pending, under review, rejected)
router.get('/my-ads', (req: Request, res: Response): void => {
  const sellerId = (req.query.sellerId as string) || (req.headers['x-user-id'] as string);
  if (!sellerId) {
    res.status(400).json({ error: 'sellerId is required.' });
    return;
  }

  const myAds = db.listings.filter((l) => l.sellerId === sellerId);
  const activeCount = myAds.filter((l) => l.status === 'Active').length;
  const pendingCount = myAds.filter((l) => l.status === 'Pending' || l.status === 'Under Review').length;
  const rejectedCount = myAds.filter((l) => l.status === 'Rejected' || l.status === 'Flagged').length;

  res.json({
    data: myAds,
    summary: {
      total: myAds.length,
      active: activeCount,
      pending: pendingCount,
      rejected: rejectedCount,
    },
  });
});

// GET user favorites
router.get('/favorites', (req: Request, res: Response): void => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'guest';
  const favorites = db.getUserFavorites(userId);
  res.json({ data: favorites, total: favorites.length });
});

// POST seed demo products and sellers (Idempotent)
router.post('/seed-demo', (req: Request, res: Response): void => {
  const result = db.seedDemoData(true);
  res.status(200).json({
    success: true,
    sellersCount: result.sellersCount,
    listingsCount: result.listingsCount,
    message: `Successfully seeded ${result.listingsCount} demo products and ${result.sellersCount} demo sellers.`,
  });
});

// POST add 20 random products
router.post('/add-random', (req: Request, res: Response): void => {
  const count = Number(req.query.count) || Number(req.body?.count) || 20;
  const added = db.addRandomProducts(count);

  try {
    broadcast({
      type: 'BATCH_LISTINGS_ADDED',
      payload: {
        count: added.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // ignore ws broadcast failure if not running
  }

  res.status(201).json({
    success: true,
    addedCount: added.length,
    totalListings: db.listings.length,
    message: `Successfully added ${added.length} random products to the marketplace. Total active listings: ${db.listings.length}.`,
    listings: added,
  });
});

// DELETE wipe demo data (DELETE WHERE is_demo = true)
router.delete('/seed-demo', (req: Request, res: Response): void => {
  const result = db.clearDemoData();
  res.status(200).json({
    success: true,
    removedUsers: result.removedUsers,
    removedListings: result.removedListings,
    message: `Cleaned up ${result.removedListings} demo listings and ${result.removedUsers} demo sellers.`,
  });
});

// POST toggle favorite
router.post('/:id/favorite', (req: Request, res: Response): void => {
  const listingId = req.params.id as string;
  const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'guest';
  const isFavorited = db.toggleFavorite(userId, listingId);
  res.json({ success: true, favorited: isFavorited, listingId });
});

// GET seller reviews for a listing
router.get('/:id/reviews', (req: Request, res: Response): void => {
  const listingId = req.params.id as string;
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  const reviewsData = db.getSellerReviews(listing.sellerId);
  res.json(reviewsData);
});

// POST review for a seller
router.post('/:id/reviews', (req: Request, res: Response): void => {
  const listingId = req.params.id as string;
  const { buyerId, buyerName, rating, comment } = req.body;
  const listing = db.listings.find((l) => l.id === listingId);

  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  if (!buyerId || !buyerName || !rating || !comment) {
    res.status(400).json({ error: 'buyerId, buyerName, rating (1-5), and comment are required.' });
    return;
  }

  const newReview = db.addReview({
    id: `rev-${Date.now()}`,
    sellerId: listing.sellerId,
    buyerId,
    buyerName,
    rating: Math.min(5, Math.max(1, Number(rating))),
    comment,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(newReview);
});

// GET listing by ID
router.get('/:id', (req: Request, res: Response): void => {
  const listingId = req.params.id as string;
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }
  listing.views += 1;
  res.json(listing);
});

// POST new listing (Seller ad post or Admin creation)
router.post('/', (req: Request, res: Response): void => {
  const {
    title,
    description,
    price,
    category,
    condition = 'Used',
    location = 'Kolkata, West Bengal',
    image,
    images = [],
    sellerName = 'Community Seller',
    sellerEmail = 'seller@zova.com',
    sellerPhone,
    coordinates,
    sellerId: rawSellerId,
    enforceQuota = true,
  } = req.body;

  if (!title || !price || !category) {
    res.status(400).json({ error: 'Title, price, and category are required.' });
    return;
  }

  const sellerId = rawSellerId || `usr-seller-${Date.now()}`;

  // Check active subscription quota
  if (enforceQuota && rawSellerId) {
    const quota = db.canUserPostAd(sellerId);
    if (!quota.allowed) {
      res.status(403).json({
        error: 'SUBSCRIPTION_LIMIT_EXCEEDED',
        message: quota.reason,
        activeCount: quota.activeCount,
        limit: quota.limit,
      });
      return;
    }
  }

  const { tier } = db.getUserActiveSubscription(sellerId);

  // Content moderation blocklist check
  const blockCheck = db.checkContentForBannedKeywords(title, description || '');

  // Default to Pending Review (or Flagged if keyword matched)
  let initialStatus: ListingStatus = req.body.status || 'Pending';
  let autoFlagged = false;
  let autoFlagReason: string | undefined = undefined;

  if (blockCheck.flagged) {
    initialStatus = 'Flagged';
    autoFlagged = true;
    autoFlagReason = `Auto-flagged: Content matches prohibited keyword "${blockCheck.matchedKeyword}"`;
  }

  const photoList = Array.isArray(images) && images.length > 0 ? images : image ? [image] : [];
  const coverPhoto =
    photoList[0] ||
    image ||
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23f1f5f9" width="400" height="300"/><text fill="%2364748b" font-family="sans-serif" font-size="20" font-weight="bold" x="50%" y="50%" text-anchor="middle">ZOVA Item</text></svg>';

  const newListing: Listing = {
    id: `lst-${Date.now()}`,
    title,
    description: description || 'No description provided.',
    price: Number(price),
    currency: '₹',
    category: (normalizeCategory(category) || category) as ListingCategory,
    sellerId,
    sellerName,
    sellerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    sellerEmail,
    sellerPhone,
    location,
    coordinates: coordinates || { lat: 22.5726, lng: 88.3639 },
    image: coverPhoto,
    images: photoList.length > 0 ? photoList : [coverPhoto],
    condition: condition as 'New' | 'Used',
    status: initialStatus,
    featured: tier === 'PRO',
    tier,
    autoFlagged,
    autoFlagReason,
    views: 0,
    createdAt: new Date().toISOString(),
  };

  db.listings.unshift(newListing);

  // Broadcast new activity
  const newActivity = {
    id: `act-${Date.now()}`,
    type: 'listing_posted' as const,
    title: initialStatus === 'Active' ? 'New listing posted' : 'New listing submitted for review',
    description: `${newListing.title} (${newListing.category}) - Status: ${initialStatus}`,
    timeAgo: 'Just now',
    createdAt: new Date().toISOString(),
  };
  db.activities.unshift(newActivity);

  broadcast({
    type: initialStatus === 'Active' ? 'NEW_LISTING' : 'NEW_LISTING_PENDING',
    payload: newListing,
  });

  res.status(201).json(newListing);
});

// Update listing status (Admin & Moderator only)
router.patch('/:id/status', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req: AuthenticatedRequest, res: Response): void => {
  const { status, featured, rejectionReason } = req.body;
  const listing = db.listings.find((l) => l.id === req.params.id);

  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  if (status) {
    listing.status = status as ListingStatus;
  }

  if (rejectionReason) {
    listing.rejectionReason = rejectionReason;
  } else if (status === 'Active') {
    listing.rejectionReason = undefined;
  }

  if (typeof featured === 'boolean') {
    listing.featured = featured;
  }

  db.logAction(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'LISTING_STATUS_UPDATE',
    listing.id,
    `Status updated to ${status || 'unchanged'}, rejectionReason: ${rejectionReason || 'none'}, featured: ${listing.featured}`,
    req.ip || '127.0.0.1'
  );

  broadcast({
    type: 'LISTING_UPDATED',
    payload: listing,
  });

  res.json(listing);
});

// Delete listing
router.delete('/:id', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const index = db.listings.findIndex((l) => l.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  const [removed] = db.listings.splice(index, 1);

  db.logAction(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'LISTING_DELETED',
    removed.id,
    `Removed listing: ${removed.title}`,
    req.ip || '127.0.0.1'
  );

  res.json({ success: true, message: 'Listing deleted successfully.' });
});

export default router;
