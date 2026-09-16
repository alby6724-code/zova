import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../../database/store.js';
import { config } from '../../config/index.js';
import { otpService } from '../../services/otp.service.js';
import { normalizeIndianPhone, maskPhoneNumber } from '../../services/msg91/msg91.service.js';
import { OtpPurpose, UserRole, User } from '../../types/index.js';

const router = Router();

// 1. Send OTP to phone (via MSG91) or email
router.post('/send', async (req: Request, res: Response): Promise<void> => {
  const { destination, purpose = 'LOGIN' } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!destination || typeof destination !== 'string') {
    res.status(400).json({ error: 'Destination (email or phone number) is required.' });
    return;
  }

  const validPurposes: OtpPurpose[] = ['LOGIN', 'REGISTER', 'VERIFY'];
  if (!validPurposes.includes(purpose)) {
    res.status(400).json({ error: 'Invalid OTP purpose. Must be LOGIN, REGISTER, or VERIFY.' });
    return;
  }

  const isEmail = destination.includes('@');
  const auditTarget = isEmail ? destination : maskPhoneNumber(destination);
  console.log(`[AUTH AUDIT] [POST /api/auth/otp/send] destination=${auditTarget} purpose=${purpose} ip=${ip}`);

  const result = await otpService.sendOtp(destination, purpose);
  if (!result.success) {
    console.warn(`[AUTH AUDIT] [POST /api/auth/otp/send FAILED] destination=${auditTarget} error=${result.error || result.message}`);
    if (result.error === 'RATE_LIMITED') {
      res.status(429).json(result);
      return;
    }
    if (result.dltMismatch) {
      res.status(502).json({
        success: false,
        error: 'DLT_TEMPLATE_MISMATCH',
        message: result.message,
      });
      return;
    }
    res.status(400).json(result);
    return;
  }

  console.log(`[AUTH AUDIT] [POST /api/auth/otp/send SUCCESS] destination=${auditTarget}`);
  res.json({
    success: true,
    expiresInSeconds: result.expiresInSeconds,
    message: result.message,
  });
});

// 2. Verify OTP & Authenticate Session (Login or Automatic New User Provisioning)
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { destination, code, purpose = 'LOGIN' } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!destination || !code) {
    res.status(400).json({ error: 'Destination and verification code are required.' });
    return;
  }

  const isEmail = destination.includes('@');
  const auditTarget = isEmail ? destination : maskPhoneNumber(destination);
  console.log(`[AUTH AUDIT] [POST /api/auth/otp/verify] destination=${auditTarget} purpose=${purpose} ip=${ip}`);

  const verifyRes = await otpService.verifyOtp(destination, code, purpose);
  if (!verifyRes.success) {
    console.warn(`[AUTH AUDIT] [POST /api/auth/otp/verify FAILED] destination=${auditTarget} error=${verifyRes.error || verifyRes.message}`);
    if (verifyRes.dltMismatch) {
      res.status(502).json({
        success: false,
        error: 'DLT_TEMPLATE_MISMATCH',
        message: verifyRes.error,
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: verifyRes.error || 'Verification failed.',
      attemptsRemaining: verifyRes.attemptsRemaining,
    });
    return;
  }

  // If purpose is explicit REGISTER verification only
  if (purpose === 'REGISTER' && req.body.verifyOnly === true) {
    res.json({
      success: true,
      verified: true,
      message: 'OTP successfully verified. You may proceed with registration.',
    });
    return;
  }

  // Unified Phone Authentication Flow:
  const phoneNorm = normalizeIndianPhone(destination);
  const normalizedPhone = phoneNorm.isValid ? phoneNorm.formatted : destination.trim();
  const cleanDigits = phoneNorm.isValid ? phoneNorm.nationalDigits : destination.replace(/\D/g, '');

  let user = db.users.find((u) => {
    if (isEmail) {
      return u.email.toLowerCase() === destination.trim().toLowerCase();
    }
    return (
      u.phone &&
      (u.phone === normalizedPhone || u.phone.replace(/\D/g, '').endsWith(cleanDigits))
    );
  });

  let isNewUser = false;
  if (!user) {
    // Automatically create verified account for new users
    const shortPhone = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : cleanDigits;
    const displayName = (req.body.name && req.body.name.trim()) || `ZOVA Member (${shortPhone})`;
    const email = isEmail
      ? destination.trim().toLowerCase()
      : `${cleanDigits}@mobile.zova.internal`;
    const phone = !isEmail ? normalizedPhone : undefined;
    const rawSeed = `phone-auth-${Date.now()}-${Math.random().toString(36)}`;
    const passwordHash = bcrypt.hashSync(rawSeed, 12);

    user = {
      id: `usr-${Date.now()}`,
      name: displayName,
      email,
      phone,
      passwordHash,
      role: 'BUYER',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      status: 'ACTIVE',
      twoFactorEnabled: false,
      listingsCount: 0,
      totalViews: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    db.users.push(user);
    isNewUser = true;
    db.logAction(
      user.id,
      user.name,
      user.role,
      'USER_REGISTER_OTP',
      'User',
      `Registered account with verified mobile ${normalizedPhone}`,
      ip
    );
  } else {
    if (user.status === 'BANNED') {
      res.status(403).json({ error: 'Account has been suspended or banned.' });
      return;
    }
  }

  // Clear failed attempt counters
  otpService.consumeOtp(destination, purpose);
  db.resetFailedLogins(user.email, ip);
  user.lastLogin = new Date().toISOString();

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
    'OTP_LOGIN',
    'Session',
    `Authenticated via MSG91 OTP for ${normalizedPhone}`,
    ip
  );

  res.json({
    success: true,
    verified: true,
    userExists: true,
    isNewUser,
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
      phone: user.phone,
    },
  });
});

