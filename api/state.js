import { connectToMongoDB } from '../lib/mongodb-connection.js';
import { readAdminToken } from '../lib/admin-session.js';
import { readUserSession } from '../lib/user-session.js';
import { PlatformState } from '../models/PlatformState.js';
import { Salon } from '../models/Salon.js';
import { Account } from '../models/Account.js';
import { csrfProtection, requestId, runMiddleware, securityHeaders } from '../lib/security.js';

const noStore = (res) => res.setHeader('Cache-Control', 'private, no-store, max-age=0');
const clone = (value) => structuredClone(value || {});
const scopedMerge = (existing = [], incoming = [], canChange, normalize = (item) => item) => {
  const retained = existing.filter((item) => !canChange(item));
  const changed = incoming.filter(canChange).map(normalize);
  return [...retained, ...changed];
};
// Request ownership fields are never consulted. Existing database records decide
// which IDs the actor may replace; a genuinely new ID is normalized to the
// database-derived tenant before persistence.
const tenantMerge = (existing = [], incoming = [], ownsExisting, normalize) => {
  const ownedIds = new Set(existing.filter(ownsExisting).map((item) => String(item.id)));
  const allIds = new Set(existing.map((item) => String(item.id)));
  const allowed = incoming.filter((item) => ownedIds.has(String(item.id)) || !allIds.has(String(item.id))).map(normalize);
  return [...existing.filter((item) => !ownedIds.has(String(item.id))), ...allowed];
};

const salonIsPublished = (salon) => salon
  && salon.approvalStatus === 'approved'
  && salon.accountStatus === 'active'
  && salon.active === true
  && salon.approved !== false
  && salon.suspended !== true;

export function publicSalons(salons, activeOwnerIds, moderatedSalons = []) {
  const moderationBySalonId = new Map(moderatedSalons.map((salon) => [String(salon.id), salon]));
  const moderationByOwnerId = new Map(moderatedSalons.map((salon) => [String(salon.ownerId || salon.accountId), salon]));
  return salons.filter((salon) => {
    if (!activeOwnerIds.has(String(salon.ownerId))) return false;
    const moderation = moderationBySalonId.get(String(salon._id)) || moderationByOwnerId.get(String(salon.ownerId));
    return salonIsPublished(moderation);
  });
}

export function publicSalonCatalog(app = {}, visibleSalonIds = new Set()) {
  const belongsToVisibleSalon = (item) => visibleSalonIds.has(String(item?.salonId));
  const select = (key, fields) => (app[key] || [])
    .filter(belongsToVisibleSalon)
    .map((item) => Object.fromEntries(fields.map((field) => [field, item[field]])));
  return {
    services: select('services', ['id', 'salonId', 'name', 'category', 'price', 'duration', 'active']),
    staff: select('staff', ['id', 'salonId', 'name', 'specialization', 'hours', 'available']),
    offers: select('offers', ['id', 'salonId', 'title', 'description', 'type', 'discount', 'service', 'segment', 'start', 'end', 'terms', 'minPurchase', 'active', 'status', 'approvalStatus', 'usageLimit', 'usageCount']),
    platformOffers: (app.platformOffers || [])
      .filter((item) => item.salonId === 'all' || belongsToVisibleSalon(item))
      .map((item) => Object.fromEntries(['id', 'salonId', 'title', 'description', 'type', 'discount', 'minValue', 'startDate', 'endDate', 'status', 'usageLimit'].map((field) => [field, item[field]]))),
  };
}

export function serializePublicSalon(salon) {
  return {
    id: String(salon._id),
    ownerId: String(salon.ownerId),
    salonName: salon.salonName,
    phone: salon.phone,
    address: salon.address,
    town: salon.town,
    latitude: salon.latitude ?? null,
    longitude: salon.longitude ?? null,
    openingHours: salon.openingHours,
    whatsappNumber: salon.whatsappNumber,
    description: salon.description,
    image: salon.image,
    bookingLeadTimeHours: salon.bookingLeadTimeHours ?? 2,
    bookingWindowDays: salon.bookingWindowDays ?? 7,
    confirmationMode: salon.confirmationMode || 'manual',
    // Reaching this serializer means the salon has already passed the public
    // moderation and owner-account filters above. Include that decision so the
    // customer client does not mistake a published salon for a pending one.
    approved: true,
    approvalStatus: 'approved',
    accountStatus: 'active',
    active: true,
  };
}

