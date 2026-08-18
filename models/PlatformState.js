import mongoose from 'mongoose';

// The legacy MVP is a document-shaped application. Keeping the document in MongoDB
// is an intermediate persistence boundary; collection-by-collection extraction can
// now happen without retaining browser databases as a second source of truth.
const platformStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'primary' },
  revision: { type: Number, required: true, default: 0 },
  app: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
  admin: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
}, { timestamps: true, minimize: false, versionKey: false });

export const PlatformState = mongoose.models.PlatformState || mongoose.model('PlatformState', platformStateSchema);
