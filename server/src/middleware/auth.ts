import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../database/store.js';
import { User, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: UserRole };
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      res.status(403).json({ error: `Account is ${user.status.toLowerCase()}. Contact administrator.` });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Insufficient privileges. Required one of: ${allowedRoles.join(', ')}`,
        currentRole: req.user.role,
      });
      return;
    }

    next();
  };
};

export const require2FA = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.role) && !req.user.twoFactorEnabled) {
    res.status(403).json({
      error: '2FA_REQUIRED',
      message: 'Two-Factor Authentication must be enabled for administrative accounts.',
    });
    return;
  }

  next();
};