function authorize(req) {
  const cookie = req.headers.cookie || '';
  const admin = readAdminToken(cookie);
  return admin ? { ...admin, admin: true } : readUserSession(cookie);
}

function scopedState(current, actor, account, ownedSalon) {
  if (actor.admin) return clone(current);
  const accountId = String(account._id);
  const customers = (current.customers || []).filter((item) => item.accountId === accountId);
  const customerIds = new Set(customers.map((item) => String(item.id)));
  const salonId = ownedSalon ? String(ownedSalon._id) : null;
  const app = { customers };
  for (const key of ['services', 'staff', 'offers', 'campaigns', 'blockedTimes', 'holidays', 'ownerNotifications']) app[key] = (current[key] || []).filter((item) => salonId && String(item.salonId) === salonId);
  app.bookings = (current.bookings || []).filter((item) => customerIds.has(String(item.customerId)) || (salonId && String(item.salonId) === salonId));
  app.notifications = (current.notifications || []).filter((item) => customerIds.has(String(item.customerId)) || item.audience === `user:${accountId}`);
  return app;
}

function applyRolePolicy(current, requested, actor, account, ownedSalon) {
  if (actor.admin) return requested;
  const next = clone(current);
  const accountId = String(account._id);
  const existingCustomers = (current.customers || []).filter((item) => item.accountId === accountId);
  const customerId = String(existingCustomers[0]?.id || `cus-${accountId}`);
  const ownsCustomer = (item) => String(item.id) === customerId;
  const salonId = ownedSalon ? String(ownedSalon._id) : null;

  if (account.roles.includes('customer')) {
    next.customers = tenantMerge(current.customers, requested.customers, (item) => item.accountId === accountId, (item) => ({ ...item, id: customerId, accountId }));
    next.bookings = tenantMerge(current.bookings, requested.bookings, (item) => String(item.customerId) === customerId, (item) => {
      const persisted = (current.bookings || []).find((booking) => String(booking.id) === String(item.id));
      if (persisted) return { ...persisted, status: item.status === 'Cancelled' ? 'Cancelled' : persisted.status };
      const service = (current.services || []).find((candidate) => String(candidate.id) === String(item.serviceId) && candidate.active !== false);
      const targetSalonId = String(service?.salonId || '');
      const moderation = (current.salons || []).find((candidate) => String(candidate.id) === targetSalonId);
      const staff = (current.staff || []).find((candidate) => String(candidate.id) === String(item.staffId) && String(candidate.salonId) === targetSalonId && candidate.available !== false);
      if (!service || !staff || !salonIsPublished(moderation)) throw new Error('BOOKING_NOT_AVAILABLE');
      const appointment = new Date(`${item.date}T${item.time}:00+05:30`);
      const lead = Number(moderation.bookingLeadTimeHours ?? 2) * 3600000;
      const maximum = new Date(); maximum.setDate(maximum.getDate() + Number(moderation.bookingWindowDays ?? 7));
      const unavailable = Number.isNaN(appointment.getTime()) || appointment.getTime() < Date.now() + lead || appointment > maximum
        || (current.holidays || []).some((entry) => String(entry.salonId) === targetSalonId && entry.date === item.date)
        || (current.blockedTimes || []).some((entry) => String(entry.salonId) === targetSalonId && entry.date === item.date && entry.time === item.time)
        || (current.bookings || []).some((entry) => String(entry.staffId) === String(staff.id) && entry.date === item.date && entry.time === item.time && ['Pending', 'Confirmed'].includes(entry.status));
      if (unavailable) throw new Error('BOOKING_NOT_AVAILABLE');
      return { ...item, customerId, salonId: targetSalonId, serviceId: service.id, staffId: staff.id, amount: Number(service.price), originalAmount: Number(service.price), discountAmount: 0, duration: Number(service.duration), status: moderation.confirmationMode === 'automatic' ? 'Confirmed' : 'Pending', source: 'online', paymentStatus: 'Pay at salon' };
    });
    next.notifications = tenantMerge(current.notifications, requested.notifications, (item) => String(item.customerId) === customerId || item.audience === `user:${accountId}`, (item) => ({ ...item, ...(item.customerId ? { customerId } : {}), ...(item.audience ? { audience: `user:${accountId}` } : {}) }));
  }
  if (account.roles.includes('salon_owner') && salonId) {
    // Salon business fields are persisted through /api/auth/salon, never through profile/session state.
    for (const key of ['services', 'staff', 'offers', 'campaigns', 'blockedTimes', 'holidays', 'ownerNotifications']) {
      next[key] = tenantMerge(current[key], requested[key], (item) => String(item.salonId) === salonId, (item) => ({ ...item, salonId }));
    }
    next.bookings = tenantMerge(next.bookings, requested.bookings, (item) => String(item.salonId) === salonId, (item) => ({ ...item, salonId }));
  }
  // Navigation, drafts and slot holds are ephemeral and must not become shared DB state.
  for (const key of ['role', 'route', 'pendingBooking', 'slotHolds', 'activeSalonId', 'registeredCustomerId']) delete next[key];
  return next;
}

