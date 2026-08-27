import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('customer navigation labels the booking history clearly on desktop and mobile', () => {
  const customerBookingNavItems = source.match(/\['my-bookings',(?: '□',)? 'Bookings'\]/g) || [];
  assert.equal(customerBookingNavItems.length, 2);
  assert.doesNotMatch(source, /\['my-bookings',(?: '□',)? 'Activity'\]/);
});

test('bookings tab uses a shareable route and browser navigation restores it', () => {
  assert.match(source, /'\/bookings': 'my-bookings'/);
  assert.match(source, /'my-bookings': '\/bookings'/);
  assert.match(source, /if \(route && session\) \{ db\.route = route; render\(\); \}/);
  assert.deepEqual(vercel.rewrites.find(({ source }) => source === '/bookings'), {
    source: '/bookings',
    destination: '/index.html'
  });
});

test('signed-out bookings route asks for a customer login and returns to bookings', () => {
  assert.match(source, /authModal = \{ trigger: 'universal', returnRoute: requestedRoute \}/);
  assert.match(source, /loginRole = ownerRoute \? 'salon_owner' : 'customer'/);
});
