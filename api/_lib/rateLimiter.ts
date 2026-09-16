interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

export const checkRateLimit = (
  ip: string,
  maxRequests = 1000,
  windowMs = 60 * 1000
): { allowed: boolean; limit: number; remaining: number; retryAfterSeconds?: number } => {
  const now = Date.now();
  const record = ipBuckets.get(ip);

  if (!record || now > record.resetTime) {
    ipBuckets.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, limit: maxRequests, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count += 1;
  return { allowed: true, limit: maxRequests, remaining: maxRequests - record.count };
};
