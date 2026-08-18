import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Google identity fields and salon business fields are stored separately', async () => {
  const [account, salon, oauth, client] = await Promise.all([
    readFile(new URL('../models/Account.js', import.meta.url), 'utf8'),
    readFile(new URL('../models/Salon.js', import.meta.url), 'utf8'),
    readFile(new URL('../lib/auth-handlers/google.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(account, /ownerName/);
  assert.doesNotMatch(account, /salonName/);
  assert.match(salon, /ownerId/);
  assert.match(salon, /salonName/);
  assert.match(oauth, /ownerName: profile\.name/);
  assert.doesNotMatch(oauth, /salonName: profile\.name/);
  assert.match(client, /business = \{ salonName:/);
  assert.match(client, /session\?\.ownerName/);
  assert.match(client, /db\.salons = db\.salons\.filter/);
  assert.match(salon, /salonNameConfirmed/);
  assert.doesNotMatch(client, /`\$\{account\.name \|\| 'My'\} Salon`/);
});
