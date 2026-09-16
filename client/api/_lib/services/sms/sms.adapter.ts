export interface ISmsAdapter {
  sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class MockSmsAdapter implements ISmsAdapter {
  private sentMessages: Array<{ to: string; message: string; timestamp: string }> = [];

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    const messageId = `mock-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.sentMessages.push({ to, message, timestamp: new Date().toISOString() });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\x1b[36m[Dev SMS Provider] Verification SMS to ${to}: "${message}"\x1b[0m`);
    }
    return { success: true, messageId };
  }

  getLastSms(to?: string) {
    if (to) {
      return this.sentMessages.filter((m) => m.to === to).slice(-1)[0];
    }
    return this.sentMessages[this.sentMessages.length - 1];
  }

  getAllSms() {
    return this.sentMessages;
  }
}

export class TwilioSmsAdapter implements ISmsAdapter {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid?: string, authToken?: string, fromNumber?: string) {
    this.accountSid = accountSid || process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = authToken || process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = fromNumber || process.env.TWILIO_PHONE_NUMBER || '';
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('[Twilio SMS] Missing credentials, falling back to simulated dispatch.');
      return { success: true, messageId: `sim-twilio-${Date.now()}` };
    }

    try {
      // Direct Twilio REST API invocation via HTTP without external sdk bloat
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const body = new URLSearchParams();
      body.append('To', to);
      body.append('From', this.fromNumber);
      body.append('Body', message);

      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errJson: any = await response.json().catch(() => ({}));
        return { success: false, error: errJson.message || `Twilio HTTP ${response.status}` };
      }

      const resJson: any = await response.json();
      return { success: true, messageId: resJson.sid };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

let activeSmsAdapter: ISmsAdapter = new MockSmsAdapter();

export function getSmsAdapter(): ISmsAdapter {
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
  if (provider === 'twilio') {
    if (!(activeSmsAdapter instanceof TwilioSmsAdapter)) {
      activeSmsAdapter = new TwilioSmsAdapter();
    }
  } else if (!(activeSmsAdapter instanceof MockSmsAdapter)) {
    activeSmsAdapter = new MockSmsAdapter();
  }
  return activeSmsAdapter;
}

export function setSmsAdapter(adapter: ISmsAdapter) {
  activeSmsAdapter = adapter;
}
