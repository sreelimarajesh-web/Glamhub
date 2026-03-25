const connectToDatabase = require('../lib/mongodb');
const Booking = require('../models/Booking');

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

module.exports = async (req, res) => {
    try {
        await connectToDatabase();

        if (req.method === 'POST') {
            const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const { name, email, date, time, service, notes = '' } = parsedBody;

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
        }

        if (req.method === 'GET') {
            if (!isAuthorizedAdmin(req)) {
                return res.status(401).json({ error: 'Unauthorized admin access.' });
            }

            const bookings = await Booking.find({}).sort({ createdAt: -1 }).lean();
            return res.status(200).json(bookings);
        }

        return res.status(405).json({ error: 'Method not allowed.' });
    } catch (error) {
        return res.status(500).json({
            error: 'Booking service unavailable.',
            details: error.message
        });
    }
};
