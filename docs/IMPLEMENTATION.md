# SalonMate MVP implementation notes

## Database tables created

users, salons, salon_users, staff, services, staff_services, customers, appointments, appointment_services, sales, payments, offers, memberships, membership_plans, message_templates, messages, subscriptions, subscription_plans, salon_settings, working_hours.

## Routes created

The single-page app exposes role-specific screens for customers, salon owners, staff, and super admins. Customers see salon listing and booking views; owners see dashboard, bookings, customers, services, staff, offers, sales, memberships, and settings; staff see assigned schedule, appointments, and basic customer information; super admins see platform admin and salon listing views. The Express server also exposes `/api/health` and falls all direct routes back to the SPA.

## Authentication flow

The Supabase schema is designed for Supabase Authentication. Owner signup should create an `auth.users` account, then a `users` row, `salons` row, and `salon_users` owner row. Staff accounts are linked through `salon_users` with role `staff`; super admins are users with role `super_admin`. Customer-facing booking can remain app-less and browser-based in V1.

## RLS policies

RLS is enabled on every app table. `is_super_admin()` permits platform-level access. `has_salon_access(salon_id)` scopes owners and staff to only salons where they have an active `salon_users` membership. Public read policies are limited to active salon/service/offer data needed for salon listing and public booking pages.

## Remaining external credentials

- Supabase project URL and anon key.
- Supabase SMTP/OTP settings for production authentication.
- WhatsApp Business API credentials for automated messaging in V2.
- Razorpay or Stripe keys for subscription payments in V2.

## Intentionally left for V2

Native mobile apps, AI chatbot, inventory, payroll, accounting/GST, advanced CRM, franchise management, payment gateway automation, and automated WhatsApp Business API sending.
