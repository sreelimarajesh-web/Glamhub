# GlamHub

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template and add your MongoDB URL:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and set `MONGODB_URI` to your private MongoDB connection string.
4. Start the app:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000`.

## MongoDB storage

- Booking submissions are stored in MongoDB via `POST /api/bookings`.
- Admin-only booking list is fetched from MongoDB via `GET /api/bookings`.
- Admin auth headers used by the frontend:
  - `x-admin-username`
  - `x-admin-password`

## Security

- Never commit `.env` with real credentials.
- `.env` is gitignored; use `.env.example` as a template.
