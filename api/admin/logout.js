import { clearAdminCookie } from '../../lib/admin-session.js';
import { csrfProtection, requestId, runMiddleware, securityHeaders } from '../../lib/security.js';

export default function handler(req, res) {
  runMiddleware(requestId, req, res); runMiddleware(securityHeaders, req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!runMiddleware(csrfProtection, req, res)) return;

  res.setHeader('Set-Cookie', clearAdminCookie());
  return res.status(200).json({ ok: true });
}
