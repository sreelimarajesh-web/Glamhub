import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('service cards communicate original, discounted, and promotional prices accessibly', () => {
  assert.match(source, /function servicePriceMarkup/);
  assert.match(source, /aria-label="Original price/);
  assert.match(source, /aria-label="Offer price/);
  assert.match(styles, /\.original-price[^}]*text-decoration: line-through/);
  assert.match(styles, /\.service-offer-badge/);
});

test('checkout recommends an offer and exposes live, accessible selection feedback', () => {
  assert.match(source, /pending\.offerId = eligible\[0\]/);
  assert.match(source, /role="radiogroup"/);
  assert.match(source, /aria-checked=/);
  assert.match(source, /One offer per booking/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /discountAmount:/);
});
