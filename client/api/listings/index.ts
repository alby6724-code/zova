import { createHandler } from '../_lib/handler.js';
import { db, calculateDistanceKm } from '../_lib/database/store.js';
import { broadcast } from '../_lib/websocket.js';
import { Listing, ListingCategory, ListingStatus } from '../_lib/types.js';

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

export default createHandler((req, res) => {
  // GET /api/listings
  if (req.method === 'GET') {
    const { search, category, status, featured, lat, lng, radius, page = '1', limit = '10', publicOnly } = req.query || {};

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
          l.location.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'All' && category !== 'all') {
      const normalizedQueryCat = normalizeCategory(category as string);
      results = results.filter((l) => {
        const itemCat = normalizeCategory(l.category);
        return (
          itemCat.toLowerCase() === (normalizedQueryCat as string).toLowerCase() ||
          l.category.toLowerCase() === (category as string).toLowerCase()
        );
      });
    }

    if (status) {
      results = results.filter((l) => l.status === status);
    } else if (publicOnly === 'true') {
      results = results.filter((l) => l.status === 'Active');
    }

    if (featured !== undefined) {
      results = results.filter((l) => l.featured === (featured === 'true'));
    }

    // Sort: Featured and Pro first, then newest
    results.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedResults = results.slice(startIndex, startIndex + limitNum);

    return res.json({
      data: paginatedResults,
      pagination: {
        total: results.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(results.length / limitNum),
      },
    });
  }

  // POST /api/listings
  if (req.method === 'POST') {
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
      sellerEmail = 'seller@ZOVA.com',
      sellerPhone,
      coordinates,
      sellerId: rawSellerId,
      enforceQuota = true,
    } = req.body || {};

    if (!title || !price || !category) {
      return res.status(400).json({ error: 'Title, price, and category are required.' });
    }

    const sellerId = rawSellerId || `usr-seller-${Date.now()}`;

    // Check active subscription quota
    if (enforceQuota && rawSellerId) {
      const quota = db.canUserPostAd(sellerId);
      if (!quota.allowed) {
        return res.status(403).json({
          error: 'SUBSCRIPTION_LIMIT_EXCEEDED',
          message: quota.reason,
          activeCount: quota.activeCount,
          limit: quota.limit,
        });
      }
    }

    const { tier } = db.getUserActiveSubscription(sellerId);

    // Content moderation blocklist check
    const blockCheck = db.checkContentForBannedKeywords(title, description || '');

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

    return res.status(201).json(newListing);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});

