import { connectToMongoDB } from '../../lib/mongodb-connection.js';
import { Account } from '../../models/Account.js';
import { createUserToken, userCookie } from '../../lib/user-session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const role = req.body?.role === 'salon_owner' ? 'salon_owner' : 'customer';
  const credential = String(req.body?.credential || '');
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  if (!credential || !clientId) return res.status(503).json({ error: 'Google sign-in is not configured.' });
  try {
    const verification = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const profile = await verification.json();
    if (!verification.ok || profile.aud !== clientId || profile.email_verified !== 'true' || !profile.email) return res.status(401).json({ error: 'Google identity could not be verified.' });
    await connectToMongoDB();
    const email = profile.email.toLowerCase();
    let account = await Account.findOne({ email });
    if (!account) account = await Account.create({ email, name: profile.name || email, roles: [role], provider: 'google' });
    else if (!account.roles.includes(role)) { account.roles.push(role); await account.save(); }
    if (account.status !== 'active') return res.status(403).json({ error: 'This account is not active.' });
    res.setHeader('Set-Cookie', userCookie(createUserToken(account)));
    return res.json({ accountId: String(account._id), name: account.name, email, roles: account.roles, role: role === 'salon_owner' ? 'owner' : 'customer', provider: 'google' });
  } catch { return res.status(401).json({ error: 'Google identity could not be verified.' }); }
}
