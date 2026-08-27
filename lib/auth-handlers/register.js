import { connectToMongoDB } from '../mongodb-connection.js';
import { Account } from '../../models/Account.js';
import { createUserToken, newPassword, userCookie } from '../user-session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const { name = '', email = '', password = '', role = 'customer' } = req.body || {};
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!String(name).trim() || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || String(password).length < 8 || !['customer', 'salon_owner'].includes(role)) return res.status(400).json({ error: 'Valid name, email, role and password are required.' });
  await connectToMongoDB();
  try {
    const account = await Account.create({ ownerName: String(name).trim(), email: normalizedEmail, roles: [role], ...newPassword(password) });
    res.setHeader('Set-Cookie', userCookie(createUserToken(account, role)));
    return res.status(201).json({ accountId: String(account._id), ownerName: account.ownerName, avatarUrl: account.avatarUrl, email: account.email, roles: account.roles, role: role === 'salon_owner' ? 'owner' : 'customer', provider: account.provider });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    return res.status(500).json({ error: 'Unable to create account.' });
  }
}
