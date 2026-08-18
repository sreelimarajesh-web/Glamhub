import { connectToMongoDB } from '../mongodb-connection.js';
import { readUserSession } from '../user-session.js';
import { Salon } from '../../models/Salon.js';

const fields = ['salonName', 'phone', 'address', 'town', 'openingHours', 'whatsappNumber', 'description', 'image'];
const present = (value) => typeof value === 'string' ? value.trim() : '';
const serialize = (salon) => salon ? { id: String(salon._id), ownerId: String(salon.ownerId), salonName: salon.salonName, phone: salon.phone, address: salon.address, town: salon.town, openingHours: salon.openingHours, whatsappNumber: salon.whatsappNumber, description: salon.description, image: salon.image } : null;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const actor = readUserSession(req.headers.cookie || '');
  if (!actor?.roles?.includes('salon_owner')) return res.status(403).json({ error: 'Salon owner access required.' });
  await connectToMongoDB();
  if (req.method === 'GET') return res.json({ salon: serialize(await Salon.findOne({ ownerId: actor.sub })) });
  if (!['POST', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  const update = Object.fromEntries(fields.filter((field) => field in (req.body || {})).map((field) => [field, present(req.body[field]) || (field === 'salonName' ? null : '')]));
  if (req.method === 'PUT' && !present(req.body?.salonName)) return res.status(400).json({ error: 'Salon name is required.' });
  const salon = await Salon.findOneAndUpdate({ ownerId: actor.sub }, { $set: update, $setOnInsert: { ownerId: actor.sub } }, { new: true, upsert: true, runValidators: true });
  return res.status(req.method === 'POST' ? 201 : 200).json({ salon: serialize(salon) });
}
