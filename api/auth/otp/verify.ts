import { createHandler, getClientIp } from '../../_lib/handler.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../../_lib/database/store.js';
import { config } from '../../_lib/config.js';
import { otpService } from '../../_lib/services/otp.service.js';
import { normalizeIndianPhone, maskPhoneNumber } from '../../_lib/services/msg91/msg91.service.js';
import { User } from '../../_lib/types.js';

export default createHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { destination, code, purpose = 'LOGIN' } = req.body || {};
  const ip = getClientIp(req);

  if (!destination || !code) {
    return res.status(400).json({ error: 'Destination and verification code are required.' });
  }

  const isEmail = destination.includes('@');
  const auditTarget = isEmail ? destination : maskPhoneNumber(destination);
  console.log(`[AUTH AUDIT] [POST /api/auth/otp/verify] destination=${auditTarget} purpose=${purpose} ip=${ip}`);

  const verifyRes = await otpService.verifyOtp(destination, code, purpose);
  if (!verifyRes.success) {
    console.warn(`[AUTH AUDIT] [POST /api/auth/otp/verify FAILED] destination=${auditTarget} error=${verifyRes.error || verifyRes.message}`);
    if (verifyRes.dltMismatch) {
      return res.status(502).json({
        success: false,
        error: 'DLT_TEMPLATE_MISMATCH',
        message: verifyRes.error,
      });
    }
    return res.status(400).json({
      success: false,
      error: verifyRes.error || 'Verification failed.',
      attemptsRemaining: verifyRes.attemptsRemaining,
    });
  }

  // If purpose is explicit REGISTER verification only
  if (purpose === 'REGISTER' && req.body.verifyOnly === true) {
    return res.json({
      success: true,
      verified: true,
      message: 'OTP successfully verified. You may proceed with registration.',
    });
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
      : `${cleanDigits}@mobile.ZOVA.internal`;
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
      return res.status(403).json({ error: 'Account has been suspended or banned.' });
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

  return res.json({
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

