import { createHandler } from '../../../../_lib/handler.js';
import { db } from '../../../../_lib/database/store.js';
import { broadcast } from '../../../../_lib/websocket.js';

export default createHandler((req, res) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chatId = (Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id) as string;
  const messageId = (Array.isArray(req.query?.messageId) ? req.query.messageId[0] : req.query?.messageId) as string;

  if (!chatId || !messageId) {
    return res.status(400).json({ error: 'Chat ID and Message ID are required' });
  }

  const { action, counterAmount } = req.body || {};
  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat thread not found' });
  }

  const message = chat.messages.find((m) => m.id === messageId);
  if (!message || !message.offerData) {
    return res.status(404).json({ error: 'Offer message not found' });
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

  return res.json({ success: true, message });
});
