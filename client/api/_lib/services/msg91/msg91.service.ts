/**
 * MSG91 Production OTP & Widget Service
 * Handles Indian phone validation, MSG91 Widget & v5 API dispatch,
 * verification, rate limiting, and DLT template mismatch detection.
 */

export interface PhoneNormalizationResult {
  formatted: string;      // +91XXXXXXXXXX (canonical format for DB and session)
  nationalDigits: string; // XXXXXXXXXX (10 digits)
  msg91Mobile: string;    // 91XXXXXXXXXX (country-prefixed for MSG91 API)
  isValid: boolean;
}

export function normalizeIndianPhone(input: string): PhoneNormalizationResult {
  if (!input || typeof input !== 'string') {
    return { formatted: '', nationalDigits: '', msg91Mobile: '', isValid: false };
  }

  const rawDigits = input.replace(/\D/g, '');
  let nationalDigits = '';

  if (rawDigits.length === 10) {
    nationalDigits = rawDigits;
  } else if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
    nationalDigits = rawDigits.slice(2);
  } else if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
    nationalDigits = rawDigits.slice(1);
  }

  // Valid Indian mobile numbers are exactly 10 digits starting with 6, 7, 8, or 9
  const isValid = /^[6-9]\d{9}$/.test(nationalDigits);

  return {
    formatted: `+91${nationalDigits}`,
    nationalDigits,
    msg91Mobile: `91${nationalDigits}`,
    isValid,
  };
}

