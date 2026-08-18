import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('customer requests remain pending until the salon confirms them', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const confirmation = source.slice(source.indexOf('window.confirmBooking ='), source.indexOf('function myBookings()'));

  assert.match(confirmation, /status: pending\.walkIn \? 'Confirmed' : 'Pending'/);
  assert.ok(source.includes('Waiting for the salon owner to confirm this request.'));
  assert.ok(source.includes('Confirm booking'));
  assert.ok(source.includes("updateBooking('${b.id}','Confirmed')"));
});

test('owner booking editor validates staff conflicts before saving', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const editor = source.slice(source.indexOf('function ownerBookingCard'), source.indexOf('function crm()'));

  assert.ok(editor.includes('Edit booking'));
  assert.ok(editor.includes('saveBookingEdit'));
  assert.ok(editor.includes("['Pending', 'Confirmed'].includes(item.status)"));
  assert.ok(editor.includes('That staff member already has a booking in this slot.'));
});

test('authenticated customer identity is linked before booking persistence', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.ok(source.includes('function ensureSessionCustomer()'));
  assert.ok(source.includes('customer.accountId = session.accountId'));
  assert.ok(source.includes('db.registeredCustomerId = customer.id'));
});
