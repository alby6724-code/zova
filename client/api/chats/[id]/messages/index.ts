import { createHandler, getIdParam } from '../../../_lib/handler.js';
import { db } from '../../../_lib/database/store.js';
import { broadcast } from '../../../_lib/websocket.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chatId = getIdParam(req);
  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

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
  } = req.body || {};

  let displayText = text;
  if (!displayText) {
    if (type === 'voice') displayText = `🎤 Voice message (${duration || 0}s)`;
    else if (type === 'location') displayText = `📍 Location: ${locationData?.address || 'Shared location'}`;
    else if (type === 'offer') displayText = `🏷️ Offer: ₹${offerData?.amount?.toLocaleString()}`;
    else {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }
  }

  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat thread not found' });
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

  broadcast({
    type: 'NEW_CHAT_MESSAGE',
    payload: {
      threadId: chat.id,
      message,
    },
  });

  return res.status(201).json(message);
});
