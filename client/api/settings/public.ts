import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

// Public endpoint: returns safe public company branding settings
// Accessible by anyone (public storefront, login modals, footer, etc.)
export default createHandler((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const settings = db.getSettings();

  return res.json({
    settings,
  });
});
