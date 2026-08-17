# Zaya admin platform implementation

The admin workspace is available at `/admin/dashboard` after authentication at `/admin/login`. It reads and writes the same MongoDB application database as the customer and owner application through protected admin APIs. Changes use revision checks and important moderation actions are audited. The optional Supabase data contract is defined by `202608160001_admin_platform.sql`.

## Interface files

| File | Responsibility |
| --- | --- |
| `admin-dashboard.html` | Authenticated responsive admin shell, sidebar, loading state, modal and toast hosts. |
| `css/admin-dashboard.css` | Desktop/tablet/mobile sidebar, reusable panels, tables, badges, forms, dialogs, loading and empty states. |
| `js/admin-dashboard.js` | Dashboard metrics and all salon, user, booking, category, offer, complaint, notification and settings workflows; live database data; validations; confirmations; audit records. |
| `js/admin-auth.js` | Login/session/logout client and redirect on an invalid admin session. |
| `src/app.js` | Customer discovery and booking eligibility enforcement for approved, active, non-suspended salons. |
| `tests/admin-auth.test.js` | Admin success and logout coverage plus Customer, Salon Owner, missing-session and tampered-cookie rejection coverage. |

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/admin/login` | Public | Admin credential form. |
| `/admin/dashboard` | Admin shell; validates session before rendering | Dashboard and hash-routed admin sections. |
| `/admin/dashboard#/dashboard` | Admin | Overview and recent activity. |
| `/admin/dashboard#/salons` | Admin | Salon review and status management. |
| `/admin/dashboard#/users` | Admin | Customer and owner account status. |
| `/admin/dashboard#/bookings` | Admin | Cross-salon booking administration. |
| `/admin/dashboard#/categories` | Admin | Global service categories. |
| `/admin/dashboard#/offers` | Admin | Platform and salon offers. |
| `/admin/dashboard#/complaints` | Admin | Complaints and reported reviews. |
| `/admin/dashboard#/notifications` | Admin | In-app announcements. |
| `/admin/dashboard#/settings` | Admin | Platform configuration. |
| `POST /api/admin/login` | Public credentials | Creates the signed HTTP-only cookie. |
| `GET /api/admin/session` | Admin | Validates the signed cookie and ADMIN role. |
| `POST /api/admin/logout` | Admin/browser | Clears the cookie. |

## Database changes

Migration: `supabase/migrations/202608160001_admin_platform.sql`.

### Modified tables

- `users`: `account_status`, status reason/change metadata, and soft-deletion timestamp. Existing `role` is preserved.
- `identity_accounts`: account status.
- `customers`: link to the canonical authenticated account.
- `salons`: approval status, rejection and suspension reasons, reviewing admin/timestamp, documents, account status, and soft deletion.
- `appointments`: admin cancellation reason, changing admin/timestamp, and soft deletion.
- `offers`: approval fields, minimum booking value, usage limits/count, scheduling, review metadata, and soft deletion.
- `services`: approved global category reference.

### Created tables

- `service_categories`: ordered, active/inactive platform categories.
- `admin_actions`: immutable audit event with admin, action, record, old/new JSON, reason, IP and timestamp.
- `complaints`: complaint/reported-review workflow, internal notes, hidden flag and resolution metadata.
- `platform_notifications`: targeted announcements and status notifications.
- `notification_receipts`: per-account delivery/read state.
- `offer_approvals`: retained offer review history.
- `platform_settings`: platform identity, support, booking rules, cancellation window, INR, Asia/Kolkata and future commission percentage.

## Database enforcement and policies

- `salons_sync_booking_eligibility` derives the legacy `active` flag from approval/account/soft-delete status and requires rejection and suspension reasons.
- `appointments_require_eligible_salon` rejects new bookings for pending, rejected, suspended, inactive or deleted salons.
- `offers_validate_activation` prevents unapproved, not-yet-started, expired or exhausted offers from becoming active.
- `admin_actions_immutable` rejects every update or delete to an audit event.
- `public_approved_active_salons` exposes only approved and active salons, while retaining owner/admin access through `has_salon_access`.
- `offers_eligible_read` exposes only approved, active, in-date, under-limit offers.
- Admin-only policies manage categories, audit inserts, notifications, offer approvals and settings through `is_super_admin()`.
- Complaint policies let customers create/read their cases, salon owners read cases for their own salon, and admins moderate them.
- Notification policies restrict reads to the addressed account, salon, receipt, or an admin.
- `appointments_customer_read` limits customer appointment reads to the authenticated account link.
- Existing `has_salon_access` policies continue to restrict salon owners to salons assigned through `salon_users`.

Important business records use status fields and `soft_deleted_at`; the admin UI never permanently deletes salons, users, bookings, offers, complaints or audit events.
