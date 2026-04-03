const connectToDatabase = require('../../../../lib/mongodb');
const Booking = require('../../../../models/Booking');
const { sendBookingAcceptedEmail } = require('../../../../lib/email');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminhub';

function isAuthorizedAdmin(req) {
    const username = req.headers['x-admin-username'];
    const password = req.headers['x-admin-password'];
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
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
        if (!bookingId) {
            return res.status(400).json({ error: 'Booking id is required.' });
        }

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
    } catch (error) {
        return res.status(500).json({ error: 'Unable to accept booking right now.' });
    }
};
