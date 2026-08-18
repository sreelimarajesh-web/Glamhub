# MongoDB persistence and browser-storage boundaries

MongoDB is the system of record for customer, salon-owner, and administrator data. The browser is not a database and is not an authentication authority.

## Runtime boundaries

- `Account` stores normalized identities, roles, status, and server-side `scrypt` password material. Password hashes are never returned to the browser.
- `PlatformState` is the compatibility aggregate for the existing document-shaped MVP. It has an optimistic `revision`, preventing silent last-writer-wins updates. This is an intentional migration seam: bookings, salons, customers, offers, and campaigns can be extracted into dedicated collections without changing the browser contract at once.
- `/api/auth/*` creates and validates signed, HTTP-only cookies. Customer and owner sessions therefore survive navigation without readable tokens in local or session storage.
- `/api/state` requires a valid customer/owner or administrator cookie. Administrator writes can update the platform state; customer and owner writes are filtered to records owned by their account or salon.

## Browser storage policy

- `localStorage` must not contain accounts, passwords, customers, bookings, owner data, or admin data.
- `sessionStorage` is limited to transient OAuth correlation and an unfinished booking draft. These values are not trusted for authorization and expire when the tab closes.
- Route, selected salon, and slot-hold UI state are deliberately excluded from MongoDB snapshots. A future slot-reservation collection should provide atomic, TTL-backed holds before scaling booking traffic horizontally.

## Next extraction sequence

1. Extract bookings and TTL slot holds, adding a unique partial index for active staff/date/time reservations.
2. Extract salons, services, and staff with owner-scoped repository methods.
3. Extract CRM/customer profiles and marketing entities.
4. Replace the compatibility state endpoint with task-oriented commands and projections, then remove `PlatformState`.
