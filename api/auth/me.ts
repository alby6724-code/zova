import { createHandler } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';

export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthenticatedUser(req, res);
  if (!user) return;

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    status: user.status,
    twoFactorEnabled: user.twoFactorEnabled,
    phone: user.phone,
    location: user.location,
    listingsCount: user.listingsCount,
    totalViews: user.totalViews,
  });
});
