# SalonMate

Production-ready MVP scaffold for a Palakkad, Kerala salon management SaaS. The app is Supabase/PostgreSQL-ready, includes role-specific screens for customers, salon owners, staff, and super admins, and keeps V1 focused on fast WhatsApp-to-confirmed-appointment workflows.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Supabase

Apply `supabase/migrations/202608110001_salonmate_mvp.sql` in a Supabase project. It creates the relational schema, indexes, subscription plans, RLS helper functions, RLS policies, and fictional Palakkad-area demo salon records.

Required browser-safe env when wiring the frontend to Supabase Auth:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The current browser MVP uses a single `src/app.js` implementation so there is no competing React/vanilla frontend conflict. Never expose Supabase service-role keys in the browser.

## V1 external integrations left intentionally manual

- WhatsApp uses click-to-chat links in `src/app.js`; keep that click-to-chat boundary separate when adding the future WhatsApp Business API adapter.
- Payment gateway is not implemented. Super Admin can manually change subscription records until Razorpay/Stripe is added.
- Supabase email/SMS settings must be configured in the target Supabase project for production auth.
