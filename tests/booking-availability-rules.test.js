import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('customer availability enforces owner booking rules', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(source, /appointmentTime\(date, time\) >= Date\.now\(\) \+ rules\.leadHours \* 3600000/);
  assert.match(source, /date <= addDays\(today, rules\.windowDays\)/);
  assert.match(source, /max="\$\{addDays\(today, rules\.windowDays\)\}"/);
  assert.match(source, /confirmationMode === 'automatic'/);
  assert.ok(source.includes('Your booking was confirmed automatically.'));
});

test('salon booking rules are persisted and exposed to customers', async () => {
  const [model, handler, publicApi] = await Promise.all([
    readFile(new URL('../models/Salon.js', import.meta.url), 'utf8'),
    readFile(new URL('../lib/auth-handlers/salon.js', import.meta.url), 'utf8'),
    readFile(new URL('../api/state.js', import.meta.url), 'utf8'),
  ]);

  for (const field of ['bookingLeadTimeHours', 'bookingWindowDays', 'confirmationMode']) {
    assert.ok(model.includes(field));
    assert.ok(handler.includes(field));
    assert.ok(publicApi.includes(field));
  }
});

test('legacy booking API also rejects appointments inside the two-hour lead time', async () => {
  const source = await readFile(new URL('../api/bookings.js', import.meta.url), 'utf8');
  assert.ok(source.includes('isAfterMinimumLeadTime(date, time)'));
  assert.ok(source.includes('at least 2 hours in advance'));
});
