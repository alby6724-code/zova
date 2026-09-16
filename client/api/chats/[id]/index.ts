import { createHandler, getIdParam } from '../../_lib/handler.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chatId = getIdParam(req);
  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  const chat = db.chats.find((c) => c.id === chatId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat thread not found' });
  }

  chat.unread = false;
  return res.json(chat);
});
