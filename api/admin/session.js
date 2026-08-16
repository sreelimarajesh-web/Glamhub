import { readAdminToken } from '../../lib/admin-session.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const admin = readAdminToken(req.headers.cookie || '', process.env.ADMIN_SESSION_SECRET || '');
  if (!admin) return res.status(403).json({ error: 'Admin access required.' });
  return res.status(200).json({ email: admin.email, roles: admin.roles });
}
