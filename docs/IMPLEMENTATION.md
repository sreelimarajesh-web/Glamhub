# SalonMate targeted marketing MVP implementation notes

## Database tables created

Core SaaS tables: users, customers, salons, salon_users, staff, services, staff_services, appointments, appointment_services, sales, payments, offers, memberships, membership_plans, message_templates, messages, subscriptions, subscription_plans, salon_settings, working_hours.

Marketing extension tables: customer_visits, customer_segments, campaigns, campaign_recipients, offer_redemptions, favorites, reviews, notifications.

## Routes / screens created

The single-page app exposes role-specific screens for customers, salon owners, and admins. Customers get registration, home, explore/salon listing, salon profile, booking, my bookings, my offers, and profile. Salon owners get dashboard, bookings, customer CRM, segments, targeted offers, marketing campaigns, and settings. Admins get platform dashboard, salons, customers, bookings, campaigns, and settings.

## Authentication flow

The Supabase schema is designed for Supabase Authentication with roles CUSTOMER, SALON_OWNER, and ADMIN. Customer registration uses mobile number as the primary customer identifier. Owner signup should create an `auth.users` account, then a `users` row, `salons` row, and `salon_users` owner row. Customer-facing booking remains browser-based in V1.

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

AI recommendations, loyalty points, payment gateway automation, automated WhatsApp Business API sending, gift cards, salon chains/branches, advanced analytics, Malayalam translation files, and staff mobile applications.
