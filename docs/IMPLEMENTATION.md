# Zaya targeted marketing MVP implementation notes

## Database tables created

Core SaaS tables: identity_accounts, identity_roles, users, customers, salons, salon_users, staff, services, staff_services, appointments, appointment_services, offers, message_templates, messages, salon_settings, working_hours, salon_closures, and slot_holds. `identity_accounts` is the canonical one-email/one-user identity; `identity_roles` supplies multi-role membership. Legacy sales/subscription tables remain in the initial migration but are not exposed in the focused V1 UI.

Marketing extension tables: customer_visits, customer_segments, campaigns, campaign_recipients, offer_redemptions, favorites, reviews, notifications.

## Routes / screens created

The single-page app exposes role-specific screens for customers and salon owners. Customers get Google or manual sign-in, salon discovery, salon details, booking for self/family, booking activity, offers, and profile. Owners get a daily/upcoming appointment calendar, walk-in entry, customer CRM, offers/marketing, and one consolidated salon setup screen. Admin authentication is isolated at `/admin/login`; the server protects `/admin/dashboard` and all other `/admin/*` routes with ADMIN RBAC middleware.

## Authentication flow

The SPA renders Google and manual email/password sign-in in both role contexts. Signup normalizes email before enforcing uniqueness and returns “An account with this email already exists. Please sign in instead.” for duplicates. A single identity owns a role array locally and `identity_roles` in Supabase. Owner signup requires salon name/location. Production should delegate credentials to Supabase Auth, verify Google tokens server-side, call `register_current_identity`, and create salon tenancy for a new `SALON_OWNER` role.

## Booking safeguards

The UI removes booked, held, holiday, and owner-blocked slots; automatically assigns an available staff member when requested; and applies the salon cancellation cutoff. Slot holds expire after five minutes. The hardening migration adds durable holds/closures and a trigger that rejects overlapping appointment time ranges, so tenant safety does not depend on the browser.

## RLS policies

RLS is enabled on every app table. Identity accounts and role memberships are self-readable, ADMIN assignment is blocked from self-registration, `is_super_admin()` permits platform-level access, and `has_salon_access(salon_id)` scopes salon owners to only their own salon data. Public read policies are limited to active discovery data, while marketing tables such as campaigns, recipients, segments, and redemptions are salon-scoped.

## Marketing loop supported

The MVP demonstrates: customer books a facial, customer becomes eligible for an inactive-facial segment after 60 days, owner creates a come-back offer, owner sends a campaign, customer receives the offer, customer books from the offer, and campaign metrics track targeted, sent, views, clicks, bookings, redemptions, and revenue.

## Remaining external credentials

- Supabase project URL and anon key.
- Supabase Google OAuth credentials and redirect configuration.
- WhatsApp Business API credentials for automated messaging in V2.
- SMS/email provider credentials for later channels.
- Razorpay or Stripe keys for subscription payments in V2.

## Intentionally left for V2

Memberships, loyalty points, in-app chat, online payments, AI recommendations, automated WhatsApp Business API sending, gift cards, salon chains/branches, advanced analytics, Malayalam translation files, and staff mobile applications.
