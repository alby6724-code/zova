import { Router, Request, Response } from 'express';
import { db } from '../../database/store.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.js';
import { broadcast } from '../../websocket/index.js';

const router = Router();

// GET all chat threads
router.get('/', (req: Request, res: Response) => {
  res.json(db.chats);
});

// GET specific thread
router.get('/:id', (req: Request, res: Response): void => {
  const chat = db.chats.find((c) => c.id === req.params.id);
  if (!chat) {
    res.status(404).json({ error: 'Chat thread not found' });
    return;
  }
  chat.unread = false;
  res.json(chat);
});

// POST send message in thread (supports text, voice, location, offer)
router.post('/:id/messages', (req: Request, res: Response): void => {
  const {
    text = '',
    type = 'text',
    audioUrl,
    duration,
    locationData,
    offerData,
    senderName = 'Buyer',
    senderId = 'usr-1',
    senderAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  } = req.body;

  let displayText = text;
  if (!displayText) {
    if (type === 'voice') displayText = `🎤 Voice message (${duration || 0}s)`;
    else if (type === 'location') displayText = `📍 Location: ${locationData?.address || 'Shared location'}`;
    else if (type === 'offer') displayText = `🏷️ Offer: ₹${offerData?.amount?.toLocaleString()}`;
    else {
      res.status(400).json({ error: 'Message content cannot be empty' });
      return;
    }
  }

  const chat = db.chats.find((c) => c.id === req.params.id);
  if (!chat) {
    res.status(404).json({ error: 'Chat thread not found' });
    return;
  }

  const message = {
    id: `m-${Date.now()}`,
    senderId,
    senderName,
    senderAvatar,
    text: displayText,
    type,
    audioUrl,
    duration,
    locationData,
    offerData,
    status: 'sent' as const,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  chat.messages.push(message);
  chat.lastMessage = displayText;
  chat.timeAgo = 'Just now';

  broadcast({
    type: 'CHAT_MESSAGE_SENT',
    payload: {
      threadId: chat.id,
      message,
    },
  });

  res.status(201).json(message);
});

// PATCH respond to offer in chat (Accept, Reject, Counter)
router.patch('/:id/messages/:messageId/offer', (req: Request, res: Response): void => {
  const { action, counterAmount, responderId, responderName } = req.body;
  const chat = db.chats.find((c) => c.id === req.params.id);
  if (!chat) {
    res.status(404).json({ error: 'Chat thread not found' });
    return;
  }

  const message = chat.messages.find((m) => m.id === req.params.messageId);
  if (!message || !message.offerData) {
    res.status(404).json({ error: 'Offer message not found' });
    return;
  }

  if (action === 'ACCEPT') {
    message.offerData.status = 'ACCEPTED';
    message.text = `✅ Offer of ₹${message.offerData.amount.toLocaleString()} ACCEPTED!`;
  } else if (action === 'REJECT') {
    message.offerData.status = 'REJECTED';
    message.text = `❌ Offer of ₹${message.offerData.amount.toLocaleString()} declined.`;
  } else if (action === 'COUNTER' && counterAmount) {
    message.offerData.status = 'COUNTERED';
    message.offerData.counterAmount = Number(counterAmount);
    message.text = `🔄 Counter-offer proposed: ₹${Number(counterAmount).toLocaleString()}`;
  }

  chat.lastMessage = message.text;
  chat.timeAgo = 'Just now';

  broadcast({
    type: 'OFFER_UPDATED',
    payload: {
      threadId: chat.id,
      message,
    },
  });

  res.json({ success: true, message });
});

// POST user-to-user chat thread create or get (supports both raw IDs and nested objects)
router.post('/create-or-get', (req: Request, res: Response): void => {
  let { buyer, listing, buyerId, sellerId, listingId } = req.body;

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
      email: foundUser?.email || 'buyer@zova.com',
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

  res.json(thread);
});

// POST report conversation for safety/fraud
router.post('/:id/report', (req: Request, res: Response): void => {
  const { reason = 'Suspicious activity or fraud', reportedBy = 'User' } = req.body;
  const chat = db.chats.find((c) => c.id === req.params.id);

  if (!chat) {
    res.status(404).json({ error: 'Chat thread not found' });
    return;
  }

  const report = {
    id: `rep-chat-${Date.now()}`,
    listingId: chat.listingId || 'chat',
    listingTitle: `Chat with ${chat.user.name} (${chat.listingTitle})`,
    reason: reason as any,
    reportedBy,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Pending' as const,
  };

  db.reports.unshift(report);
  db.logAction('USER', reportedBy, 'BUYER', 'CHAT_REPORTED', chat.id, `Reported chat with ${chat.user.name} for: ${reason}`, req.ip || '127.0.0.1');

  broadcast({
    type: 'CHAT_REPORTED',
    payload: report,
  });

  res.json({ success: true, message: 'Conversation reported to moderation team.' });
});

export default router;

