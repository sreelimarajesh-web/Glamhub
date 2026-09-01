import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminCookie, adminCredentials, clearAdminCookie, createAdminToken, readAdminToken, safeEqual } from './lib/admin-session.js';
import { mongodbHealth } from './lib/mongodb-connection.js';
import authHandler from './api/auth.js';
import stateHandler from './api/state.js';
import { googleOAuthClientId } from './lib/google-oauth.js';
import { ConfigurationError, validateProductionConfig } from './lib/config.js';
import { BODY_LIMIT, csrfProtection, logError, rateLimit, requestId, securityHeaders } from './lib/security.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
validateProductionConfig();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(requestId, securityHeaders);
app.use(express.json({ limit: BODY_LIMIT }));
app.use(csrfProtection);

function requireAdmin(req, res, next) {
  const admin = readAdminToken(req.headers.cookie || '');
  if (!admin) return req.originalUrl.startsWith('/api/') ? res.status(403).json({ error: 'Admin access required.' }) : res.redirect('/admin/login');
  req.admin = admin;
  next();
}
app.get('/config.js', (_req, res) => {
  res.type('application/javascript').send(`window.SALONMATE_CONFIG = ${JSON.stringify({
    googleOAuthClientId: googleOAuthClientId(),
  })};`);
});
app.get('/login', (_req, res) => res.redirect('/'));
app.get('/admin/login', (_req, res) => res.sendFile(path.join(__dirname, 'admin-login.html')));
app.post('/api/admin/login', rateLimit({ name: 'admin-login', limit: 5, windowMs: 15 * 60_000 }), (req, res) => {
  const { username, password } = adminCredentials();
  if (!safeEqual(String(req.body.email || '').toLowerCase(), username) || !safeEqual(req.body.password || '', password)) return res.status(401).json({ error: 'Invalid admin credentials.' });
  res.setHeader('Set-Cookie', adminCookie(createAdminToken(username), process.env.NODE_ENV === 'production'));
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
app.all('/api/auth/:action', (req, res) => { req.authAction = req.params.action; return authHandler(req, res); });
app.get('/api/state', stateHandler);
app.put('/api/state', stateHandler);
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use((error, req, res, _next) => { logError(error, req); if (res.headersSent) return; const status = error?.type === 'entity.too.large' ? 413 : error instanceof ConfigurationError ? 503 : 500; res.status(status).json({ error: status === 413 ? 'Request body is too large.' : status === 503 ? 'Service configuration unavailable.' : 'Request failed.' }); });
export { app };
if (process.argv[1] === fileURLToPath(import.meta.url)) app.listen(port, () => console.log(JSON.stringify({ level: 'info', event: 'server_started', port })));
