import { connectToMongoDB } from '../mongodb-connection.js';
import { readUserSession } from '../user-session.js';
import { Salon } from '../../models/Salon.js';
import { Account } from '../../models/Account.js';
import { PlatformState } from '../../models/PlatformState.js';

const textFields = ['salonName', 'phone', 'address', 'town', 'openingHours', 'whatsappNumber', 'description', 'image'];
const present = (value) => typeof value === 'string' ? value.trim() : '';
const serialize = (salon, moderation) => salon ? { id: String(salon._id), ownerId: String(salon.ownerId), salonName: salon.salonName, phone: salon.phone, address: salon.address, town: salon.town, openingHours: salon.openingHours, whatsappNumber: salon.whatsappNumber, description: salon.description, image: salon.image, bookingLeadTimeHours: salon.bookingLeadTimeHours ?? 2, bookingWindowDays: salon.bookingWindowDays ?? 7, confirmationMode: salon.confirmationMode || 'manual', approvalStatus: moderation?.approvalStatus || 'pending', accountStatus: moderation?.accountStatus || 'inactive', active: moderation?.active === true } : null;
const sameName = (left, right) => Boolean(left && right && left.trim().localeCompare(right.trim(), undefined, { sensitivity: 'base' }) === 0);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const actor = readUserSession(req.headers.cookie || '');
  if (!actor?.roles?.includes('salon_owner')) return res.status(403).json({ error: 'Salon owner access required.' });
  await connectToMongoDB();
  if (req.method === 'GET') {
    const [salon, account, state] = await Promise.all([Salon.findOne({ ownerId: actor.sub }), Account.findById(actor.sub).select('+name'), PlatformState.findOne({ key: 'primary' }).select('app.salons').lean()]);
    // Clean up records produced by the old OAuth-prefill flow. A name saved through
    // this endpoint is confirmed and will never be inferred from profile identity.
    if (salon && !salon.salonNameConfirmed && sameName(salon.salonName, account?.ownerName || account?.name)) {
      salon.salonName = null;
      await salon.save();
    }
    const moderation = state?.app?.salons?.find((item) => String(item.ownerId || item.accountId) === String(actor.sub));
    return res.json({ salon: serialize(salon, moderation) });
  }
  if (!['POST', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  const update = Object.fromEntries(textFields.filter((field) => field in (req.body || {})).map((field) => [field, present(req.body[field]) || (field === 'salonName' ? null : '')]));
  if ('bookingLeadTimeHours' in (req.body || {})) {
    const leadTime = Number(req.body.bookingLeadTimeHours);
    if (!Number.isFinite(leadTime) || leadTime < 0 || leadTime > 168) return res.status(400).json({ error: 'Booking notice must be between 0 and 168 hours.' });
    update.bookingLeadTimeHours = leadTime;
  }
  if ('bookingWindowDays' in (req.body || {})) {
    const windowDays = Number(req.body.bookingWindowDays);
    if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) return res.status(400).json({ error: 'Booking window must be between 1 and 365 days.' });
    update.bookingWindowDays = windowDays;
  }
  if ('confirmationMode' in (req.body || {})) {
    if (!['manual', 'automatic'].includes(req.body.confirmationMode)) return res.status(400).json({ error: 'Confirmation mode must be manual or automatic.' });
    update.confirmationMode = req.body.confirmationMode;
  }
  if (req.method === 'PUT' && !present(req.body?.salonName)) return res.status(400).json({ error: 'Salon name is required.' });
  if (req.method === 'PUT') update.salonNameConfirmed = true;
  const salon = await Salon.findOneAndUpdate({ ownerId: actor.sub }, { $set: update, $setOnInsert: { ownerId: actor.sub } }, { new: true, upsert: true, runValidators: true });
  await PlatformState.findOneAndUpdate(
    { key: 'primary' },
    { $setOnInsert: { app: {}, admin: {}, revision: 0 } },
    { upsert: true }
  );
  const salonId = String(salon._id);
  await PlatformState.updateOne(
    { key: 'primary', 'app.salons': { $not: { $elemMatch: { id: salonId } } } },
    { $push: { 'app.salons': { id: salonId, ownerId: String(actor.sub), accountId: String(actor.sub), name: salon.salonName, location: salon.town, phone: salon.phone, approvalStatus: 'pending', accountStatus: 'inactive', active: false, approved: false, suspended: false, createdAt: new Date().toISOString() } } }
  );
  const state = await PlatformState.findOne({ key: 'primary' }).select('app.salons').lean();
  const moderation = state?.app?.salons?.find((item) => item.id === salonId);
  return res.status(req.method === 'POST' ? 201 : 200).json({ salon: serialize(salon, moderation) });
}
