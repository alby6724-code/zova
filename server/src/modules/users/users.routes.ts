import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../database/store.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth.js';
import { User, UserRole, UserStatus } from '../../types/index.js';

const router = Router();

// GET all users
router.get('/', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req: AuthenticatedRequest, res: Response) => {
  const { search, role, status, page = '1', limit = '10' } = req.query;

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

  res.json({
    data: paginatedResults,
    pagination: {
      total: results.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(results.length / limitNum),
    },
  });
});

// POST create user (from Quick Actions "+ Add New User")
router.post('/', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const { name, email, password, role = 'BUYER', phone, location } = req.body;

  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required.' });
    return;
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(400).json({ error: 'A user with this email address already exists.' });
    return;
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
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'USER_CREATED',
    newUser.id,
    `Created user: ${newUser.name} (${newUser.email}) with role: ${newUser.role}`,
    req.ip || '127.0.0.1'
  );

  const { passwordHash, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// Update current user profile (Name, Location, Avatar, Phone)
router.patch('/profile', authenticateJWT, (req: AuthenticatedRequest, res: Response): void => {
  const { name, location, avatar, phone } = req.body;
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (name) user.name = name.trim();
  if (location) user.location = location.trim();
  if (avatar) user.avatar = avatar.trim();
  if (phone) user.phone = phone.trim();

  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// Update user status / role
router.patch('/:id', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const { status, role } = req.body;
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (status) {
    user.status = status as UserStatus;
  }

  if (role) {
    user.role = role as UserRole;
  }

  db.logAction(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'USER_MODIFIED',
    user.id,
    `Updated status: ${status || 'unchanged'}, role: ${role || 'unchanged'} for ${user.email}`,
    req.ip || '127.0.0.1'
  );

  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// Admin Unlock endpoint
router.post('/:id/unlock', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const result = db.adminUnlock(user.id, req.user!.id, req.user!.name, req.ip || '127.0.0.1');

  res.json({
    success: true,
    message: `Account for ${result.email} successfully unlocked.`,
  });
});

export default router;
