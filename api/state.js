import { connectToMongoDB } from '../lib/mongodb-connection.js';
import { adminCredentials, readAdminToken } from '../lib/admin-session.js';
import { readUserSession } from '../lib/user-session.js';
import { PlatformState } from '../models/PlatformState.js';
import { Salon } from '../models/Salon.js';
import { Account } from '../models/Account.js';

const noStore = (res) => res.setHeader('Cache-Control', 'private, no-store, max-age=0');
const clone = (value) => structuredClone(value || {});
const scopedMerge = (existing = [], incoming = [], canChange) => {
  const retained = existing.filter((item) => !canChange(item));
  const changed = incoming.filter(canChange);
  return [...retained, ...changed];
};

const salonUnavailable = (salon) => salon && (
  salon.accountStatus === 'suspended'
  || salon.accountStatus === 'blocked'
  || salon.suspended === true
  || salon.active === false
  || salon.approved === false
  || salon.approvalStatus === 'pending'
  || salon.approvalStatus === 'rejected'
);

export function publicSalons(salons, activeOwnerIds, moderatedSalons = []) {
  const moderationBySalonId = new Map(moderatedSalons.map((salon) => [String(salon.id), salon]));
  const moderationByOwnerId = new Map(moderatedSalons.map((salon) => [String(salon.ownerId || salon.accountId), salon]));
  return salons.filter((salon) => {
    if (!activeOwnerIds.has(String(salon.ownerId))) return false;
    const moderation = moderationBySalonId.get(String(salon._id)) || moderationByOwnerId.get(String(salon.ownerId));
    return !salonUnavailable(moderation);
  });
}

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
  if (req.method === 'GET' && req.query?.view === 'salons') {
    await connectToMongoDB();
    const salons = await Salon.find({ salonNameConfirmed: true, salonName: { $nin: [null, ''] } }).lean();
    const ownerIds = [...new Set(salons.map((salon) => String(salon.ownerId)))];
    const [activeOwners, platformState] = await Promise.all([
      Account.find({ _id: { $in: ownerIds }, status: 'active' }).select('_id').lean(),
      PlatformState.findOne({ key: 'primary' }).select('app.salons').lean(),
    ]);
    const activeOwnerIds = new Set(activeOwners.map((account) => String(account._id)));
    const visibleSalons = publicSalons(salons, activeOwnerIds, platformState?.app?.salons || []);
    return res.json({ salons: visibleSalons.map((salon) => ({ id: String(salon._id), ownerId: String(salon.ownerId), salonName: salon.salonName, phone: salon.phone, address: salon.address, town: salon.town, openingHours: salon.openingHours, whatsappNumber: salon.whatsappNumber, description: salon.description, image: salon.image })) });
  }
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
