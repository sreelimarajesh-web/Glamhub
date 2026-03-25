const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminhub';

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI. Please add your MongoDB connection URL to environment variables.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    });

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

const Booking = mongoose.model('Booking', bookingSchema);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function isWithinBookingWindow(isoDate) {
    const selected = new Date(`${isoDate}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    return selected >= today && selected <= maxDate;
}

function isValidThirtyMinuteSlot(time) {
    const [hours, minutes] = time.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return false;
    }
    return minutes === 0 || minutes === 30;
}

function requireAdmin(req, res, next) {
    const username = req.header('x-admin-username');
    const password = req.header('x-admin-password');

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized admin access.' });
    }

    next();
}

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { name, email, date, time, service, notes = '' } = req.body;

        if (!name || !email || !date || !time || !service) {
            return res.status(400).json({ error: 'Please complete all required booking details.' });
        }

        if (!isWithinBookingWindow(date)) {
            return res.status(400).json({ error: 'Bookings can only be made from today up to the next 7 days.' });
        }

        if (!isValidThirtyMinuteSlot(time)) {
            return res.status(400).json({ error: 'Please select a time in 30-minute intervals.' });
        }

        const booking = await Booking.create({
            name: String(name).trim(),
            email: String(email).trim(),
            date,
            time,
            service,
            notes: String(notes).trim()
        });

        return res.status(201).json(booking);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to save booking right now.' });
    }
});

app.get('/api/bookings', requireAdmin, async (_req, res) => {
    try {
        const bookings = await Booking.find({}).sort({ createdAt: -1 }).lean();
        return res.json(bookings);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to fetch bookings right now.' });
    }
});

app.listen(PORT, () => {
    console.log(`GlamHub server running at http://localhost:${PORT}`);
});
