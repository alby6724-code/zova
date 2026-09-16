import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query?.userId as string) || (req.headers?.['x-user-id'] as string) || 'guest';
  const favorites = db.getUserFavorites(userId);
  return res.json({ data: favorites, total: favorites.length });
});
