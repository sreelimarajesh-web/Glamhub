import assert from 'node:assert/strict';
import test from 'node:test';
import { publicSalonCatalog, publicSalons } from '../api/state.js';

const salons = [
  { _id: 'salon-active', ownerId: 'owner-active' },
  { _id: 'salon-suspended', ownerId: 'owner-suspended' },
  { _id: 'salon-blocked-owner', ownerId: 'owner-blocked' },
];

test('public salon discovery excludes suspended salons and inactive owner accounts', () => {
  const activeOwnerIds = new Set(['owner-active', 'owner-suspended']);
  const moderation = [
    { id: 'salon-active', ownerId: 'owner-active', accountStatus: 'active', active: true },
    { id: 'salon-suspended', ownerId: 'owner-suspended', accountStatus: 'suspended', suspended: true },
  ];

  assert.deepEqual(publicSalons(salons, activeOwnerIds, moderation), [salons[0]]);
});

test('public salon discovery recognizes suspension records by owner id', () => {
  const activeOwnerIds = new Set(['owner-active']);
  const moderation = [{ id: 'legacy-id', ownerId: 'owner-active', active: false }];

  assert.deepEqual(publicSalons([salons[0]], activeOwnerIds, moderation), []);
});

test('public salon catalog exposes booking details only for visible salons', () => {
  const app = {
    services: [
      { id: 'service-visible', salonId: 'salon-active', name: 'Haircut', price: 500, duration: 30, active: true, privateNote: 'hide me' },
      { id: 'service-hidden', salonId: 'salon-hidden', name: 'Facial', active: true },
    ],
    staff: [{ id: 'staff-visible', salonId: 'salon-active', name: 'Asha', available: true, mobile: 'private' }],
    offers: [{ id: 'offer-visible', salonId: 'salon-active', title: 'Welcome', description: 'New customer saving', terms: 'One per customer', discount: 10, active: true, clicks: 99 }],
    platformOffers: [
      { id: 'platform-all', salonId: 'all', title: 'App special', status: 'active', internalNote: 'hide me' },
      { id: 'platform-hidden', salonId: 'salon-hidden', title: 'Hidden salon offer', status: 'active' },
    ],
  };

  const catalog = publicSalonCatalog(app, new Set(['salon-active']));
  assert.deepEqual(catalog.services, [{ id: 'service-visible', salonId: 'salon-active', name: 'Haircut', category: undefined, price: 500, duration: 30, active: true }]);
  assert.equal(catalog.staff.length, 1);
  assert.equal(catalog.staff[0].mobile, undefined);
  assert.equal(catalog.offers.length, 1);
  assert.equal(catalog.offers[0].description, 'New customer saving');
  assert.equal(catalog.offers[0].terms, 'One per customer');
  assert.equal(catalog.offers[0].clicks, undefined);
  assert.equal(catalog.platformOffers.length, 1);
  assert.equal(catalog.platformOffers[0].title, 'App special');
  assert.equal(catalog.platformOffers[0].internalNote, undefined);
});
