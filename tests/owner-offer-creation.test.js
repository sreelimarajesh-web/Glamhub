import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('owner offer creation focuses on the five essential decisions', () => {
  assert.match(source, /<h1>Create Offer<\/h1>/);
  assert.match(source, /Offer Title/);
  assert.match(source, /Discount Percentage/);
  assert.match(source, /Salon Scope/);
  assert.match(source, /Target Audience/);
  assert.match(source, /Validity Period/);
  assert.doesNotMatch(source.slice(source.indexOf('function offers()'), source.indexOf('function marketing()')), /Description|Discount type|Optional details/);
});

test('offer builder exposes accessible scopes, audiences, and clear actions', () => {
  assert.match(source, /role="radiogroup" aria-label="Salon scope"/);
  assert.match(source, /role="radiogroup" aria-label="Offer audience"/);
  assert.match(source, /Save as Draft/);
  assert.match(source, /Publish Offer/);
  assert.match(source, /Percentage discount must be between 1 and 100%/);
  assert.match(styles, /\.offer-setup-grid/);
  assert.match(styles, /\.offer-radio-card\.selected/);
});
