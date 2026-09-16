import { createHandler, getClientIp } from '../../_lib/handler.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../../_lib/database/store.js';
import { config } from '../../_lib/config.js';
import { otpService } from '../../_lib/services/otp.service.js';
import { normalizeIndianPhone } from '../../_lib/services/msg91/msg91.service.js';
import { User, UserRole } from '../../_lib/types.js';

export default createHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { destination, code, name, role = 'BUYER', password } = req.body || {};
  const ip = getClientIp(req);

  if (!destination || !name) {
    return res.status(400).json({ error: 'Destination and name are required.' });
  }

  // Check if code provided or previously verified
  if (code) {
    const verifyRes = await otpService.verifyOtp(destination, code, 'REGISTER');
    if (!verifyRes.success) {
      return res.status(400).json({ success: false, error: verifyRes.error || 'Verification failed.' });
    }
  } else {
    const record = otpService.getRecord(destination, 'REGISTER');
    if (!record || !record.verified) {
      return res.status(400).json({ error: 'Verification code must be verified before completing registration.' });
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
    return res.status(400).json({ error: 'An account with this mobile number or email already exists.' });
  }

  const email = isEmail
    ? destination.trim().toLowerCase()
    : `${cleanDigits}@mobile.ZOVA.internal`;
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

  return res.status(201).json({
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

