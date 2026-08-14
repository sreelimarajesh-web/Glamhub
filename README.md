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

- Customers see Google first, followed by WhatsApp OTP or an email magic link; SMS remains a secondary fallback.
- Shop owners use email/password with remember-me and password-reset affordances, while Google remains available.
- The local browser build simulates provider completion and clearly labels demo mode. Production should connect these actions to Supabase Google OAuth, email/password, magic-link, and phone-provider methods.

## V1 booking rules

- Customers book for themselves or a family member and pay at the salon.
- Only open slots are shown; staff conflicts, salon holidays, and blocked times are excluded.
- A chosen slot is held for five minutes. The database migration also rejects overlapping staff appointments.
- Owners can add walk-ins, confirm/reject bookings, set a cancellation cutoff, and mark completed/no-show visits.
- Customer confirmation uses WhatsApp click-to-chat; automated WhatsApp/SMS delivery needs provider credentials.

## External integrations left intentionally manual

- WhatsApp uses click-to-chat links in `src/app.js`; campaigns are tracked in-app first so the future WhatsApp Business API adapter can be added without changing the owner workflow.
- Online payment is intentionally not implemented; V1 uses pay at salon.
- Supabase email/SMS settings must be configured in the target Supabase project for production auth.