export default async function handler(req, res) {
  runMiddleware(requestId, req, res); runMiddleware(securityHeaders, req, res);
  if (['PUT', 'PATCH', 'POST', 'DELETE'].includes(req.method) && !runMiddleware(csrfProtection, req, res)) return;
  noStore(res);
  if (req.method === 'GET' && req.query?.view === 'salons') {
    await connectToMongoDB();
    const salons = await Salon.find({ salonNameConfirmed: true, salonName: { $nin: [null, ''] } }).lean();
    const ownerIds = [...new Set(salons.map((salon) => String(salon.ownerId)))];
    const [activeOwners, platformState] = await Promise.all([
      Account.find({ _id: { $in: ownerIds }, status: 'active' }).select('_id').lean(),
      PlatformState.findOne({ key: 'primary' }).select('app.salons app.services app.staff app.offers app.platformOffers').lean(),
    ]);
    const activeOwnerIds = new Set(activeOwners.map((account) => String(account._id)));
    const visibleSalons = publicSalons(salons, activeOwnerIds, platformState?.app?.salons || []);
    const publicIds = new Set(visibleSalons.map((salon) => String(salon._id)));
    return res.json({
      salons: visibleSalons.map(serializePublicSalon),
      ...publicSalonCatalog(platformState?.app, publicIds),
    });
  }
  const actor = authorize(req);
  if (!actor) return res.status(401).json({ error: 'Authentication required.' });
  await connectToMongoDB();
  const [state, account, ownedSalon] = await Promise.all([
    PlatformState.findOneAndUpdate({ key: 'primary' }, { $setOnInsert: { app: {}, admin: {}, revision: 0 } }, { upsert: true, new: true }),
    actor.admin ? null : Account.findById(actor.sub),
    actor.admin || !actor.roles?.includes('salon_owner') ? null : Salon.findOne({ ownerId: actor.sub }),
  ]);
  if (!actor.admin && (!account || account.status !== 'active')) return res.status(403).json({ error: 'Account is not active.' });
  if (req.method === 'GET') return res.json({ app: scopedState(state.app, actor, account, ownedSalon), admin: actor.admin ? state.admin : undefined, revision: state.revision, deprecated: true });
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed.' });
  if (!Number.isInteger(req.body?.revision) || req.body.revision !== state.revision) return res.status(409).json({ error: 'State changed on another device.', revision: state.revision });
  let app;
  try { app = applyRolePolicy(state.app, req.body.app || {}, actor, account, ownedSalon); } catch (error) { if (error.message === 'BOOKING_NOT_AVAILABLE') return res.status(409).json({ error: 'That appointment is no longer available.' }); throw error; }
  const update = { app, revision: state.revision + 1 };
  if (actor.admin && req.body.admin) update.admin = req.body.admin;
  const saved = await PlatformState.findOneAndUpdate({ _id: state._id, revision: state.revision }, { $set: update }, { new: true });
  if (!saved) return res.status(409).json({ error: 'State changed on another device.' });
  return res.json({ ok: true, revision: saved.revision });
}
