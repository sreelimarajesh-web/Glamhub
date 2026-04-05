# GlamHub

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template and add your MongoDB URL + Google OAuth credentials:
   ```bash
   cp .env.example .env
   ```
3. Start the app:
   ```bash
   export $(cat .env | xargs) && npm start
   ```
4. Open `http://localhost:3000`.
5. In `index.html`, set your browser client id before `js/app.js` loads:
   ```html
   <script>
     window.GOOGLE_OAUTH_CLIENT_ID = '72416329561-c4enbj103esjlb1v7h5fbg6eb0vgi1oc.apps.googleusercontent.com';
   </script>
   ```

## MongoDB storage

- Booking submissions are stored in MongoDB via `POST /api/bookings`.
- Booking submission now requires a valid Google Sign-In ID token.
- Admin-only booking list is fetched from MongoDB via `GET /api/bookings`.
- Admin auth headers used by the frontend:
  - `x-admin-username`
  - `x-admin-password`
