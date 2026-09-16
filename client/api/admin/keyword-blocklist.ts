import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
  if (!user) return;

  if (req.method === 'GET') {
    return res.json({ keywords: db.bannedKeywords });
  }

  if (req.method === 'POST') {
    const { keyword } = req.body || {};
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ error: 'keyword string is required.' });
    }
    const clean = keyword.trim().toLowerCase();
    if (!db.bannedKeywords.includes(clean)) {
      db.bannedKeywords.push(clean);
    }
    return res.json({ success: true, keywords: db.bannedKeywords });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
