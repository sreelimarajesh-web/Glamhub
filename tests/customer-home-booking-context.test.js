import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('customer home renders published offer details', () => {
  const home = source.slice(source.indexOf('function customerHome()'), source.indexOf('function discoverySalonCard'));
  assert.match(home, /featuredOffer\.title/);
  assert.match(home, /featuredOffer\.description/);
  assert.match(home, /offerDiscount\(featuredOffer\)/);
});

test('booking service step keeps the salon inherited from its launch context', () => {
  const booking = source.slice(source.indexOf('function booking()'), source.indexOf('window.confirmBooking'));
  assert.match(booking, /salonItem\?\.name/);
  assert.doesNotMatch(booking, /id="book-salon"/);
});

test('salon profile includes eligible salon and platform offers', () => {
  assert.match(source, /const activeSalonOffers =/);
  assert.match(source, /availablePlatformOffers\(salonId\)/);
  const profile = source.slice(source.indexOf('function salonProfile()'), source.indexOf('function availableSlots'));
  assert.match(profile, /activeSalonOffers\(s\.id\)/);
  assert.match(profile, /class="profile-offer/);
  assert.match(profile, /applyProfileOffer\('\$\{offer\.id\}'\)/);
});
