# SalonMate

Production-ready MVP scaffold for a Palakkad, Kerala salon booking and targeted marketing SaaS. The app is Supabase/PostgreSQL-ready, includes role-specific screens for customers, salon owners, and admins, and focuses V1 on the core loop: right offer → right customer → right time.

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

## V1 external integrations left intentionally manual

- WhatsApp uses click-to-chat links in `src/app.js`; campaigns are tracked in-app first so the future WhatsApp Business API adapter can be added without changing the owner workflow.
- Payment gateway is not implemented. Super Admin can manually change subscription records until Razorpay/Stripe is added.
- Supabase email/SMS settings must be configured in the target Supabase project for production auth.