/**
 * Masks a phone number for secure audit logging (never logs full digits)
 * e.g. "+91 98*** **321"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '+91 ***';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    const first2 = clean.slice(-10, -8);
    const last3 = clean.slice(-3);
    return `+91 ${first2}*** **${last3}`;
  }
  return '+91 ***';
}

interface RateLimitTracker {
  lastSentAt: number;
  requestTimestampsInHour: number[];
  verifyAttempts: number;
  lastAttemptAt: number;
}

export interface Msg91SendOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  error?: string;
  dltMismatch?: boolean;
}

export interface Msg91VerifyOtpResponse {
  success: boolean;
  message: string;
  error?: string;
  dltMismatch?: boolean;
  attemptsRemaining?: number;
  expired?: boolean;
  maxAttemptsExceeded?: boolean;
}

export class Msg91Service {
  private trackerMap: Map<string, RateLimitTracker> = new Map();

  private getAuthKey(): string {
    return process.env.MSG91_AUTH_KEY?.trim() || '';
  }

  private getWidgetId(): string {
    return process.env.MSG91_OTP_WIDGET_ID?.trim() || '';
  }

  private getWidgetToken(): string {
    return process.env.MSG91_OTP_WIDGET_TOKEN?.trim() || '';
  }

  private getTemplateId(): string {
    return process.env.MSG91_TEMPLATE_ID?.trim() || '';
  }

  public isRealValue(val: string): boolean {
    return Boolean(
      val &&
      !val.includes('placeholder') &&
      !val.includes('your_') &&
      !val.includes('here') &&
      val.trim().length > 0
    );
  }

  public isConfigured(): boolean {
    const authKey = this.getAuthKey();
    const widgetToken = this.getWidgetToken();
    return this.isRealValue(authKey) || this.isRealValue(widgetToken);
  }

  private isDltOrTemplateError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('dlt') ||
      lower.includes('template') ||
      lower.includes('te id') ||
      lower.includes('sender') ||
      lower.includes('header') ||
      lower.includes('pe id')
    );
  }

  private checkRateLimits(phoneFormatted: string): { allowed: boolean; waitSeconds?: number; error?: string } {
    const now = Date.now();
    let tracker = this.trackerMap.get(phoneFormatted);
    if (!tracker) {
      tracker = {
        lastSentAt: 0,
        requestTimestampsInHour: [],
        verifyAttempts: 0,
        lastAttemptAt: 0,
      };
      this.trackerMap.set(phoneFormatted, tracker);
    }

    // 1. Resend cooldown: minimum 30 seconds
    const elapsedSeconds = Math.floor((now - tracker.lastSentAt) / 1000);
    if (elapsedSeconds < 30) {
      const wait = 30 - elapsedSeconds;
      return {
        allowed: false,
        waitSeconds: wait,
        error: `Please wait ${wait} seconds before requesting a new OTP.`,
      };
    }

    // 2. Sliding 1-hour quota: max 5 requests per hour to prevent spam/abuse
    tracker.requestTimestampsInHour = tracker.requestTimestampsInHour.filter((t) => now - t < 3600000);
    if (tracker.requestTimestampsInHour.length >= 5) {
      return {
        allowed: false,
        error: 'Too many OTP requests for this mobile number. Please try again in an hour.',
      };
    }

    return { allowed: true };
  }

  private recordOtpSent(phoneFormatted: string) {
    const now = Date.now();
    let tracker = this.trackerMap.get(phoneFormatted);
    if (!tracker) {
      tracker = {
        lastSentAt: now,
        requestTimestampsInHour: [now],
        verifyAttempts: 0,
        lastAttemptAt: 0,
      };
      this.trackerMap.set(phoneFormatted, tracker);
    } else {
      tracker.lastSentAt = now;
      tracker.requestTimestampsInHour.push(now);
      tracker.verifyAttempts = 0; // reset verification attempts on new OTP dispatch
    }
  }

  /**
   * Dispatches OTP using MSG91 Widget or OTP API
   */
  async sendOtp(phoneInput: string): Promise<Msg91SendOtpResponse> {
    const phoneNorm = normalizeIndianPhone(phoneInput);
    if (!phoneNorm.isValid) {
      return {
        success: false,
        message: 'Invalid mobile number. Please enter a valid 10-digit Indian mobile number.',
        expiresInSeconds: 0,
        error: 'INVALID_PHONE',
      };
    }

    // Enforce rate limiting & cooldown
    const rateCheck = this.checkRateLimits(phoneNorm.formatted);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: rateCheck.error || 'Rate limit exceeded.',
        expiresInSeconds: rateCheck.waitSeconds || 30,
        error: 'RATE_LIMITED',
      };
    }

    const authKey = this.getAuthKey();
    const widgetId = this.getWidgetId();
    const widgetToken = this.getWidgetToken();
    const templateId = this.getTemplateId();

    const hasAuthKey = this.isRealValue(authKey);
    const hasWidgetToken = this.isRealValue(widgetToken);
    const hasWidgetId = this.isRealValue(widgetId);
    const activeKey = hasAuthKey ? authKey : widgetToken;

    if (!hasAuthKey && !hasWidgetToken) {
      console.warn('[MSG91 Warning] MSG91_AUTH_KEY or MSG91_OTP_WIDGET_TOKEN not set in environment.');
      return {
        success: false,
        message: 'MSG91 is not configured. Please set MSG91_AUTH_KEY in your server environment.',
        expiresInSeconds: 0,
        error: 'MSG91_NOT_CONFIGURED',
      };
    }

    try {
      let response: Response;
      let rawData: any = {};

      // Prefer MSG91 OTP Widget Endpoint ONLY IF a valid, non-placeholder widgetId is configured
      if (hasWidgetId) {
        const widgetUrl = 'https://control.msg91.com/api/v5/widget/sendOtp';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (hasAuthKey) {
          headers['authkey'] = authKey;
        }

        const bodyPayload = {
          widgetId,
          tokenAuth: hasWidgetToken ? widgetToken : authKey,
          identifier: phoneNorm.msg91Mobile,
        };

        response = await fetch(widgetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });

        rawData = await response.json().catch(() => ({}));
      } else {
        // Fallback to standard MSG91 v5 OTP API
        const otpApiUrl = 'https://control.msg91.com/api/v5/otp';
        const queryParams = new URLSearchParams({
          mobile: phoneNorm.msg91Mobile,
          otp_length: '6',
          otp_expiry: '5',
          authkey: activeKey,
        });

        // Resolve DLT_TEMPLATE_MISMATCH: Only include template_id if it is a genuine, non-placeholder flow ID
        // (If omitted or invalid like 'zioee', MSG91 automatically falls back to the default account OTP template)
        const isRealTemplate =
          this.isRealValue(templateId) &&
          templateId.toLowerCase() !== 'zioee' &&
          templateId.length >= 6;

        if (isRealTemplate) {
          queryParams.set('template_id', templateId);
        }

        console.log(
          `[MSG91 AUDIT] [OTP_SEND_ATTEMPT] mobile=${maskPhoneNumber(phoneNorm.formatted)} usingTemplate=${isRealTemplate ? templateId : 'DEFAULT'} timestamp=${new Date().toISOString()}`
        );

        response = await fetch(`${otpApiUrl}?${queryParams.toString()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: activeKey,
          },
        });

        rawData = await response.json().catch(() => ({}));
      }

      // Check MSG91 Response
      const isError =
        !response.ok ||
        rawData.type === 'error' ||
        rawData.status === 'error' ||
        Boolean(rawData.code && rawData.code !== '200' && rawData.code !== 200);

      const isSuccess =
        !isError &&
        (rawData.type === 'success' ||
          rawData.status === 'success' ||
          (typeof rawData.message === 'string' && rawData.message.toLowerCase().includes('success')));

      const errMsg = rawData.message || rawData.error || `MSG91 HTTP ${response.status}`;

      console.log(
        `[MSG91 AUDIT] [OTP_SEND_RESULT] mobile=${maskPhoneNumber(phoneNorm.formatted)} success=${isSuccess} status=${rawData.type || rawData.status || response.status} error=${isSuccess ? 'none' : errMsg} timestamp=${new Date().toISOString()}`
      );

      if (isSuccess) {
        this.recordOtpSent(phoneNorm.formatted);
        return {
          success: true,
          message: `OTP sent successfully to ${phoneNorm.formatted}`,
          expiresInSeconds: 300,
        };
      }

      console.error('[MSG91 Gateway Error]', errMsg);

      if (this.isDltOrTemplateError(errMsg)) {
        return {
          success: false,
          message: `MSG91 DLT/Template Configuration Mismatch: ${errMsg}. Please verify your approved DLT Template ID and Sender ID in the MSG91 dashboard.`,
          expiresInSeconds: 0,
          error: 'DLT_TEMPLATE_MISMATCH',
          dltMismatch: true,
        };
      }

      return {
        success: false,
        message: errMsg,
        expiresInSeconds: 0,
        error: rawData.type || 'MSG91_ERROR',
      };
    } catch (err: any) {
      console.error('[MSG91 Error] Network or API exception during sendOtp:', err.message);
      return {
        success: false,
        message: 'Failed to communicate with MSG91 gateway. Please check your internet connection or try again shortly.',
        expiresInSeconds: 0,
        error: err.message,
      };
    }
  }

  /**
   * Resends OTP with MSG91 retry endpoint
   */
  async resendOtp(phoneInput: string): Promise<Msg91SendOtpResponse> {
    const phoneNorm = normalizeIndianPhone(phoneInput);
    if (!phoneNorm.isValid) {
      return {
        success: false,
        message: 'Invalid mobile number. Please enter a valid 10-digit Indian mobile number.',
        expiresInSeconds: 0,
        error: 'INVALID_PHONE',
      };
    }

    const rateCheck = this.checkRateLimits(phoneNorm.formatted);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: rateCheck.error || 'Rate limit exceeded.',
        expiresInSeconds: rateCheck.waitSeconds || 30,
        error: 'RATE_LIMITED',
      };
    }

    const authKey = this.getAuthKey();
    const widgetId = this.getWidgetId();
    const widgetToken = this.getWidgetToken();

    const hasAuthKey = this.isRealValue(authKey);
    const hasWidgetToken = this.isRealValue(widgetToken);
    const hasWidgetId = this.isRealValue(widgetId);
    const activeKey = hasAuthKey ? authKey : widgetToken;

    try {
      let response: Response;
      let rawData: any = {};

      if (hasWidgetId) {
        const retryUrl = 'https://control.msg91.com/api/v5/widget/retryOtp';
        response = await fetch(retryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(hasAuthKey ? { authkey: authKey } : {}),
          },
          body: JSON.stringify({
            widgetId,
            tokenAuth: hasWidgetToken ? widgetToken : authKey,
            identifier: phoneNorm.msg91Mobile,
            retryType: 1, // 1 for SMS, 2 for Voice
          }),
        });
        rawData = await response.json().catch(() => ({}));
      } else {
        const retryUrl = `https://control.msg91.com/api/v5/otp/retry?authkey=${encodeURIComponent(activeKey)}&mobile=${encodeURIComponent(phoneNorm.msg91Mobile)}&retrytype=text`;
        response = await fetch(retryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: activeKey,
          },
        });
        rawData = await response.json().catch(() => ({}));
      }

      const isError =
        !response.ok ||
        rawData.type === 'error' ||
        rawData.status === 'error' ||
        Boolean(rawData.code && rawData.code !== '200' && rawData.code !== 200);

      const isSuccess =
        !isError &&
        (rawData.type === 'success' ||
          rawData.status === 'success' ||
          (typeof rawData.message === 'string' && rawData.message.toLowerCase().includes('success')));

      if (isSuccess) {
        this.recordOtpSent(phoneNorm.formatted);
        return {
          success: true,
          message: 'OTP resent successfully.',
          expiresInSeconds: 300,
        };
      }

      // If retry fails, try a regular sendOtp
      return this.sendOtp(phoneInput);
    } catch (err: any) {
      return this.sendOtp(phoneInput);
    }
  }

  /**
   * Verifies the 6-digit OTP code through MSG91
   */
  async verifyOtp(phoneInput: string, otpCode: string): Promise<Msg91VerifyOtpResponse> {
    const phoneNorm = normalizeIndianPhone(phoneInput);
    if (!phoneNorm.isValid) {
      return {
        success: false,
        message: 'Invalid mobile number format.',
        error: 'INVALID_PHONE',
      };
    }

    const cleanCode = (otpCode || '').trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit numeric OTP code.',
        error: 'INVALID_OTP_FORMAT',
      };
    }

    // Verify attempt tracking
    let tracker = this.trackerMap.get(phoneNorm.formatted);
    if (!tracker) {
      tracker = {
        lastSentAt: 0,
        requestTimestampsInHour: [],
        verifyAttempts: 0,
        lastAttemptAt: Date.now(),
      };
      this.trackerMap.set(phoneNorm.formatted, tracker);
    }

    if (tracker.verifyAttempts >= 3) {
      return {
        success: false,
        message: 'Too many incorrect attempts. For security, this OTP session is locked. Please request a fresh OTP.',
        error: 'MAX_ATTEMPTS_EXCEEDED',
        maxAttemptsExceeded: true,
        attemptsRemaining: 0,
      };
    }

    const authKey = this.getAuthKey();
    const widgetId = this.getWidgetId();
    const widgetToken = this.getWidgetToken();

    const hasAuthKey = this.isRealValue(authKey);
    const hasWidgetToken = this.isRealValue(widgetToken);
    const hasWidgetId = this.isRealValue(widgetId);
    const activeKey = hasAuthKey ? authKey : widgetToken;

    if (!hasAuthKey && !hasWidgetToken) {
      return {
        success: false,
        message: 'MSG91 credentials missing in server environment.',
        error: 'MSG91_NOT_CONFIGURED',
      };
    }

    try {
      let response: Response;
      let rawData: any = {};

      console.log(
        `[MSG91 AUDIT] [OTP_VERIFY_ATTEMPT] mobile=${maskPhoneNumber(phoneNorm.formatted)} attempt=${tracker.verifyAttempts + 1} timestamp=${new Date().toISOString()}`
      );

      if (hasWidgetId) {
        const verifyUrl = 'https://control.msg91.com/api/v5/widget/verifyOtp';
        response = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(hasAuthKey ? { authkey: authKey } : {}),
          },
          body: JSON.stringify({
            widgetId,
            tokenAuth: hasWidgetToken ? widgetToken : authKey,
            identifier: phoneNorm.msg91Mobile,
            otp: cleanCode,
          }),
        });
        rawData = await response.json().catch(() => ({}));
      } else {
        // Standard MSG91 v5 OTP verify API: GET request with header authkey
        const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(cleanCode)}&mobile=${encodeURIComponent(phoneNorm.msg91Mobile)}`;
        response = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            authkey: activeKey,
          },
        });
        rawData = await response.json().catch(() => ({}));
      }

      const msg = typeof rawData.message === 'string' ? rawData.message : '';
      const lowerMsg = msg.toLowerCase();

      const isError =
        !response.ok ||
        rawData.type === 'error' ||
        rawData.status === 'error' ||
        Boolean(rawData.code && rawData.code !== '200' && rawData.code !== 200);

      const isSuccess =
        !isError &&
        (rawData.type === 'success' ||
          rawData.status === 'success' ||
          lowerMsg.includes('otp verified') ||
          lowerMsg.includes('already verified'));

      console.log(
        `[MSG91 AUDIT] [OTP_VERIFY_RESULT] mobile=${maskPhoneNumber(phoneNorm.formatted)} success=${isSuccess} error=${isSuccess ? 'none' : msg || rawData.type || 'invalid'} timestamp=${new Date().toISOString()}`
      );

      if (isSuccess) {
        // Reset verify attempts on success
        tracker.verifyAttempts = 0;
        return {
          success: true,
          message: 'OTP verified successfully.',
        };
      }

      // Verification failure
      tracker.verifyAttempts += 1;
      const attemptsRemaining = Math.max(0, 3 - tracker.verifyAttempts);

      if (lowerMsg.includes('expired')) {
        return {
          success: false,
          message: 'The OTP code has expired. Please request a new OTP.',
          error: 'OTP_EXPIRED',
          expired: true,
          attemptsRemaining,
        };
      }

      if (this.isDltOrTemplateError(msg)) {
        return {
          success: false,
          message: `MSG91 DLT/Template configuration issue: ${msg}`,
          error: 'DLT_TEMPLATE_MISMATCH',
          dltMismatch: true,
        };
      }

      return {
        success: false,
        message: `Invalid verification code. ${attemptsRemaining} attempt(s) remaining.`,
        error: 'INVALID_OTP',
        attemptsRemaining,
        maxAttemptsExceeded: attemptsRemaining === 0,
      };
    } catch (err: any) {
      console.error('[MSG91 Error] Exception during verifyOtp:', err.message);
      return {
        success: false,
        message: 'Failed to verify OTP with MSG91. Please try again.',
        error: err.message,
      };
    }
  }
}

export const msg91Service = new Msg91Service();
