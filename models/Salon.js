import mongoose from 'mongoose';

const salonSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  salonName: { type: String, trim: true, default: null },
  // Only an explicit business-form submission may confirm a salon name.
  salonNameConfirmed: { type: Boolean, default: false },
  phone: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  town: { type: String, trim: true, default: '' },
  openingHours: { type: String, trim: true, default: '' },
  whatsappNumber: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  image: { type: String, default: '' },
}, { timestamps: true, versionKey: false });

// One salon per owner today. Removing this unique index later permits a 1:N model.
salonSchema.index({ ownerId: 1 }, { unique: true });

export const Salon = mongoose.models.Salon || mongoose.model('Salon', salonSchema);
