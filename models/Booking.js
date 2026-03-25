const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    service: { type: String, required: true },
    notes: { type: String, default: '', trim: true }
}, {
    timestamps: true
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
