# SalonMate targeted marketing MVP implementation notes

## Database tables created

Core SaaS tables: users, customers, salons, salon_users, staff, services, staff_services, appointments, appointment_services, offers, message_templates, messages, salon_settings, working_hours, salon_closures, and slot_holds. Legacy sales/subscription tables remain in the initial migration but are not exposed in the focused V1 UI.

Marketing extension tables: customer_visits, customer_segments, campaigns, campaign_recipients, offer_redemptions, favorites, reviews, notifications.

## Routes / screens created

The single-page app exposes role-specific screens for customers, salon owners, and admins. Customers get OTP access, simple salon discovery, salon details, booking for self/family, booking activity, offers, and profile. Owners get a daily/upcoming appointment calendar, walk-in entry, customer CRM, offers/marketing, and one consolidated salon setup screen. Admins get reports plus salon, account, booking, offer-rule, and app-banner controls.

## Authentication flow

The browser demo offers role-aware hybrid authentication without pretending to contact an external provider. Customers can simulate Google, WhatsApp OTP (`123456`), email magic link, or secondary SMS OTP; owners can simulate email/password with remember-me and reset affordances or Google. Production should replace these local adapters with Supabase Google OAuth, email/password, magic-link, and supported WhatsApp/SMS delivery. Customer registration uses mobile as the primary identifier. Owner signup should create an `auth.users` account, then `users`, `salons`, and `salon_users` rows.

## Booking safeguards

The UI removes booked, held, holiday, and owner-blocked slots; automatically assigns an available staff member when requested; and applies the salon cancellation cutoff. Slot holds expire after five minutes. The hardening migration adds durable holds/closures and a trigger that rejects overlapping appointment time ranges, so tenant safety does not depend on the browser.

## RLS policies

RLS is enabled on every app table. `is_super_admin()` permits platform-level access. `has_salon_access(salon_id)` scopes salon owners to only their own salon data. Public read policies are limited to active discovery data, while marketing tables such as campaigns, recipients, segments, and redemptions are salon-scoped.

## Marketing loop supported

The MVP demonstrates: customer books a facial, customer becomes eligible for an inactive-facial segment after 60 days, owner creates a come-back offer, owner sends a campaign, customer receives the offer, customer books from the offer, and campaign metrics track targeted, sent, views, clicks, bookings, redemptions, and revenue.

## Remaining external credentials

- Supabase project URL and anon key.
- Supabase SMTP/OTP settings for production authentication.
- WhatsApp Business API credentials for automated messaging in V2.
- SMS/email provider credentials for later channels.
- Razorpay or Stripe keys for subscription payments in V2.

## Intentionally left for V2

Memberships, loyalty points, in-app chat, online payments, AI recommendations, automated WhatsApp Business API sending, gift cards, salon chains/branches, advanced analytics, Malayalam translation files, and staff mobile applications.
