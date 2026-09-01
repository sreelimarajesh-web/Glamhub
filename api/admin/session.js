import { readAdminToken } from '../../lib/admin-session.js';
import { requestId, runMiddleware, securityHeaders } from '../../lib/security.js';

export default function handler(req, res) {
  runMiddleware(requestId, req, res); runMiddleware(securityHeaders, req, res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let admin;
  try { admin = readAdminToken(req.headers?.cookie || ''); } catch { return res.status(503).json({ error: 'Administrator authentication is unavailable.' }); }
  if (!admin) return res.status(403).json({ error: 'Admin access required.' });
  return res.status(200).json({ email: admin.email, roles: admin.roles });
}
