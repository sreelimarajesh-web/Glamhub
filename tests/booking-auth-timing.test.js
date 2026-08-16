import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('booking authentication is deferred until confirmation', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const start = source.slice(source.indexOf('window.startBooking ='), source.indexOf('window.startWalkIn ='));
  const confirm = source.slice(source.indexOf('window.confirmBooking ='), source.indexOf('function myBookings()'));
  assert.ok(start.includes("db.route = 'book'"), 'Book Now must open the booking editor');
  assert.ok(!start.includes("trigger: 'booking'"), 'Book Now must not open login');
  assert.ok(confirm.includes("trigger: 'booking'"), 'Confirm must open contextual login when signed out');
  assert.ok(confirm.includes("sessionStorage.setItem(bookingDraftKey"), 'Confirm must preserve the completed draft');
  assert.match(source, /publicRoutes = \[[^\]]*'book'/, 'signed-out users must be able to choose a slot');
});
