import crypto from 'crypto';
import { OtpRecord, OtpPurpose, OtpType } from '../types/index.js';
import { getEmailAdapter } from './email/email.adapter.js';
import { msg91Service, normalizeIndianPhone } from './msg91/msg91.service.js';

class OtpService {
  // In-memory store for email OTPs only (MSG91 manages SMS OTP state securely)
  private emailOtps: Map<string, OtpRecord> = new Map();

  private normalizeDestination(dest: string): string {
    return dest.trim().toLowerCase();
  }

  detectType(dest: string): OtpType {
    return dest.includes('@') ? 'EMAIL' : 'SMS';
  }

  async sendOtp(
    destination: string,
    purpose: OtpPurpose = 'LOGIN',
    explicitType?: OtpType
  ): Promise<{
    success: boolean;
    expiresInSeconds: number;
    message: string;
    error?: string;
    dltMismatch?: boolean;
  }> {
    const type = explicitType || this.detectType(destination);

    // 1. Production MSG91 SMS flow for mobile phones
    if (type === 'SMS') {
      const phoneNorm = normalizeIndianPhone(destination);
      if (!phoneNorm.isValid) {
        return {
          success: false,
          expiresInSeconds: 0,
          message: 'Please enter a valid 10-digit Indian mobile number.',
          error: 'INVALID_PHONE',
        };
      }

      const res = await msg91Service.sendOtp(phoneNorm.formatted);
      return {
        success: res.success,
        expiresInSeconds: res.expiresInSeconds,
        message: res.message,
        error: res.error,
        dltMismatch: res.dltMismatch,
      };
    }

    // 2. Email OTP flow (e.g. for administrative or email verification)
    const normDest = this.normalizeDestination(destination);
    const key = `${normDest}:${purpose}`;
    const now = Date.now();

    const existing = this.emailOtps.get(key);
    if (existing) {
      const createdTime = new Date(existing.createdAt).getTime();
      const elapsedSec = Math.floor((now - createdTime) / 1000);
      if (elapsedSec < 30 && !existing.verified) {
        return {
          success: false,
          expiresInSeconds: 30 - elapsedSec,
          message: `Please wait ${30 - elapsedSec} seconds before requesting a new OTP.`,
          error: 'RATE_LIMITED',
        };
      }
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const ttlMs = 5 * 60 * 1000;
    const expiresAt = new Date(now + ttlMs).toISOString();

    const record: OtpRecord = {
      id: `otp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      destination: normDest,
      code,
      type: 'EMAIL',
      purpose,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: new Date(now).toISOString(),
    };

    this.emailOtps.set(key, record);

    const emailRes = await getEmailAdapter().sendEmail(
      normDest,
      'ZOVA — Your Verification Code',
      `<div style="font-family:sans-serif;padding:20px;max-width:500px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0284c7;margin-top:0;">ZOVA Security</h2>
        <p>Your one-time verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0f172a;background:#f8fafc;padding:12px 20px;border-radius:8px;text-align:center;margin:16px 0;">
          ${code}
        </div>
        <p style="color:#64748b;font-size:12px;">This code will expire in 5 minutes. Do not share it with anyone.</p>
      </div>`
    );

    return {
      success: emailRes.success,
      expiresInSeconds: 300,
      message: `OTP sent successfully to email ${normDest}`,
    };
  }

  async verifyOtp(
    destination: string,
    code: string,
    purpose: OtpPurpose = 'LOGIN'
  ): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    attemptsRemaining?: number;
    dltMismatch?: boolean;
    record?: OtpRecord;
  }> {
    const type = this.detectType(destination);

    // 1. Phone number: Verify through MSG91
    if (type === 'SMS') {
      const phoneNorm = normalizeIndianPhone(destination);
      if (!phoneNorm.isValid) {
        return { success: false, error: 'Invalid mobile number format.' };
      }

      const res = await msg91Service.verifyOtp(phoneNorm.formatted, code);
      if (res.success) {
        return {
          success: true,
          message: res.message,
          record: {
            id: `msg91-${Date.now()}`,
            destination: phoneNorm.formatted,
            code: '', // zero plaintext storage
            type: 'SMS',
            purpose,
            expiresAt: new Date(Date.now() + 300000).toISOString(),
            attempts: 0,
            verified: true,
            createdAt: new Date().toISOString(),
          },
        };
      }

      return {
        success: false,
        error: res.message || res.error || 'Verification failed.',
        attemptsRemaining: res.attemptsRemaining,
        dltMismatch: res.dltMismatch,
      };
    }

    // 2. Email verification
    const normDest = this.normalizeDestination(destination);
    const key = `${normDest}:${purpose}`;
    const record = this.emailOtps.get(key);

    if (!record) {
      return { success: false, error: 'No active OTP found. Please request a new code.' };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      this.emailOtps.delete(key);
      return { success: false, error: 'OTP has expired. Please request a new code.' };
    }

    if (record.attempts >= 3) {
      this.emailOtps.delete(key);
      return {
        success: false,
        error: 'Too many incorrect attempts. Please request a fresh OTP.',
      };
    }

    if (record.code !== code.trim()) {
      record.attempts += 1;
      const remaining = 3 - record.attempts;
      return {
        success: false,
        error: `Invalid verification code. ${remaining} attempt(s) remaining.`,
        attemptsRemaining: remaining,
      };
    }

    record.verified = true;
    return { success: true, record };
  }

  consumeOtp(destination: string, purpose: OtpPurpose) {
    const normDest = this.normalizeDestination(destination);
    const key = `${normDest}:${purpose}`;
    this.emailOtps.delete(key);
  }

  getRecord(destination: string, purpose: OtpPurpose): OtpRecord | undefined {
    return this.emailOtps.get(`${this.normalizeDestination(destination)}:${purpose}`);
  }
}

export const otpService = new OtpService();
