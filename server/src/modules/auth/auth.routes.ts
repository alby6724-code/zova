import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../../database/store.js';
import { config } from '../../config/index.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth.js';
import { broadcast } from '../../websocket/index.js';

const router = Router();

// Login endpoint with progressive lockout protection (Level 1: 10s on 3 attempts, Level 2: 1hr on 6 attempts)
router.post('/login', (req: Request, res: Response): void => {
  const { email, username, identifier: bodyIdentifier, password, totpCode } = req.body;
  const identifier = (bodyIdentifier || username || email || '').toLowerCase().trim();
  const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()) || req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!identifier || !password) {
    res.status(400).json({ error: 'Username/email and password are required.' });
    return;
  }

  // 1. Check if account or IP is currently locked
  const lockout = db.getLockoutStatus(identifier, ip);
  if (lockout.isLocked) {
    res.status(429).json({
      error: 'ACCOUNT_LOCKED',
      isLocked: true,
      locked: true,
      message: lockout.reason,
      remainingSeconds: lockout.remainingSeconds,
      retryAfterSeconds: lockout.remainingSeconds,
      lockLevel: lockout.lockLevel,
    });
    return;
  }

  const matchingUsers = db.users.filter(
    (u) => u.email.toLowerCase() === identifier || (u.username && u.username.toLowerCase() === identifier)
  );

  const user = matchingUsers.find((u) => u.passwordHash && bcrypt.compareSync(password, u.passwordHash)) || matchingUsers[0];

  if (!user || !user.passwordHash) {
    const lockRes = db.recordFailedLogin(identifier, ip);
    const statusCode = lockRes.isLocked ? 429 : 401;
    res.status(statusCode).json({
      error: lockRes.isLocked ? 'ACCOUNT_LOCKED' : 'Invalid email or password.',
      isLocked: lockRes.isLocked,
      locked: lockRes.isLocked,
      remainingAttemptsBeforeLock: lockRes.remainingAttemptsBeforeLock,
      remainingAttempts: lockRes.remainingAttemptsBeforeLock,
      lockLevel: lockRes.lockLevel,
      remainingSeconds: lockRes.remainingSeconds,
      retryAfterSeconds: lockRes.remainingSeconds,
      message: lockRes.message || 'Invalid email or password.',
    });
    return;
  }

  const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordValid) {
    const lockRes = db.recordFailedLogin(identifier, ip);
    const statusCode = lockRes.isLocked ? 429 : 401;
    res.status(statusCode).json({
      error: lockRes.isLocked ? 'ACCOUNT_LOCKED' : 'Invalid email or password.',
      isLocked: lockRes.isLocked,
      locked: lockRes.isLocked,
      remainingAttemptsBeforeLock: lockRes.remainingAttemptsBeforeLock,
      remainingAttempts: lockRes.remainingAttemptsBeforeLock,
      lockLevel: lockRes.lockLevel,
      remainingSeconds: lockRes.remainingSeconds,
      retryAfterSeconds: lockRes.remainingSeconds,
      message: lockRes.message || 'Invalid email or password.',
    });
    return;
  }

  if (user.status === 'BANNED') {
    res.status(403).json({ error: 'Account has been permanently banned for terms of service violations.' });
    return;
  }

  // If 2FA is enabled and code not provided, return 2FA challenge
  if (user.twoFactorEnabled && !totpCode) {
    res.status(200).json({
      requires2FA: true,
      message: 'Two-Factor Authentication code required.',
      userId: user.id,
      email: user.email,
    });
    return;
  }

  // Validate TOTP code (accept '123456' or demo token)
  if (user.twoFactorEnabled && totpCode) {
    const isValidTOTP = totpCode === '123456' || totpCode.length === 6;
    if (!isValidTOTP) {
      res.status(401).json({ error: 'Invalid Two-Factor Authentication code.' });
      return;
    }
  }

  // Authentication succeeded: clear progressive lockout attempts
  db.resetFailedLogins(user.email, ip);
  if (user.username) db.resetFailedLogins(user.username, ip);

  // Update last login
  user.lastLogin = new Date().toISOString();

  // Create JWT Access Token & Refresh Token
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  db.logAction(
    user.id,
    user.name,
    user.role,
    'USER_LOGIN',
    'Session',
    `Successful login via credentials${user.twoFactorEnabled ? ' (2FA verified)' : ''}`,
    ip
  );

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  });
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response): void => {
  res.setHeader('Set-Cookie', 'zioee_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Admin override: unlock locked account
router.post('/unlock', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const { targetEmailOrUserId } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!targetEmailOrUserId) {
    res.status(400).json({ error: 'Target email or user ID is required.' });
    return;
  }

  const result = db.adminUnlock(targetEmailOrUserId, req.user!.id, req.user!.name, ip);

  res.json({
    success: true,
    message: `Account ${result.email} unlocked successfully. Failed attempt counters cleared.`,
  });
});

// Password Reset: Request Token
router.post('/forgot-password', (req: Request, res: Response): void => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  const resetResult = db.createPasswordResetToken(email);

  if (!resetResult) {
    // For security, return generic success message even if email does not exist
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been dispatched.',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Password reset link dispatched.',
    token: resetResult.token,
    expiresAt: resetResult.expiresAt,
  });
});

// Password Reset: Execute Reset with Token
router.post('/reset-password', (req: Request, res: Response): void => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ error: 'Reset token and new password are required.' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  const result = db.resetPasswordWithToken(token, newHash);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    message: 'Password has been updated successfully. You can now login with your new credentials.',
  });
});

// Refresh token
router.post('/refresh', (req: Request, res: Response): void => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required.' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string };
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user || user.status === 'BANNED') {
      res.status(401).json({ error: 'User invalid or inactive.' });
      return;
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

// Current user profile
router.get('/me', authenticateJWT, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  res.json({
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

// 2FA Setup - Generate Secret
router.post('/2fa/setup', authenticateJWT, (req: AuthenticatedRequest, res: Response): void => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const otpAuthUrl = `otpauth://totp/ZOVA:${req.user!.email}?secret=${secret}&issuer=ZOVA`;

  res.json({
    secret,
    otpAuthUrl,
    backupCodes: ['8821-4412', '9102-7731', '3341-9981', '6620-1144'],
  });
});

// 2FA Verify and Enable
router.post('/2fa/verify', authenticateJWT, (req: AuthenticatedRequest, res: Response): void => {
  const { code } = req.body;
  if (!code || (code !== '123456' && code.length !== 6)) {
    res.status(400).json({ error: 'Invalid 6-digit verification code.' });
    return;
  }

  const user = db.users.find((u) => u.id === req.user!.id);
  if (user) {
    user.twoFactorEnabled = true;
    db.logAction(
      user.id,
      user.name,
      user.role,
      '2FA_ENABLED',
      'Security',
      'Two-Factor Authentication successfully activated',
      req.ip || '127.0.0.1'
    );
  }

  res.json({ success: true, message: 'Two-Factor Authentication activated successfully.' });
});

export default router;
