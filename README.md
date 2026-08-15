# SalonMate

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
- Sign-in and Google signup render Google Identity Services directly inside the SPA authentication card, so one click opens Google without an intermediate SalonMate login page.
- New users can open a dedicated Create account form; salon owners also provide their salon name and location.
- Manual email/password sign-in is available alongside Google, including a password-recovery affordance.
- One normalized email maps to one identity account, while `identity_roles` allows that account to hold Customer and Salon Owner roles without duplicate users.
- `/admin/login` is the only public admin entry. `/admin/dashboard` and other `/admin/*` routes require a signed, HTTP-only ADMIN session cookie.
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
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a strong `ADMIN_SESSION_SECRET` are required for the restricted admin route.
