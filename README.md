# Zaya

Database-backed salon booking and targeted marketing application for salons and their customers. It supports secure account sessions, salon search, available-slot booking, walk-ins, an owner appointment calendar, WhatsApp links, offers, administration, keyboard shortcuts, and installable browser notifications.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Supabase

The SQL files in `supabase/migrations/` document an optional future Supabase deployment. The runnable Express application uses the MongoDB runtime described below and does not apply or seed these migrations.

Required browser-safe env when wiring the frontend to Supabase Auth:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The current browser MVP uses a single `src/app.js` implementation so there is no competing React/vanilla frontend conflict. Never expose Supabase service-role keys in the browser.

## Authentication adapters

- The public app supports two entry points: contextual authentication from **Book Now**, which preserves and resumes the booking draft, and a universal header login for Customer or Salon Owner access. The complete state machine and modal contract are documented in [`docs/AUTH_INTERACTION.md`](docs/AUTH_INTERACTION.md).
- Sign-in and Google signup render Google Identity Services directly inside the SPA authentication card, so one click opens Google without an intermediate Zaya login page.
- New users can open a dedicated Create account form; salon owners also provide their salon name and location.
- Manual email/password sign-in is available alongside Google, including a password-recovery affordance.
- One normalized email maps to one identity account, while `identity_roles` allows that account to hold Customer and Salon Owner roles without duplicate users.

### Vercel admin authentication

`vercel.json` maps `/admin/login` and `/admin/dashboard` to their static page shells, while the matching serverless functions under `api/admin/` provide login, session validation, and logout. The default login is username `admin` with password `infy@123`. A deployment can override these with `ADMIN_USERNAME` and `ADMIN_PASSWORD` (the legacy `ADMIN_EMAIL` variable is also accepted as the username).
- `/admin/login` is the public admin entry. The dashboard shell validates the signed, HTTP-only ADMIN session cookie through `/api/admin/session`, and protected admin data must remain behind server-side session checks.
- Customer and owner email authentication is handled by the Express server using scrypt password hashes and HTTP-only session cookies.

## V1 booking rules

- Customers book for themselves or a family member and pay at the salon.
- Only open slots are shown; staff conflicts, salon holidays, and blocked times are excluded.
- A chosen slot is held for five minutes. The database migration also rejects overlapping staff appointments.
- Owners can add walk-ins, confirm/reject bookings, set a cancellation cutoff, and mark completed/no-show visits.
- Customer confirmation uses WhatsApp click-to-chat; automated WhatsApp/SMS delivery needs provider credentials.

## External integrations left intentionally manual

- WhatsApp uses click-to-chat links in `src/app.js`; campaigns are tracked in-app first so the future WhatsApp Business API adapter can be added without changing the owner workflow.
- Online payment is intentionally not implemented; V1 uses pay at salon.
- Supabase Google provider settings and OAuth redirect URLs must be configured for production authentication.
- Override `ADMIN_USERNAME` and `ADMIN_PASSWORD` in production to replace the built-in admin credentials.

## Admin platform

The complete admin interface, routes, schema changes, tables, triggers, and row-level security policies are documented in [`docs/ADMIN_PLATFORM.md`](docs/ADMIN_PLATFORM.md).

## Database-backed runtime

The runnable application uses the MongoDB deployment configured by `MONGODB_URI`. It creates empty application-state, account, and expiring-session collections as real users register—no fictional salons, customers, or appointments are inserted. Customer and owner accounts use server-side scrypt password hashes and HTTP-only cookie sessions. All application mutations and admin changes are written through authenticated APIs with atomic optimistic revision checks; browser local/session storage is not used.

Configure `MONGODB_URI` as shown in `.env.example`. MongoDB TTL indexes automatically remove expired application sessions. The included manifest and service worker make the shell installable, while API requests remain network-only to prevent stale booking writes.
