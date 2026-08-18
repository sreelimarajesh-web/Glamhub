import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Personal identity only. Business names live in the Salon collection.
  ownerName: { type: String, required: true, trim: true },
  avatarUrl: { type: String, trim: true, default: null },
  name: { type: String, trim: true, select: false }, // legacy field, removed after data migration
  passwordHash: { type: String, select: false },
  passwordSalt: { type: String, select: false },
  roles: { type: [String], enum: ['customer', 'salon_owner'], required: true },
  provider: { type: String, enum: ['email', 'google'], default: 'email' },
  status: { type: String, enum: ['active', 'suspended', 'blocked'], default: 'active' },
}, { timestamps: true, versionKey: false });

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
