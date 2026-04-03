const connectToDatabase = require('../../../../lib/mongodb');
const Booking = require('../../../../models/Booking');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminhub';

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

module.exports = async (req, res) => {
    await connectToDatabase();

    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized admin access.' });
    }

    try {
        const bookingId = req.query.id;
        const payload = parseJsonBody(req.body);
        const reason = String(payload.reason || '').trim();

        if (!bookingId) {
            return res.status(400).json({ error: 'Booking id is required.' });
        }

        if (!reason) {
            return res.status(400).json({ error: 'Cancellation reason is required.' });
        }

        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: new Date()
            },
            { new: true }
        ).lean();

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        return res.status(200).json(booking);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return res.status(400).json({ error: 'Invalid cancellation payload.' });
        }
        return res.status(500).json({ error: 'Unable to cancel booking right now.' });
    }
};
