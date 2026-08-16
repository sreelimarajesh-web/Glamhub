import crypto from 'crypto';

const cookieName = 'salonmate_admin';
export const defaultAdminUsername = 'admin';
export const defaultAdminPassword = 'infy@123';
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');

export function safeEqual(left, right) {
  return crypto.timingSafeEqual(
    crypto.createHash('sha256').update(String(left)).digest(),
    crypto.createHash('sha256').update(String(right)).digest(),
  );
}

export function adminCredentials() {
  const username = (process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || defaultAdminUsername).toLowerCase();
  const password = process.env.ADMIN_PASSWORD || defaultAdminPassword;
  return { username, password };
}

export function createAdminToken(email, secret) {
  const payload = encode({ email, roles: ['ADMIN'], exp: Date.now() + 8 * 60 * 60 * 1000 });
  return `${payload}.${sign(payload, secret)}`;
}

export function readAdminToken(cookieHeader = '', secret = '') {
  try {
    if (!secret) return null;
    const token = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return claims.exp > Date.now() && claims.roles?.includes('ADMIN') ? claims : null;
  } catch (_error) {
    return null;
  }
}

export function adminCookie(token, secure = true) {
  return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure ? '; Secure' : ''}`;
}

export function clearAdminCookie(secure = true) {
  return `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}
