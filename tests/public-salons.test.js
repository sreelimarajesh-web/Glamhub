import assert from 'node:assert/strict';
import test from 'node:test';
import { publicSalons } from '../api/state.js';

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
