import { createHandler, getClientIp } from '../../_lib/handler.js';
import { otpService } from '../../_lib/services/otp.service.js';
import { maskPhoneNumber } from '../../_lib/services/msg91/msg91.service.js';
import { OtpPurpose } from '../../_lib/types.js';

export default createHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { destination, purpose = 'LOGIN' } = req.body || {};
  const ip = getClientIp(req);

  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({ error: 'Destination (email or phone number) is required.' });
  }

  const validPurposes: OtpPurpose[] = ['LOGIN', 'REGISTER', 'VERIFY'];
  if (!validPurposes.includes(purpose)) {
    return res.status(400).json({ error: 'Invalid OTP purpose. Must be LOGIN, REGISTER, or VERIFY.' });
  }

  const isEmail = destination.includes('@');
  const auditTarget = isEmail ? destination : maskPhoneNumber(destination);
  console.log(`[AUTH AUDIT] [POST /api/auth/otp/send] destination=${auditTarget} purpose=${purpose} ip=${ip}`);

  const result = await otpService.sendOtp(destination, purpose);
  if (!result.success) {
    console.warn(`[AUTH AUDIT] [POST /api/auth/otp/send FAILED] destination=${auditTarget} error=${result.error || result.message}`);
    if (result.error === 'RATE_LIMITED') {
      return res.status(429).json(result);
    }
    if (result.dltMismatch) {
      return res.status(502).json({
        success: false,
        error: 'DLT_TEMPLATE_MISMATCH',
        message: result.message,
      });
    }
    return res.status(400).json(result);
  }

  console.log(`[AUTH AUDIT] [POST /api/auth/otp/send SUCCESS] destination=${auditTarget}`);
  return res.json({
    success: true,
    expiresInSeconds: result.expiresInSeconds,
    message: result.message,
  });
});
