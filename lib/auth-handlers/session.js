import { readUserSession } from '../user-session.js';
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const session = readUserSession(req.headers.cookie || '');
  return session ? res.json(session) : res.status(401).json({ error: 'Authentication required.' });
}
