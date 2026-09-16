import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { buyer, listing, buyerId, sellerId, listingId } = req.body || {};

  // Resolve listing if passed via listingId
  if (!listing && listingId) {
    const foundListing = db.listings.find((l) => l.id === listingId);
    if (foundListing) {
      listing = {
        id: foundListing.id,
        title: foundListing.title,
        sellerId: foundListing.sellerId,
        sellerName: foundListing.sellerName,
      };
      if (!sellerId) sellerId = foundListing.sellerId;
    } else {
      listing = {
        id: listingId,
        title: 'Marketplace Item',
        sellerId: sellerId || 'usr-seller',
        sellerName: 'Verified Seller',
      };
    }
  }

  // Resolve buyer if passed via buyerId
  if (!buyer) {
    const bId = buyerId || `usr-buyer-${Date.now()}`;
    const foundUser = db.users.find((u) => u.id === bId);
    buyer = {
      id: bId,
      name: foundUser?.name || 'Interested Buyer',
      avatar: foundUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      email: foundUser?.email || 'buyer@ZOVA.com',
    };
  }

  // Fallback listing if still missing
  if (!listing) {
    listing = {
      id: listingId || `lst-${Date.now()}`,
      title: 'Marketplace Inquiry',
      sellerId: sellerId || 'usr-seller',
      sellerName: 'Seller',
    };
  }

  const thread = db.createOrGetChatThread(
    {
      id: buyer.id,
      name: buyer.name,
      avatar: buyer.avatar,
      email: buyer.email,
    },
    {
      id: listing.id,
      title: listing.title,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
    }
  );

  return res.json(thread);
});

