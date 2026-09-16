import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './database/store.js';
import { User, UserRole } from './types.js';

export interface AuthenticatedUser extends User {}

export function getAuthenticatedUser(
  req: any,
  res: any,
  allowedRoles?: UserRole[]
): User | null {
  let token: string | undefined;
  const authHeader = req.headers?.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies) {
    token = req.cookies.zioee_token || req.cookies.accessToken || req.cookies.token;
  }

  if (!token && typeof req.headers?.cookie === 'string') {
    const parts = req.headers.cookie.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      if (['zioee_token', 'accessToken', 'token'].includes(k)) {
        try {
          token = decodeURIComponent(v.join('='));
        } catch {
          token = v.join('=');
        }
        break;
      }
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: UserRole;
      name?: string;
    };
    let user = db.users.find((u) => u.id === decoded.id || u.email.toLowerCase() === decoded.email?.toLowerCase());

    // In ephemeral serverless instances, if a cryptographically verified user is missing from memory,
    // safely recover the user session in store using verified JWT claims
    if (!user && decoded.id && decoded.email) {
      user = {
        id: decoded.id,
        name: decoded.name || (decoded.role === 'SUPER_ADMIN' ? 'System Administrator' : 'User'),
        email: decoded.email,
        role: decoded.role,
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        twoFactorEnabled: false,
        listingsCount: 0,
        totalViews: 0,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      db.users.push(user);
    }

    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return null;
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      res.status(403).json({ error: `Account is ${user.status.toLowerCase()}. Contact administrator.` });
      return null;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: `Forbidden: Insufficient privileges. Required one of: ${allowedRoles.join(', ')}`,
        currentRole: user.role,
      });
      return null;
    }

    req.user = user;
    return user;
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return null;
  }
}

export function check2FA(user: User, res: any): boolean {
  if (['SUPER_ADMIN', 'ADMIN'].includes(user.role) && !user.twoFactorEnabled) {
    res.status(403).json({
      error: '2FA_REQUIRED',
      message: 'Two-Factor Authentication must be enabled for administrative accounts.',
    });
    return false;
  }
  return true;
}
