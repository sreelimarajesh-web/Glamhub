import crypto from 'crypto';

export const userCookieName = 'zaya_session';
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const signature = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'development-only-change-me';

export function passwordDigest(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('base64url');
}

export function newPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  return { passwordSalt: salt, passwordHash: passwordDigest(password, salt) };
}

export function createUserToken(account) {
  const value = encode({ sub: String(account._id), email: account.email, ownerName: account.ownerName || account.name, avatarUrl: account.avatarUrl || null, roles: account.roles, exp: Date.now() + 8 * 60 * 60 * 1000 });
  return `${value}.${signature(value, secret())}`;
}

export function readUserSession(cookieHeader = '') {
  try {
    const token = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${userCookieName}=`))?.slice(userCookieName.length + 1);
    const [value, supplied] = (token || '').split('.');
    const expected = signature(value, secret());
    if (!value || !supplied || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(value, 'base64url').toString());
    return session.exp > Date.now() ? session : null;
  } catch { return null; }
}

export function userCookie(token, secure = process.env.NODE_ENV === 'production') {
  return `${userCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure ? '; Secure' : ''}`;
}

export function clearUserCookie(secure = process.env.NODE_ENV === 'production') {
  return `${userCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}
