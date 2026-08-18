import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('Vercel serves partner deep links through the SPA', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(config.rewrites.some(({ source, destination }) => source === '/partner/:path*' && destination === '/index.html'));
});

test('owner sessions restore their salon and requested partner route', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /routeForPath/);
  assert.match(source, /ensureOwnerSalon/);
  assert.match(source, /item\.accountId === account\.accountId \|\| item\.ownerId === account\.accountId/);
  assert.match(source, /cancellationCutoffHours/);
});
