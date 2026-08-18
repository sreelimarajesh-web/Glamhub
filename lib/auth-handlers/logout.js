import { clearUserCookie } from '../user-session.js';
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Set-Cookie', clearUserCookie());
  return res.json({ ok: true });
}
