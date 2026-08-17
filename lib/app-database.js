import crypto from 'crypto';
import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;
let connectionPromise;

async function connect() {
  if (!mongoUri) throw new Error('Missing MONGODB_URI environment variable.');
  if (mongoose.connection.readyState === 1) return mongoose;
  connectionPromise ||= mongoose.connect(mongoUri, { bufferCommands: false });
  return connectionPromise;
}

const accountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, enum: ['customer', 'owner'] },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
}, { timestamps: true });
const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppAccount', required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
const stateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'primary' },
  revision: { type: Number, required: true, default: 0 },
  state: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, minimize: false });

const Account = mongoose.models.AppAccount || mongoose.model('AppAccount', accountSchema);
const Session = mongoose.models.AppSession || mongoose.model('AppSession', sessionSchema);
const ApplicationState = mongoose.models.ApplicationState || mongoose.model('ApplicationState', stateSchema);

export const emptyState = () => ({
  role: 'customer', route: 'home', activeSalonId: '', registeredCustomerId: '',
  salons: [], services: [], staff: [], customers: [], bookings: [], offers: [], campaigns: [],
  redemptions: [], notifications: [], ownerNotifications: [], slotHolds: [], blockedTimes: [], holidays: [],
  auditLog: [], settings: { cancellationCutoffHours: 2 }, pendingBooking: null,
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const accountView = (account) => ({ id: String(account._id), name: account.name, email: account.email, role: account.role });

export async function readState() {
  await connect();
  let document = await ApplicationState.findOne({ key: 'primary' }).lean();
  if (!document) {
    document = await ApplicationState.findOneAndUpdate(
      { key: 'primary' },
      { $setOnInsert: { revision: 0, state: emptyState() } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true },
    );
  }
  return { revision: document.revision, state: structuredClone(document.state) };
}

export async function writeState(state, expectedRevision) {
  await connect();
  const document = await ApplicationState.findOneAndUpdate(
    { key: 'primary', revision: expectedRevision },
    { $set: { state }, $inc: { revision: 1 } },
    { new: true, lean: true, runValidators: true },
  );
  return document ? { revision: document.revision, state: structuredClone(document.state) } : null;
}

export async function createAccount({ name, email, password, role, salonName, location }) {
  await connect();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!name?.trim() || !normalizedEmail || String(password).length < 8 || !['customer', 'owner'].includes(role)) {
    throw new Error('Name, valid email, role, and an 8-character password are required.');
  }
  if (role === 'owner' && (!salonName?.trim() || !location?.trim())) throw new Error('Salon name and location are required.');
  if (await Account.exists({ email: normalizedEmail })) throw new Error('An account with this email already exists.');

  const salt = crypto.randomBytes(16).toString('hex');
  let account;
  try {
    account = await Account.create({ name: name.trim(), email: normalizedEmail, role, passwordHash: hashPassword(password, salt), passwordSalt: salt });
  } catch (error) {
    if (error?.code === 11000) throw new Error('An account with this email already exists.');
    throw error;
  }

  let profileSaved = false;
  for (let attempt = 0; attempt < 3 && !profileSaved; attempt += 1) {
    const snapshot = await readState();
    const state = structuredClone(snapshot.state);
    const accountId = String(account._id);
    if (role === 'customer') {
      state.customers.push({ id: crypto.randomUUID(), accountId, name: name.trim(), customName: name.trim(), mobile: '', email: normalizedEmail, dob: '', gender: '', location: location?.trim() || '', language: 'English', totalSpend: 0, visits: 0, favoriteSalons: [] });
    } else {
      const salonId = crypto.randomUUID();
      state.salons.push({ id: salonId, accountId, ownerId: accountId, name: salonName.trim(), address: location.trim(), location: location.trim(), rating: 'New', distance: '', featured: false, approved: true, suspended: false, active: true, phone: '', whatsapp: '', openingHours: '9:00 AM - 7:00 PM', image: '', description: '' });
    }
    profileSaved = Boolean(await writeState(state, snapshot.revision));
  }
  if (!profileSaved) {
    await Account.deleteOne({ _id: account._id });
    throw new Error('Account creation conflicted with another update. Please try again.');
  }
  return accountView(account);
}

export async function authenticate(email, password) {
  await connect();
  const account = await Account.findOne({ email: String(email).trim().toLowerCase() }).lean();
  if (!account) return null;
  const supplied = Buffer.from(hashPassword(String(password), account.passwordSalt), 'hex');
  const stored = Buffer.from(account.passwordHash, 'hex');
  if (supplied.length !== stored.length || !crypto.timingSafeEqual(supplied, stored)) return null;
  return accountView(account);
}

export async function createSession(account) {
  await connect();
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Session.create({ tokenHash: hashToken(token), accountId: account.id, expiresAt });
  return { token, expiresAt };
}

export async function accountForSession(token) {
  if (!token) return null;
  await connect();
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).populate('accountId').lean();
  return session?.accountId ? accountView(session.accountId) : null;
}

export async function deleteSession(token) {
  if (!token) return;
  await connect();
  await Session.deleteOne({ tokenHash: hashToken(token) });
}
