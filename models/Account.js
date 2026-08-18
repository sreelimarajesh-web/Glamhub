import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, select: false },
  passwordSalt: { type: String, select: false },
  roles: { type: [String], enum: ['customer', 'salon_owner'], required: true },
  provider: { type: String, enum: ['email', 'google'], default: 'email' },
  status: { type: String, enum: ['active', 'suspended', 'blocked'], default: 'active' },
}, { timestamps: true, versionKey: false });

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
