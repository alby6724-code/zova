export interface IEmailAdapter {
  sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class MockEmailAdapter implements IEmailAdapter {
  private sentEmails: Array<{ to: string; subject: string; body: string; timestamp: string }> = [];

  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string }> {
    const messageId = `mock-email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.sentEmails.push({ to, subject, body, timestamp: new Date().toISOString() });
    console.log(`\x1b[35m[Mock Email Provider] Sent to ${to}: "${subject}" (ID: ${messageId})\x1b[0m`);
    return { success: true, messageId };
  }

  getLastEmail(to?: string) {
    if (to) {
      return this.sentEmails.filter((m) => m.to === to).slice(-1)[0];
    }
    return this.sentEmails[this.sentEmails.length - 1];
  }

  getAllEmails() {
    return this.sentEmails;
  }
}

export class SendGridEmailAdapter implements IEmailAdapter {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey?: string, fromEmail?: string) {
    this.apiKey = apiKey || process.env.SENDGRID_API_KEY || '';
    this.fromEmail = fromEmail || process.env.SENDGRID_FROM_EMAIL || 'security@zova.com';
  }

  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      console.warn('[SendGrid Email] Missing API Key, falling back to simulated dispatch.');
      return { success: true, messageId: `sim-sendgrid-${Date.now()}` };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: this.fromEmail, name: 'ZOVA Security' },
          subject,
          content: [{ type: 'text/html', value: body }],
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, error: JSON.stringify(errJson) || `HTTP ${response.status}` };
      }

      return { success: true, messageId: response.headers.get('x-message-id') || `sg-${Date.now()}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

let activeEmailAdapter: IEmailAdapter = new MockEmailAdapter();

export function getEmailAdapter(): IEmailAdapter {
  const provider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase();
  if (provider === 'sendgrid') {
    if (!(activeEmailAdapter instanceof SendGridEmailAdapter)) {
      activeEmailAdapter = new SendGridEmailAdapter();
    }
  } else if (!(activeEmailAdapter instanceof MockEmailAdapter)) {
    activeEmailAdapter = new MockEmailAdapter();
  }
  return activeEmailAdapter;
}

export function setEmailAdapter(adapter: IEmailAdapter) {
  activeEmailAdapter = adapter;
}
