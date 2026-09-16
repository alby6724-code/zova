import { createHandler, getIdParam } from '../../_lib/handler.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  const listingId = getIdParam(req);
  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (req.method === 'GET') {
    const reviewsData = db.getSellerReviews(listing.sellerId);
    return res.json(reviewsData);
  }

  if (req.method === 'POST') {
    const { buyerId, buyerName, rating, comment } = req.body || {};

    if (!buyerId || !buyerName || !rating || !comment) {
      return res.status(400).json({ error: 'buyerId, buyerName, rating (1-5), and comment are required.' });
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

    return res.status(201).json(newReview);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
