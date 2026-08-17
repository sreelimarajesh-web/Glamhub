import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminCookie, adminCredentials, clearAdminCookie, createAdminToken, readAdminToken, safeEqual } from './lib/admin-session.js';
import { accountForSession, authenticate, createAccount, createSession, deleteSession, readState, writeState } from './lib/app-database.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json({ limit: '2mb' }));

const appCookieName = 'zaya_session';
const cookies = (header = '') => Object.fromEntries(header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter((part) => part.length === 2));
const sessionCookie = (token, maxAge = 604800) => `${appCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const currentAccount = async (req) => accountForSession(cookies(req.headers.cookie || '')[appCookieName]);
const publicState = (state) => ({
  role: 'customer', route: 'home', activeSalonId: '', registeredCustomerId: '',
  salons: state.salons.filter((salon) => salon.active !== false && salon.approved !== false && !salon.suspended),
  services: state.services.filter((service) => service.active !== false),
  staff: state.staff.filter((person) => person.available !== false),
  offers: state.offers.filter((offer) => offer.active !== false && offer.status !== 'rejected'),
  customers: [], bookings: [], campaigns: [], redemptions: [], notifications: [], ownerNotifications: [],
  slotHolds: [], blockedTimes: [], holidays: [], auditLog: [], settings: state.settings, pendingBooking: null,
});

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
app.get('/api/app/bootstrap', async (req, res, next) => {
  try {
    const account = await currentAccount(req);
    const snapshot = await readState();
    res.json({ revision: snapshot.revision, state: account ? snapshot.state : publicState(snapshot.state), account });
  } catch (error) { next(error); }
});
app.post('/api/app/signup', async (req, res) => {
  try {
    const account = await createAccount(req.body || {});
    const session = await createSession(account);
    res.setHeader('Set-Cookie', sessionCookie(session.token));
    res.status(201).json({ account });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post('/api/app/login', async (req, res, next) => {
  try {
    const account = await authenticate(req.body?.email || '', req.body?.password || '');
    if (!account) return res.status(401).json({ error: 'Incorrect email or password.' });
    const session = await createSession(account);
    res.setHeader('Set-Cookie', sessionCookie(session.token));
    return res.json({ account });
  } catch (error) { next(error); }
});
app.post('/api/app/logout', async (req, res, next) => {
  try {
    await deleteSession(cookies(req.headers.cookie || '')[appCookieName]);
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    res.json({ ok: true });
  } catch (error) { next(error); }
});
app.put('/api/app/state', async (req, res, next) => {
  try {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ error: 'Sign in required.' });
    if (!req.body?.state || !Number.isInteger(req.body?.revision)) return res.status(400).json({ error: 'State and revision are required.' });
    const saved = await writeState(req.body.state, req.body.revision);
    if (!saved) return res.status(409).json({ error: 'The app changed on another device. Refresh and try again.', ...(await readState()) });
    return res.json(saved);
  } catch (error) { next(error); }
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
app.get('/api/admin/app-state', requireAdmin, async (_req, res, next) => { try { res.json(await readState()); } catch (error) { next(error); } });
app.put('/api/admin/app-state', requireAdmin, async (req, res, next) => {
  try {
    if (!req.body?.state || !Number.isInteger(req.body?.revision)) return res.status(400).json({ error: 'State and revision are required.' });
    const saved = await writeState(req.body.state, req.body.revision);
    if (!saved) return res.status(409).json({ error: 'The app changed on another device.', ...(await readState()) });
    return res.json(saved);
  } catch (error) { next(error); }
});
app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  res.setHeader('Set-Cookie', clearAdminCookie(process.env.NODE_ENV === 'production'));
  res.json({ ok: true });
});
app.get('/admin/dashboard', requireAdmin, (_req, res) => res.sendFile(path.join(__dirname, 'admin-dashboard.html')));
app.get('/admin-dashboard.html', requireAdmin, (_req, res) => res.redirect('/admin/dashboard'));
app.get('/admin.html', (_req, res) => res.redirect('/admin/login'));
app.use('/admin', requireAdmin, (_req, res) => res.status(404).send('Admin page not found.'));
app.use(express.static(__dirname));
app.get('/api/health', async (_req, res, next) => {
  try {
    await readState();
    res.json({ ok: true, app: 'Zaya', database: 'mongodb' });
  } catch (error) { next(error); }
});
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Database operation failed.' }); });
app.listen(port, () => console.log(`Zaya running on ${port}`));
