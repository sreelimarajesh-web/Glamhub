require('dotenv').config();
const path = require('path');
const express = require('express');

const bookingsHandler = require('./api/bookings');
const healthHandler = require('./api/health');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.all('/api/bookings', (req, res) => bookingsHandler(req, res));
app.get('/api/health', (req, res) => healthHandler(req, res));

app.listen(PORT, () => {
    console.log(`GlamHub server running at http://localhost:${PORT}`);
});