// 3. Complete Registration with Verified OTP
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { destination, code, name, role = 'BUYER', password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!destination || !name) {
    res.status(400).json({ error: 'Destination and name are required.' });
    return;
  }

  // Check if code provided or previously verified
  if (code) {
    const verifyRes = await otpService.verifyOtp(destination, code, 'REGISTER');
    if (!verifyRes.success) {
      res.status(400).json({ success: false, error: verifyRes.error || 'Verification failed.' });
      return;
    }
  } else {
    const record = otpService.getRecord(destination, 'REGISTER');
    if (!record || !record.verified) {
      res.status(400).json({ error: 'Verification code must be verified before completing registration.' });
      return;
    }
  }

  const isEmail = destination.includes('@');
  const phoneNorm = normalizeIndianPhone(destination);
  const normalizedPhone = phoneNorm.isValid ? phoneNorm.formatted : destination.trim();
  const cleanDigits = phoneNorm.isValid ? phoneNorm.nationalDigits : destination.replace(/\D/g, '');

  const existing = db.users.find(
    (u) =>
      (isEmail && u.email.toLowerCase() === destination.trim().toLowerCase()) ||
      (!isEmail && u.phone && (u.phone === normalizedPhone || u.phone.replace(/\D/g, '').endsWith(cleanDigits)))
  );

  if (existing) {
    res.status(400).json({ error: 'An account with this mobile number or email already exists.' });
    return;
  }

  const email = isEmail
    ? destination.trim().toLowerCase()
    : `${cleanDigits}@mobile.zova.internal`;
  const phone = !isEmail ? normalizedPhone : undefined;
  const rawSeed = password || `generated-${Date.now()}-${Math.random().toString(36)}`;
  const passwordHash = bcrypt.hashSync(rawSeed, 12);
  const userRole: UserRole = role === 'SELLER' ? 'SELLER' : 'BUYER';

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email,
    phone,
    passwordHash,
    role: userRole,
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    status: 'ACTIVE',
    twoFactorEnabled: false,
    listingsCount: 0,
    totalViews: 0,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  db.users.push(newUser);
  otpService.consumeOtp(destination, 'REGISTER');

  const accessToken = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  const refreshToken = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  db.logAction(
    newUser.id,
    newUser.name,
    newUser.role,
    'USER_REGISTER_OTP',
    'User',
    `Registered account with verified credentials for ${destination}`,
    ip
  );

  res.status(201).json({
    success: true,
    message: 'Account registered successfully with verified credentials!',
    accessToken,
    refreshToken,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      status: newUser.status,
      phone: newUser.phone,
    },
  });
});

export default router;
