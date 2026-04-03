const connectToDatabase = require('../lib/mongodb');
const Booking = require('../models/Booking');
const { sendBookingAcceptedEmail } = require('../lib/email');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminhub';

function isWithinBookingWindow(isoDate) {
    const selected = new Date(`${isoDate}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    return selected >= today && selected <= maxDate;
}

function isValidThirtyMinuteSlot(time) {
    const [hours, minutes] = String(time).split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return false;
    }
    return minutes === 0 || minutes === 30;
}

function isAuthorizedAdmin(req) {
    const username = req.headers['x-admin-username'];
    const password = req.headers['x-admin-password'];
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

function parseJsonBody(body) {
    if (!body) {
        return {};
    }

    if (typeof body === 'string') {
        return JSON.parse(body);
    }

    if (Buffer.isBuffer(body)) {
        return JSON.parse(body.toString('utf8'));
    }

    if (typeof body === 'object') {
        return body;
    }

    return {};
}

function extractBookingAction(req) {
    const url = req.url || '';
    const match = url.match(/\/api\/bookings\/([^/]+)\/(accept|cancel)/);
    if (!match) {
        return { bookingId: null, action: null };
    }

    return {
        bookingId: match[1],
        action: match[2]
    };
}

module.exports = async (req, res) => {
    await connectToDatabase();

    if (req.method === 'POST') {
        try {
            const payload = parseJsonBody(req.body);
            const { name, email, date, time, service, notes = '' } = payload;

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
            if (error instanceof SyntaxError) {
                return res.status(400).json({ error: 'Invalid booking payload. Please refresh and try again.' });
            }
            return res.status(500).json({ error: 'Unable to save booking right now.' });
        }
    }

    if (req.method === 'GET') {
        if (!isAuthorizedAdmin(req)) {
            return res.status(401).json({ error: 'Unauthorized admin access.' });
        }

        try {
            const bookings = await Booking.find({}).sort({ createdAt: -1 }).lean();
            return res.status(200).json(bookings);
        } catch (error) {
            return res.status(500).json({ error: 'Unable to fetch bookings right now.' });
        }
    }

    if (req.method === 'PATCH') {
        if (!isAuthorizedAdmin(req)) {
            return res.status(401).json({ error: 'Unauthorized admin access.' });
        }

        try {
            const { bookingId, action } = extractBookingAction(req);
            const payload = parseJsonBody(req.body);

            if (!bookingId || !action) {
                return res.status(400).json({ error: 'Booking action is required.' });
            }

            if (action === 'accept') {
                const booking = await Booking.findById(bookingId);
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

                return res.status(200).json({ booking: booking.toObject(), email: emailResult });
            }

            const reason = String(payload.reason || '').trim();
            if (!reason) {
                return res.status(400).json({ error: 'Cancellation reason is required.' });
            }

            const booking = await Booking.findByIdAndUpdate(
                bookingId,
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

            return res.status(200).json(booking);
        } catch (error) {
            if (error instanceof SyntaxError) {
                return res.status(400).json({ error: 'Invalid update payload.' });
            }
            return res.status(500).json({ error: 'Unable to update booking right now.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed.' });
};
