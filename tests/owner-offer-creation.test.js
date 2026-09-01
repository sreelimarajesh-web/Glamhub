import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('owner offer creation is a short, audience-first workflow', () => {
  assert.match(source, /Who should get this offer\?/);
  assert.match(source, /What is the deal\?/);
  assert.match(source, /When does it end\?/);
  assert.match(source, /offerAudiences/);
  assert.match(source, /role="radiogroup" aria-label="Offer audience"/);
  assert.match(source, /Optional details/);
});

test('offer builder provides a live preview and validates the discount', () => {
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /updateOfferPreview/);
  assert.match(source, /Percentage discount cannot be more than 100%/);
  assert.match(styles, /\.offer-preview-card/);
  assert.match(styles, /\.offer-builder/);
});
