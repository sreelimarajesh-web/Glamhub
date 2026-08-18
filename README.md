# Zaya

Production-ready MVP scaffold for a Palakkad, Kerala salon booking and targeted marketing SaaS. V1 supports hybrid demo authentication, salon search, services, available-slot booking, walk-ins, an owner appointment calendar, WhatsApp confirmation links, and targeted offers.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Supabase

Apply the SQL files in `supabase/migrations/` in order. They create the relational booking schema, targeted marketing tables, indexes, subscription plans, RLS helper functions, RLS policies, and fictional Palakkad-area demo salon records.

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
- Browser email auth remains a local demo path. Production should connect both paths to Supabase Auth, validate roles server-side, and never persist raw passwords in application tables.

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

## MongoDB rollout — step 1: connection verification

MongoDB migration is intentionally staged. The current release only establishes and tests the shared MongoDB connection; the customer SPA continues using its existing data path and does **not** block startup on MongoDB. This prevents a database or serverless-route configuration error from taking down the public UI.

1. Set `MONGODB_URI` in the local `.env` file and in the Vercel project's Production, Preview, and Development environments.
2. Install dependencies and deploy.
3. Open `/api/health`. A successful connection returns HTTP `200` with `{"ok":true,"database":"mongodb","status":"connected"}`.
4. Missing configuration returns HTTP `503` with `status: "missing_configuration"`; an unreachable cluster or invalid credentials returns HTTP `503` with `status: "connection_failed"`.
5. In MongoDB Atlas, allow Vercel's network access before testing. No URI, credentials, host names, or raw driver errors are returned to the browser.

Only after this endpoint reports `connected` should accounts, bookings, and other features be migrated one collection at a time.

When using the Vercel MongoDB integration, redeploy after connecting the integration so its injected `MONGODB_URI` is available to the serverless function. The endpoint disables HTTP caching and reports `latencyMs`, so each request verifies the current deployment rather than returning an old CDN response. To verify from a development shell that has the same environment variable, run `npm run test:mongodb`; it performs both a ping and MongoDB `buildInfo` command, prints only non-secret connection metadata, then closes the process connection.
