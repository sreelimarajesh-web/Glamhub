import { connectToMongoDB } from '../lib/mongodb-connection.js';
import { adminCredentials, readAdminToken } from '../lib/admin-session.js';
import { readUserSession } from '../lib/user-session.js';
import { PlatformState } from '../models/PlatformState.js';

const noStore = (res) => res.setHeader('Cache-Control', 'private, no-store, max-age=0');
const clone = (value) => structuredClone(value || {});
const scopedMerge = (existing = [], incoming = [], canChange) => {
  const retained = existing.filter((item) => !canChange(item));
  const changed = incoming.filter(canChange);
  return [...retained, ...changed];
};

function authorize(req) {
  const cookie = req.headers.cookie || '';
  const admin = readAdminToken(cookie, adminCredentials().password);
  return admin ? { ...admin, admin: true } : readUserSession(cookie);
}

function applyRolePolicy(current, requested, actor) {
  if (actor.admin) return requested;
  const next = clone(current);
  const accountId = actor.sub;
  const customerIds = new Set((requested.customers || []).filter((item) => item.accountId === accountId).map((item) => item.id));
  const salonIds = new Set((requested.salons || []).filter((item) => item.accountId === accountId || item.ownerId === accountId).map((item) => item.id));

  if (actor.roles?.includes('customer')) {
    next.customers = scopedMerge(current.customers, requested.customers, (item) => item.accountId === accountId);
    next.bookings = scopedMerge(current.bookings, requested.bookings, (item) => customerIds.has(item.customerId));
    next.notifications = scopedMerge(current.notifications, requested.notifications, (item) => customerIds.has(item.customerId) || item.audience === `user:${accountId}`);
  }
  if (actor.roles?.includes('salon_owner')) {
    // Salon business fields are persisted through /api/auth/salon, never through profile/session state.
    for (const key of ['services', 'staff', 'offers', 'campaigns', 'blockedTimes', 'holidays', 'ownerNotifications']) {
      next[key] = scopedMerge(current[key], requested[key], (item) => salonIds.has(item.salonId));
    }
    next.bookings = scopedMerge(next.bookings, requested.bookings, (item) => salonIds.has(item.salonId));
  }
  // Navigation, drafts and slot holds are ephemeral and must not become shared DB state.
  for (const key of ['role', 'route', 'pendingBooking', 'slotHolds', 'activeSalonId', 'registeredCustomerId']) delete next[key];
  return next;
}

export default async function handler(req, res) {
  noStore(res);
  const actor = authorize(req);
  if (!actor) return res.status(401).json({ error: 'Authentication required.' });
  await connectToMongoDB();
  const state = await PlatformState.findOneAndUpdate({ key: 'primary' }, { $setOnInsert: { app: {}, admin: {}, revision: 0 } }, { upsert: true, new: true });
  if (req.method === 'GET') return res.json({ app: state.app, admin: actor.admin ? state.admin : undefined, revision: state.revision });
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed.' });
  if (!Number.isInteger(req.body?.revision) || req.body.revision !== state.revision) return res.status(409).json({ error: 'State changed on another device.', revision: state.revision });
  const app = applyRolePolicy(state.app, req.body.app || {}, actor);
  const update = { app, revision: state.revision + 1 };
  if (actor.admin && req.body.admin) update.admin = req.body.admin;
  const saved = await PlatformState.findOneAndUpdate({ _id: state._id, revision: state.revision }, { $set: update }, { new: true });
  if (!saved) return res.status(409).json({ error: 'State changed on another device.' });
  return res.json({ ok: true, revision: saved.revision });
}
