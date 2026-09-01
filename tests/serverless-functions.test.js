import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import authHandler from '../api/auth.js';

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? javascriptFiles(path.join(directory, entry.name))
    : [path.join(directory, entry.name)].filter((file) => file.endsWith('.js'))));
  return nested.flat();
}

test('Vercel deployment stays below the twelve-function limit', async () => {
  const functions = await javascriptFiles(fileURLToPath(new URL('../api', import.meta.url)));
  assert.equal(functions.length, 6);
  for (const file of functions) { const module = await import(file); assert.equal(typeof module.default, 'function', `${file} must default-export a handler`); }
  assert.ok(functions.length < 12);
});

test('consolidated authentication function rejects unknown actions', async () => {
  const response = {
    headers: {}, setHeader(name, value) { this.headers[name] = value; }, removeHeader() {},
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await authHandler({ query: { action: 'unknown' } }, response);
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.error, 'Authentication route not found.');
});
