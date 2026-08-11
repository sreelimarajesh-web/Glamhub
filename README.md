# SalonMate

Production-ready MVP scaffold for a Palakkad, Kerala salon management SaaS. The app is Supabase/PostgreSQL-ready and keeps V1 focused on fast WhatsApp-to-confirmed-appointment workflows.

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

Never expose Supabase service-role keys in the browser.

## V1 external integrations left intentionally manual

- WhatsApp uses click-to-chat links. The `src/lib/whatsapp.ts` adapter is the future boundary for WhatsApp Business API.
- Payment gateway is not implemented. Super Admin can manually change subscription records until Razorpay/Stripe is added.
- Supabase email/SMS settings must be configured in the target Supabase project for production auth.
