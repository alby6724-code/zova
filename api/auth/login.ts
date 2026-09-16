import { createHandler, getClientIp } from '../_lib/handler.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../_lib/database/store.js';
import { config } from '../_lib/config.js';

// In-memory IP rate limit map (anti-scanner, anti-bot)
const ipAttemptMap = new Map<string, { count: number; firstAt: number }>();
const IP_WINDOW_MS = 15 * 60 * 1000; // 15-minute rolling window
const IP_MAX_ATTEMPTS = 20;           // max 20 tries per IP per window

function checkIpRateLimit(ip: string): { blocked: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = ipAttemptMap.get(ip);
  if (!entry || now - entry.firstAt > IP_WINDOW_MS) {
    ipAttemptMap.set(ip, { count: 1, firstAt: now });
    return { blocked: false, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > IP_MAX_ATTEMPTS) {
    const remaining = Math.ceil((entry.firstAt + IP_WINDOW_MS - now) / 1000);
    return { blocked: true, retryAfterSeconds: Math.max(remaining, 60) };
  }
  return { blocked: false, retryAfterSeconds: 0 };
}

export default createHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);

  // --- Layer 1: IP-level rate limiting ---
  const ipCheck = checkIpRateLimit(ip);
  if (ipCheck.blocked) {
    return res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: `Too many login attempts. Try again in ${Math.ceil(ipCheck.retryAfterSeconds / 60)} minute(s).`,
      retryAfterSeconds: ipCheck.retryAfterSeconds,
      isLocked: true,
      locked: true,
      lockLevel: 2,
    });
  }

  const { email, username, identifier: bodyIdentifier, password, totpCode } = req.body || {};
  const identifier = (bodyIdentifier || username || email || '').toLowerCase().trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  // --- Layer 2: Account-level progressive lockout check ---
  const lockout = db.getLockoutStatus(identifier, ip);
  if (lockout.isLocked) {
    return res.status(429).json({
      error: 'ACCOUNT_LOCKED',
      isLocked: true,
      locked: true,
      message: lockout.reason,
      remainingSeconds: lockout.remainingSeconds,
      retryAfterSeconds: lockout.remainingSeconds,
      lockLevel: lockout.lockLevel,
    });
  }

  // --- Layer 3: Only SUPER_ADMIN or ADMIN can use this endpoint ---
  const matchingUsers = db.users.filter(
    (u) =>
      (u.email.toLowerCase() === identifier || (u.username && u.username.toLowerCase() === identifier)) &&
      ['SUPER_ADMIN', 'ADMIN'].includes(u.role)
  );

  const user = matchingUsers.find((u) => u.passwordHash && bcrypt.compareSync(password, u.passwordHash)) || matchingUsers[0];

  if (!user || !user.passwordHash) {
    const lockRes = db.recordFailedLogin(identifier, ip);
    const code = lockRes.isLocked ? 429 : 401;
    return res.status(code).json({
      error: lockRes.isLocked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      message: lockRes.isLocked
        ? (lockRes.lockLevel === 2 ? 'Account locked for 1 hour.' : 'Account locked for 10 seconds.')
        : 'Incorrect email/username or password.',
      isLocked: lockRes.isLocked,
      locked: lockRes.isLocked,
      remainingAttemptsBeforeLock: lockRes.remainingAttemptsBeforeLock,
      remainingAttempts: lockRes.remainingAttemptsBeforeLock,
      lockLevel: lockRes.lockLevel,
      remainingSeconds: lockRes.remainingSeconds,
      retryAfterSeconds: lockRes.remainingSeconds,
    });
  }

  // --- Layer 4: Timing-safe bcrypt password comparison ---
  const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordValid) {
    const lockRes = db.recordFailedLogin(identifier, ip);
    const code = lockRes.isLocked ? 429 : 401;
    return res.status(code).json({
      error: lockRes.isLocked ? 'ACCOUNT_LOCKED' : 'WRONG_PASSWORD',
      message: lockRes.isLocked
        ? (lockRes.lockLevel === 2 ? 'Account locked for 1 hour.' : 'Account locked for 10 seconds.')
        : 'Incorrect password. Please try again.',
      isLocked: lockRes.isLocked,
      locked: lockRes.isLocked,
      remainingAttemptsBeforeLock: lockRes.remainingAttemptsBeforeLock,
      remainingAttempts: lockRes.remainingAttemptsBeforeLock,
      lockLevel: lockRes.lockLevel,
      remainingSeconds: lockRes.remainingSeconds,
      retryAfterSeconds: lockRes.remainingSeconds,
    });
  }

  // --- Account status ---
  if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
    return res.status(403).json({
      error: 'ACCOUNT_RESTRICTED',
      message: `This admin account is ${user.status.toLowerCase()}. Contact the platform owner.`,
    });
  }

  // --- 2FA challenge ---
  if (user.twoFactorEnabled && !totpCode) {
    return res.status(200).json({
      requires2FA: true,
      message: 'Two-Factor Authentication code required.',
      userId: user.id,
      email: user.email,
    });
  }
  if (user.twoFactorEnabled && totpCode) {
    if (!/^\d{6}$/.test(totpCode)) {
      return res.status(401).json({ error: 'Invalid 2FA code. Must be exactly 6 digits.' });
    }
  }

  // --- SUCCESS: clear counters, update session ---
  db.resetFailedLogins(user.email, ip);
  if (user.username) db.resetFailedLogins(user.username, ip);
  ipAttemptMap.delete(ip);
  user.lastLogin = new Date().toISOString();

  // --- Issue JWT tokens ---
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

  db.logAction(user.id, user.name, user.role, 'ADMIN_LOGIN', 'Session',
    `Successful admin login from IP ${ip}${user.twoFactorEnabled ? ' (2FA)' : ''}`, ip);

  // --- Secure HttpOnly cookie (SameSite=Strict prevents CSRF) ---
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const cookieFlags = [
    `zioee_token=${accessToken}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${60 * 60}`,
    ...(isProd ? ['Secure'] : []),
  ].join('; ');
  res.setHeader('Set-Cookie', cookieFlags);

  // --- Anti-hacker security headers ---
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  return res.json({
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