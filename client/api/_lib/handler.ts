export function applyCors(req: any, res: any): boolean {
  const origin = req.headers?.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Handled preflight
  }
  return false;
}

export function parseCookies(req: any): Record<string, string> {
  if (req.cookies && typeof req.cookies === 'object') {
    return req.cookies;
  }
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    req.cookies = {};
    return req.cookies;
  }
  const parsed: Record<string, string> = {};
  cookieHeader.split(';').forEach((part: string) => {
    const [key, ...val] = part.trim().split('=');
    if (key) {
      try {
        parsed[key] = decodeURIComponent(val.join('='));
      } catch {
        parsed[key] = val.join('=');
      }
    }
  });
  req.cookies = parsed;
  return req.cookies;
}

export function parseBody(req: any): any {
  parseCookies(req);
  if (req.body) {
    if (typeof req.body === 'string' && req.body.trim().length > 0) {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // Leave as string if parsing fails
      }
    }
  } else {
    req.body = {};
  }
  return req.body;
}

export function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

export function getIdParam(req: any): string {
  if (req.query?.id) {
    return Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  }
  if (req.params?.id) {
    return req.params.id;
  }
  return '';
}

export type ServerlessHandler = (req: any, res: any) => Promise<any> | any;

export function createHandler(fn: ServerlessHandler): ServerlessHandler {
  return async (req: any, res: any) => {
    // Security headers on every API response
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    if (applyCors(req, res)) {
      return;
    }
    parseBody(req);
    try {
      return await fn(req, res);
    } catch (err: any) {
      console.error('[API ERROR]:', err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: err?.message || 'An unexpected error occurred.',
      });
    }
  };
}
