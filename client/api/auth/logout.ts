import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

export default createHandler(async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const clearCookie = [
    'zioee_token=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
    ...(isProd ? ['Secure'] : []),
  ].join('; ');

  res.setHeader('Set-Cookie', clearCookie);

  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});
