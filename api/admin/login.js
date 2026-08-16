import { adminCookie, createAdminToken, safeEqual } from '../../lib/admin-session.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const configuredEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!configuredEmail || !configuredPassword || !secret) {
    return res.status(503).json({ error: 'Admin authentication is not configured.' });
  }

  const email = String(req.body?.email || '').toLowerCase();
  const password = String(req.body?.password || '');
  if (!safeEqual(email, configuredEmail) || !safeEqual(password, configuredPassword)) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  res.setHeader('Set-Cookie', adminCookie(createAdminToken(configuredEmail, secret)));
  return res.status(200).json({ ok: true, redirectTo: '/admin/dashboard', roles: ['ADMIN'] });
}
