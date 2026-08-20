import { connectToMongoDB } from '../mongodb-connection.js';
import { readUserSession } from '../user-session.js';
import { Salon } from '../../models/Salon.js';
import { Account } from '../../models/Account.js';

const textFields = ['salonName', 'phone', 'address', 'town', 'openingHours', 'whatsappNumber', 'description', 'image'];
const present = (value) => typeof value === 'string' ? value.trim() : '';
const serialize = (salon) => salon ? { id: String(salon._id), ownerId: String(salon.ownerId), salonName: salon.salonName, phone: salon.phone, address: salon.address, town: salon.town, openingHours: salon.openingHours, whatsappNumber: salon.whatsappNumber, description: salon.description, image: salon.image, bookingLeadTimeHours: salon.bookingLeadTimeHours ?? 2, bookingWindowDays: salon.bookingWindowDays ?? 7, confirmationMode: salon.confirmationMode || 'manual' } : null;
const sameName = (left, right) => Boolean(left && right && left.trim().localeCompare(right.trim(), undefined, { sensitivity: 'base' }) === 0);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const actor = readUserSession(req.headers.cookie || '');
  if (!actor?.roles?.includes('salon_owner')) return res.status(403).json({ error: 'Salon owner access required.' });
  await connectToMongoDB();
  if (req.method === 'GET') {
    const [salon, account] = await Promise.all([Salon.findOne({ ownerId: actor.sub }), Account.findById(actor.sub).select('+name')]);
    // Clean up records produced by the old OAuth-prefill flow. A name saved through
    // this endpoint is confirmed and will never be inferred from profile identity.
    if (salon && !salon.salonNameConfirmed && sameName(salon.salonName, account?.ownerName || account?.name)) {
      salon.salonName = null;
      await salon.save();
    }
    return res.json({ salon: serialize(salon) });
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
  return res.status(req.method === 'POST' ? 201 : 200).json({ salon: serialize(salon) });
}
