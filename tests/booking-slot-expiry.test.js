import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('confirmation back button returns to slot selection after a hold expires', () => {
  const handler = source.slice(source.indexOf('window.returnToSlotSelection'), source.indexOf('window.updateBookingDraft'));
  const confirmation = source.slice(source.indexOf('function booking()'), source.indexOf('window.confirmBooking'));

  assert.match(handler, /pending\.heldUntil <= Date\.now\(\)/);
  assert.match(handler, /Object\.assign\(pending, \{ time: '', heldUntil: 0 \}\)/);
  assert.match(handler, /pending\.step = 3/);
  assert.match(confirmation, /onclick="returnToSlotSelection\(\)"/);
});
