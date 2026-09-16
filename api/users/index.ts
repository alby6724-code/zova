import { createHandler, getClientIp } from '../_lib/handler.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import bcrypt from 'bcryptjs';
import { db } from '../_lib/database/store.js';
import { User, UserRole } from '../_lib/types.js';

export default createHandler((req, res) => {
  // GET /api/users
  if (req.method === 'GET') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR']);
    if (!user) return;

    const { search, role, status, page = '1', limit = '10' } = req.query || {};

    let results = [...db.users];

    if (search) {
      const q = (search as string).toLowerCase();
      results = results.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }

    if (role) {
      results = results.filter((u) => u.role === role);
    }

    if (status) {
      results = results.filter((u) => u.status === status);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedResults = results.slice(startIndex, startIndex + limitNum).map((u) => {
      const { passwordHash, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    return res.json({
      data: paginatedResults,
      pagination: {
        total: results.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(results.length / limitNum),
      },
    });
  }

  // POST /api/users
  if (req.method === 'POST') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
    if (!user) return;

    const { name, email, password, role = 'BUYER', phone, location } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      passwordHash: bcrypt.hashSync(password || 'password123', 10),
      role: role as UserRole,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      status: 'ACTIVE',
      twoFactorEnabled: false,
      listingsCount: 0,
      totalViews: 0,
      phone: phone || '+91 98000 00000',
      location: location || 'Kolkata, West Bengal',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    db.users.push(newUser);

    db.logAction(
      user.id,
      user.name,
      user.role,
      'USER_CREATED',
      newUser.id,
      `Created user: ${newUser.name} (${newUser.email}) with role: ${newUser.role}`,
      getClientIp(req)
    );

    const { passwordHash, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
