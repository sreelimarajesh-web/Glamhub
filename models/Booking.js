const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    service: { type: String, required: true },
    notes: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'accepted', 'cancelled'], default: 'active' },
    cancellationReason: { type: String, default: '', trim: true },
    cancelledAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null }
}, {
    timestamps: true
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
