import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminCookie, adminCredentials, clearAdminCookie, createAdminToken, readAdminToken, safeEqual } from './lib/admin-session.js';
import { mongodbHealth } from './lib/mongodb-connection.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

function requireAdmin(req, res, next) {
  const admin = readAdminToken(req.headers.cookie || '', adminCredentials().password);
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
  const { username, password } = adminCredentials();
  if (!safeEqual(String(req.body.email || '').toLowerCase(), username) || !safeEqual(req.body.password || '', password)) return res.status(401).json({ error: 'Invalid admin credentials.' });
  res.setHeader('Set-Cookie', adminCookie(createAdminToken(username, password), process.env.NODE_ENV === 'production'));
  res.json({ ok: true, redirectTo: '/admin/dashboard', roles: ['ADMIN'] });
});
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ email: req.admin.email, roles: req.admin.roles }));
app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  res.setHeader('Set-Cookie', clearAdminCookie(process.env.NODE_ENV === 'production'));
  res.json({ ok: true });
});
app.get('/admin/dashboard', requireAdmin, (_req, res) => res.sendFile(path.join(__dirname, 'admin-dashboard.html')));
app.get('/admin-dashboard.html', requireAdmin, (_req, res) => res.redirect('/admin/dashboard'));
app.get('/admin.html', (_req, res) => res.redirect('/admin/login'));
app.use('/admin', requireAdmin, (_req, res) => res.status(404).send('Admin page not found.'));
app.use(express.static(__dirname));
app.get('/api/health', async (_req, res) => { const database = await mongodbHealth(); res.setHeader('Cache-Control', 'no-store, max-age=0'); res.status(database.ok ? 200 : 503).json({ ok: database.ok, app: 'Zaya', database: 'mongodb', ...database }); });
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(port, () => console.log(`Zaya running on ${port}`));
