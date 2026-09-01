import { adminCookie, adminCredentials, createAdminToken, safeEqual } from '../../lib/admin-session.js';
import { csrfProtection, rateLimit, requestId, runAsyncMiddleware, runMiddleware, securityHeaders } from '../../lib/security.js';
const adminLimit = rateLimit({ name: 'admin-login', limit: 5, windowMs: 15 * 60_000 });

export default async function handler(req, res) {
  runMiddleware(requestId, req, res); runMiddleware(securityHeaders, req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!runMiddleware(csrfProtection, req, res) || !await runAsyncMiddleware(adminLimit, req, res)) return;

  let username; let configuredPassword;
  try { ({ username, password: configuredPassword } = adminCredentials()); } catch { return res.status(503).json({ error: 'Administrator authentication is unavailable.' }); }

  const submittedUsername = String(req.body?.email || '').toLowerCase();
  const password = String(req.body?.password || '');
  if (!safeEqual(submittedUsername, username) || !safeEqual(password, configuredPassword)) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  res.setHeader('Set-Cookie', adminCookie(createAdminToken(username)));
  return res.status(200).json({ ok: true, redirectTo: '/admin/dashboard', roles: ['ADMIN'] });
}
