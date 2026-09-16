import { createHandler, getIdParam, getClientIp } from '../../_lib/handler.js';
import { db } from '../../_lib/database/store.js';
import { broadcast } from '../../_lib/websocket.js';
import { Report } from '../../_lib/types.js';

export default createHandler((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chatId = getIdParam(req);
  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  const { reason = 'Suspicious activity or fraud', reportedBy = 'User' } = req.body || {};
  const chat = db.chats.find((c) => c.id === chatId);

  if (!chat) {
    return res.status(404).json({ error: 'Chat thread not found' });
  }

  const report: Report = {
    id: `rep-chat-${Date.now()}`,
    listingId: chat.listingId || 'chat',
    listingTitle: `Chat with ${chat.user.name} (${chat.listingTitle})`,
    reason: reason as any,
    reportedBy,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Pending',
  };

  db.reports.unshift(report);
  db.logAction('USER', reportedBy, 'BUYER', 'CHAT_REPORTED', chat.id, `Reported chat with ${chat.user.name} for: ${reason}`, getClientIp(req));

  broadcast({
    type: 'CHAT_REPORTED',
    payload: report,
  });

  return res.json({ success: true, message: 'Conversation reported to moderation team.' });
});
