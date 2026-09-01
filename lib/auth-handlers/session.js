import { readUserSession } from '../user-session.js';
import { connectToMongoDB } from '../mongodb-connection.js';
import { Account } from '../../models/Account.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const session = readUserSession(req.headers.cookie || '');
  if (!session) return res.status(401).json({ error: 'Authentication required.' });
  await connectToMongoDB();
  const account = await Account.findById(session.sub).select('status roles').lean();
  if (!account || account.status !== 'active') return res.status(403).json({ error: 'Account is not active.' });
  return res.json({ ...session, roles: account.roles });
}
