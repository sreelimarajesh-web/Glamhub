import { connectToMongoDB } from '../mongodb-connection.js';
import { Account } from '../../models/Account.js';
import { createUserToken, userCookie } from '../user-session.js';
import { googleOAuthClientId } from '../google-oauth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const role = req.body?.role === 'salon_owner' ? 'salon_owner' : 'customer';
  const credential = String(req.body?.credential || '');
  const clientId = googleOAuthClientId();
  if (!credential) return res.status(400).json({ error: 'Google credential is required.' });
  try {
    const verification = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const profile = await verification.json();
    if (!verification.ok || profile.aud !== clientId || profile.email_verified !== 'true' || !profile.email) return res.status(401).json({ error: 'Google identity could not be verified.' });
    await connectToMongoDB();
    const email = profile.email.toLowerCase();
    let account = await Account.findOne({ email });
    if (!account) account = await Account.create({ email, ownerName: profile.name || email, avatarUrl: profile.picture || null, roles: [role], provider: 'google' });
    else {
      // OAuth profile fields update only the owner profile, never a salon record.
      account.ownerName = profile.name || account.ownerName;
      account.avatarUrl = profile.picture || account.avatarUrl;
      if (!account.roles.includes(role)) account.roles.push(role);
      await account.save();
    }
    if (account.status !== 'active') return res.status(403).json({ error: 'This account is not active.' });
    res.setHeader('Set-Cookie', userCookie(createUserToken(account, role)));
    return res.json({ accountId: String(account._id), ownerName: account.ownerName, avatarUrl: account.avatarUrl, email, roles: account.roles, role: role === 'salon_owner' ? 'owner' : 'customer', provider: 'google' });
  } catch { return res.status(401).json({ error: 'Google identity could not be verified.' }); }
}
