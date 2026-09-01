# P0 security migration

The legacy CommonJS `/api/bookings` functions and header-based administrator authentication were removed. The SPA compatibility `/api/state` route is deprecated: public callers receive only the moderated catalog, users receive only records owned by the currently active database account/customer/salon, and only a signed administrator session can receive global state. Body-supplied ownership and role values never establish scope.

Deploy MongoDB schema/index changes before application code, configure all variables described in the README for each Vercel environment, then deploy Preview and run the smoke and two-account tenant tests before promoting. Older cookies become unusable after `SESSION_SECRET` rotation.
