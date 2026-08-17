import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('booking authentication is deferred and the draft remains in memory', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const start = source.slice(source.indexOf('window.startBooking ='), source.indexOf('window.startWalkIn ='));
  const confirm = source.slice(source.indexOf('window.confirmBooking ='), source.indexOf('function myBookings()'));
  assert.ok(start.includes("db.route = 'book'"), 'Book Now must open the booking editor');
  assert.ok(!start.includes("trigger: 'booking'"), 'Book Now must not open login');
  assert.ok(confirm.includes("trigger: 'booking'"), 'Confirm must open contextual login when signed out');
  assert.doesNotMatch(source, /localStorage|sessionStorage/, 'the active app must not persist data in browser storage');
  assert.match(source, /fetch\('\/api\/app\/state'/, 'mutations must be persisted through the database API');
});


test('runtime persistence uses MongoDB rather than an embedded browser or SQLite store', async () => {
  const database = await readFile(new URL('../lib/app-database.js', import.meta.url), 'utf8');
  assert.match(database, /mongoose\.connect\(mongoUri/);
  assert.match(database, /MONGODB_URI/);
  assert.match(database, /findOneAndUpdate/);
  assert.doesNotMatch(database, /node:sqlite|DatabaseSync|DATABASE_PATH/);
});
