import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const adminSecret = process.env.ADMIN_SESSION_SECRET || '';
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (value) => crypto.createHmac('sha256', adminSecret).update(value).digest('base64url');
const safeEqual = (left, right) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(left)).digest(), crypto.createHash('sha256').update(String(right)).digest());
function createAdminToken(email) {
  const payload = encode({ email, roles: ['ADMIN'], exp: Date.now() + 8 * 60 * 60 * 1000 });
  return `${payload}.${sign(payload)}`;
}
function readAdminToken(req) {
  try {
    if (!adminSecret) return null;
    const token = (req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith('salonmate_admin='))?.split('=')[1];
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = sign(payload);
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return claims.exp > Date.now() && claims.roles?.includes('ADMIN') ? claims : null;
  } catch (_error) {
    return null;
  }
}
function requireAdmin(req, res, next) {
  const admin = readAdminToken(req);
  if (!admin) return req.originalUrl.startsWith('/api/') ? res.status(403).json({ error: 'Admin access required.' }) : res.redirect('/admin/login');
  req.admin = admin;
  next();
}
app.get('/config.js', (_req, res) => {
  res.type('application/javascript').send(`window.SALONMATE_CONFIG = ${JSON.stringify({
    googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  })};`);
});
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/admin/login', (_req, res) => res.sendFile(path.join(__dirname, 'admin-login.html')));
app.post('/api/admin/login', (req, res) => {
  const configuredEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD || '';
  if (!configuredEmail || !configuredPassword || !adminSecret) return res.status(503).json({ error: 'Admin authentication is not configured.' });
  if (!safeEqual(String(req.body.email || '').toLowerCase(), configuredEmail) || !safeEqual(req.body.password || '', configuredPassword)) return res.status(401).json({ error: 'Invalid admin credentials.' });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `salonmate_admin=${createAdminToken(configuredEmail)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`);
  res.json({ ok: true, redirectTo: '/admin/dashboard', roles: ['ADMIN'] });
});
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ email: req.admin.email, roles: req.admin.roles }));
app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  res.setHeader('Set-Cookie', 'salonmate_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/admin/dashboard', requireAdmin, (_req, res) => res.sendFile(path.join(__dirname, 'admin-dashboard.html')));
app.get('/admin-dashboard.html', requireAdmin, (_req, res) => res.redirect('/admin/dashboard'));
app.get('/admin.html', (_req, res) => res.redirect('/admin/login'));
app.use('/admin', requireAdmin, (_req, res) => res.status(404).send('Admin page not found.'));
app.use(express.static(__dirname));
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Zaya' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(port, () => console.log(`Zaya running on ${port}`));
