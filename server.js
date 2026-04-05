const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const { sendBookingAcceptedEmail } = require('./lib/email');
const { OAuth2Client } = require('google-auth-library');

function loadDotEnvFile() {
    const envFilePath = path.join(__dirname, '.env');

    if (!fs.existsSync(envFilePath)) {
        return;
    }

    const envContents = fs.readFileSync(envFilePath, 'utf8');
    const lines = envContents.split(/\r?\n/);

    lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            return;
        }

        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex <= 0) {
            return;
        }

        const key = trimmedLine.slice(0, separatorIndex).trim();
        const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
        const unquotedValue = rawValue.replace(/^(['"])(.*)\1$/, '$2');

        if (!process.env[key]) {
            process.env[key] = unquotedValue;
        }
    });
}

loadDotEnvFile();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminhub';
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const googleClient = GOOGLE_OAUTH_CLIENT_ID ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID) : null;

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
    notes: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'accepted', 'cancelled'], default: 'active' },
    cancellationReason: { type: String, default: '', trim: true },
    cancelledAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null }
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

function getIdTokenFromRequest(req) {
    const authHeader = req.header('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }

    return req.body.idToken || '';
}

async function verifyGoogleIdToken(idToken) {
    if (!GOOGLE_OAUTH_CLIENT_ID) {
        return { ok: false, error: 'Google sign-in is not configured on server.' };
    }

    if (!idToken) {
        return { ok: false, error: 'Google sign-in is required before booking.' };
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: GOOGLE_OAUTH_CLIENT_ID
        });

        const payload = ticket.getPayload() || {};
        if (!payload.email || !payload.email_verified) {
            return { ok: false, error: 'Verified Gmail account is required for booking.' };
        }

        return {
            ok: true,
            profile: {
                email: payload.email,
                name: payload.name || ''
            }
        };
    } catch (error) {
        return { ok: false, error: 'Invalid Google sign-in session. Please sign in again.' };
    }
}

async function requireUser(req, res, next) {
    const idToken = getIdTokenFromRequest(req);
    const authResult = await verifyGoogleIdToken(idToken);

    if (!authResult.ok) {
        return res.status(401).json({ error: authResult.error });
    }

    req.user = authResult.profile;
    return next();
}

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { name, date, time, service, notes = '' } = req.body;
        const authResult = await verifyGoogleIdToken(getIdTokenFromRequest(req));

        if (!authResult.ok) {
            return res.status(401).json({ error: authResult.error });
        }

        const authenticatedEmail = authResult.profile.email;

        if (!name || !authenticatedEmail || !date || !time || !service) {
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
            email: String(authenticatedEmail).trim(),
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

app.get('/api/my-bookings', requireUser, async (req, res) => {
    try {
        const bookings = await Booking.find({ email: req.user.email }).sort({ createdAt: -1 }).lean();
        return res.json(bookings);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to fetch your bookings right now.' });
    }
});

app.patch('/api/my-bookings/:id/reschedule', requireUser, async (req, res) => {
    try {
        const { date, time } = req.body;

        if (!date || !time) {
            return res.status(400).json({ error: 'Date and time are required for reschedule.' });
        }

        if (!isWithinBookingWindow(date)) {
            return res.status(400).json({ error: 'Bookings can only be rescheduled from today up to the next 7 days.' });
        }

        if (!isValidThirtyMinuteSlot(time)) {
            return res.status(400).json({ error: 'Please select a time in 30-minute intervals.' });
        }

        const booking = await Booking.findOne({ _id: req.params.id, email: req.user.email });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ error: 'Cancelled booking cannot be rescheduled.' });
        }

        booking.date = date;
        booking.time = time;
        booking.status = 'active';
        booking.acceptedAt = null;
        await booking.save();

        return res.json(booking);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to reschedule booking right now.' });
    }
});

app.patch('/api/my-bookings/:id/cancel', requireUser, async (req, res) => {
    try {
        const reason = String(req.body.reason || 'Cancelled by customer').trim();

        const booking = await Booking.findOneAndUpdate(
            { _id: req.params.id, email: req.user.email },
            {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: new Date(),
                acceptedAt: null
            },
            { new: true }
        ).lean();

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        return res.json(booking);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to cancel booking right now.' });
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

app.patch('/api/bookings/:id/accept', requireAdmin, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ error: 'Cancelled booking cannot be accepted.' });
        }

        booking.status = 'accepted';
        booking.acceptedAt = new Date();
        booking.cancellationReason = '';
        booking.cancelledAt = null;
        await booking.save();

        const emailResult = await sendBookingAcceptedEmail({
            to: booking.email,
            name: booking.name,
            service: booking.service,
            date: booking.date,
            time: booking.time
        });

        return res.json({ booking: booking.toObject(), email: emailResult });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to accept booking right now.' });
    }
});

app.patch('/api/bookings/:id/cancel', requireAdmin, async (req, res) => {
    try {
        const reason = String(req.body.reason || '').trim();

        if (!reason) {
            return res.status(400).json({ error: 'Cancellation reason is required.' });
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: new Date(),
                acceptedAt: null
            },
            { new: true }
        ).lean();

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        return res.json(booking);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to cancel booking right now.' });
    }
});

app.listen(PORT, () => {
    console.log(`GlamHub server running at http://localhost:${PORT}`);
});
