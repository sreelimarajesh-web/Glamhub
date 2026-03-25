const connectToDatabase = require('../lib/mongodb');

module.exports = async (_req, res) => {
    try {
        await connectToDatabase();
        return res.status(200).json({ ok: true });
    } catch (error) {
        return res.status(500).json({ ok: false, error: 'Database connection failed.' });
    }
};
