import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res);
  if (!user) return;

  return res.json(db.getUserTypeDistribution());
});
