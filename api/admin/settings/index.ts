import { createHandler } from '../../_lib/handler.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import { db } from '../../_lib/database/store.js';

export default createHandler((req, res) => {
  // --- GET /api/admin/settings ---
  if (req.method === 'GET') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT']);
    if (!user) return;

    return res.json({ settings: db.getSettings() });
  }

  // --- PUT / PATCH /api/admin/settings ---
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const user = getAuthenticatedUser(req, res, ['SUPER_ADMIN', 'ADMIN']);
    if (!user) return;

    const { companyName, tagline, description, supportEmail, supportPhone, websiteName, footerCopyright, logoUrl } = req.body || {};

    if (companyName !== undefined && (typeof companyName !== 'string' || !companyName.trim())) {
      return res.status(400).json({ error: 'Company name cannot be empty.' });
    }

    const updated = db.updateSettings(
      {
        ...(companyName !== undefined ? { companyName: companyName.trim() } : {}),
        ...(tagline !== undefined ? { tagline: tagline.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(supportEmail !== undefined ? { supportEmail: supportEmail.trim() } : {}),
        ...(supportPhone !== undefined ? { supportPhone: supportPhone.trim() } : {}),
        ...(websiteName !== undefined ? { websiteName: websiteName.trim() } : {}),
        ...(footerCopyright !== undefined ? { footerCopyright: footerCopyright.trim() } : {}),
        ...(logoUrl !== undefined ? { logoUrl: logoUrl.trim() } : {}),
      },
      user.id,
      user.name
    );

    return res.json({ success: true, settings: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
