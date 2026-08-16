import { adminCookie, adminCredentials, createAdminToken, safeEqual } from '../../lib/admin-session.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { username, password: configuredPassword } = adminCredentials();

  const submittedUsername = String(req.body?.email || '').toLowerCase();
  const password = String(req.body?.password || '');
  if (!safeEqual(submittedUsername, username) || !safeEqual(password, configuredPassword)) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  res.setHeader('Set-Cookie', adminCookie(createAdminToken(username, configuredPassword)));
  return res.status(200).json({ ok: true, redirectTo: '/admin/dashboard', roles: ['ADMIN'] });
}
