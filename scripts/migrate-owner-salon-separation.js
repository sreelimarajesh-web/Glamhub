import { connectToMongoDB } from '../lib/mongodb-connection.js';
import { Account } from '../models/Account.js';
import { Salon } from '../models/Salon.js';
import { PlatformState } from '../models/PlatformState.js';

await connectToMongoDB();
const accounts = await Account.find({ ownerName: { $exists: false } }).select('+name');
for (const account of accounts) {
  account.ownerName = account.name || account.email;
  account.name = undefined;
  await account.save();
}

const state = await PlatformState.findOne({ key: 'primary' }).lean();
for (const legacy of state?.app?.salons || []) {
  if (!legacy.accountId && !legacy.ownerId) continue;
  const ownerId = legacy.accountId || legacy.ownerId;
  if (!/^[a-f\d]{24}$/i.test(String(ownerId))) continue;
  await Salon.updateOne({ ownerId }, { $setOnInsert: {
    ownerId,
    salonName: legacy.name || null,
    phone: legacy.phone || '',
    address: legacy.address || '',
    town: legacy.location || '',
    openingHours: legacy.openingHours || '',
    whatsappNumber: legacy.whatsapp || '',
    description: legacy.description || '',
    image: legacy.image || '',
  } }, { upsert: true });
}
console.log(`Migrated ${accounts.length} owner profiles and extracted legacy salon businesses.`);
process.exit(0);
