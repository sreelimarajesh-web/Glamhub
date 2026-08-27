import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('customer selection controls routing for accounts with both roles', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(source, /if \(nextSession\.role === 'owner'\)/);
  assert.doesNotMatch(source, /if \(claims\.has\('SALON_OWNER'\)/);
  assert.match(source, /active\.activeRole === 'salon_owner' \? 'owner' : active\.activeRole === 'customer' \? 'customer'/);
});
