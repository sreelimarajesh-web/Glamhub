import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('MongoDB health endpoint is isolated from application startup', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const health = await readFile(new URL('../api/health.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /\/api\/app\/bootstrap/, 'the SPA must not depend on an unconfigured migration API');
  assert.match(health, /mongodbHealth/);
  assert.match(health, /database: 'mongodb'/);
  assert.match(health, /database\.ok \? 200 : 503/);
});

test('MongoDB connector caches connections, pings the cluster, and hides raw errors', async () => {
  const source = await readFile(new URL('../lib/mongodb-connection.js', import.meta.url), 'utf8');
  assert.match(source, /process\.env\.MONGODB_URI/);
  assert.match(source, /Symbol\.for\('zaya\.mongodb\.connection'\)/);
  assert.match(source, /serverSelectionTimeoutMS: 5000/);
  assert.match(source, /\.admin\(\)\.ping\(\)/);
  assert.match(source, /status: 'missing_configuration'/);
  assert.match(source, /status: 'connection_failed'/);
  assert.doesNotMatch(source, /return \{[^}]*error\.message/s, 'raw database errors must not be returned');
});
