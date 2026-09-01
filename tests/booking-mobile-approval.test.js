import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('appointment confirmation requires and persists a mobile number', async () => {
  const client = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(client, /Mobile number <small>\(required\)<\/small>/);
  assert.match(client, /if \(!pending\.guestMobile\)/);
  assert.match(client, /customer\.mobile = pending\.guestMobile\.trim\(\)/);
});

test('new owner salons enter the admin queue inactive and pending', async () => {
  const [handler, client, migration] = await Promise.all([
    readFile(new URL('../lib/auth-handlers/salon.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/202608220001_inactive_salon_registration.sql', import.meta.url), 'utf8'),
  ]);

  assert.match(handler, /approvalStatus: 'pending', accountStatus: 'inactive', active: false/);
  assert.match(client, /approved: item\.approvalStatus === 'approved'/);
  assert.match(migration, /alter column active set default false/);
});
