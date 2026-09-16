import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { db } from '../_lib/database/store.js';

export default createHandler((req, res) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = getAuthenticatedUser(req, res);
  if (!authUser) return;

  const { name, location, avatar, phone } = req.body || {};
  const user = db.users.find((u) => u.id === authUser.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (name) user.name = name.trim();
  if (location) user.location = location.trim();
  if (avatar) user.avatar = avatar.trim();
  if (phone) user.phone = phone.trim();

  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});
