import crypto from 'crypto';
import { connectToMongoDB } from '../mongodb-connection.js';
import { Account } from '../../models/Account.js';
import { createUserToken, passwordDigest, userCookie } from '../user-session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  const requestedRole = req.body?.role === 'salon_owner' ? 'salon_owner' : 'customer';
  await connectToMongoDB();
  const account = await Account.findOne({ email }).select('+passwordHash +passwordSalt +name');
  const candidate = passwordDigest(req.body?.password || '', account?.passwordSalt || 'invalid-account');
  const valid = account?.passwordHash && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(account.passwordHash));
  if (!valid || account.status !== 'active') return res.status(401).json({ error: 'Incorrect email or password.' });
  if (!account.roles.includes(requestedRole)) return res.status(403).json({ error: 'This account does not have the requested role.' });
  res.setHeader('Set-Cookie', userCookie(createUserToken(account)));
  return res.json({ accountId: String(account._id), ownerName: account.ownerName || account.name, avatarUrl: account.avatarUrl, email: account.email, roles: account.roles, role: requestedRole === 'salon_owner' ? 'owner' : 'customer', provider: account.provider });
}
