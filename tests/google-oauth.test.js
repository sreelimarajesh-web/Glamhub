import assert from 'node:assert/strict';
import test from 'node:test';
import googleHandler from '../lib/auth-handlers/google.js';
import authHandler from '../api/auth.js';
import { DEFAULT_GOOGLE_OAUTH_CLIENT_ID, googleAuthEnabled, googleOAuthClientId } from '../lib/google-oauth.js';

test('Google OAuth uses the deployed web client when no override is configured', () => {
  const previous = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const previousEnabled = process.env.GOOGLE_AUTH_ENABLED;
  delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  delete process.env.GOOGLE_AUTH_ENABLED;
  try {
    assert.equal(googleAuthEnabled(), true);
    assert.equal(googleOAuthClientId(), DEFAULT_GOOGLE_OAUTH_CLIENT_ID);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previous;
    if (previousEnabled === undefined) delete process.env.GOOGLE_AUTH_ENABLED;
    else process.env.GOOGLE_AUTH_ENABLED = previousEnabled;
  }
});

test('Google OAuth prefers a configured client ID', () => {
  const previous = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const previousEnabled = process.env.GOOGLE_AUTH_ENABLED;
  process.env.GOOGLE_AUTH_ENABLED = 'true';
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'configured-client.apps.googleusercontent.com';
  try {
    assert.equal(googleOAuthClientId(), 'configured-client.apps.googleusercontent.com');
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previous;
    if (previousEnabled === undefined) delete process.env.GOOGLE_AUTH_ENABLED;
    else process.env.GOOGLE_AUTH_ENABLED = previousEnabled;
  }
});

test('Google OAuth is enabled by a configured client ID when the feature flag is omitted', () => {
  const previous = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const previousEnabled = process.env.GOOGLE_AUTH_ENABLED;
  delete process.env.GOOGLE_AUTH_ENABLED;
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'configured-client.apps.googleusercontent.com';
  try {
    assert.equal(googleAuthEnabled(), true);
    assert.equal(googleOAuthClientId(), 'configured-client.apps.googleusercontent.com');
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previous;
    if (previousEnabled === undefined) delete process.env.GOOGLE_AUTH_ENABLED;
    else process.env.GOOGLE_AUTH_ENABLED = previousEnabled;
  }
});

test('Google OAuth can be explicitly disabled with the feature flag', () => {
  const previousEnabled = process.env.GOOGLE_AUTH_ENABLED;
  const previousClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  process.env.GOOGLE_AUTH_ENABLED = 'false';
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'configured-client.apps.googleusercontent.com';
  try {
    assert.equal(googleAuthEnabled(), false);
    assert.equal(googleOAuthClientId(), '');
  } finally {
    if (previousEnabled === undefined) delete process.env.GOOGLE_AUTH_ENABLED;
    else process.env.GOOGLE_AUTH_ENABLED = previousEnabled;
    if (previousClientId === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previousClientId;
  }
});

test('Google authentication reports a missing credential as a bad request', async () => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await googleHandler({ method: 'POST', body: {} }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'Google credential is required.');
});

test('public configuration exposes the enabled Google client at runtime', async () => {
  const previous = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const previousEnabled = process.env.GOOGLE_AUTH_ENABLED;
  process.env.GOOGLE_AUTH_ENABLED = 'true';
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'runtime-client.apps.googleusercontent.com';
  const response = {
    headers: {},
    statusCode: 0,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  try {
    await authHandler({ method: 'GET', query: { action: 'config' } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['Cache-Control'], 'no-store, max-age=0');
    assert.deepEqual(response.body, { googleAuthEnabled: true, googleOAuthClientId: 'runtime-client.apps.googleusercontent.com' });
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previous;
    if (previousEnabled === undefined) delete process.env.GOOGLE_AUTH_ENABLED;
    else process.env.GOOGLE_AUTH_ENABLED = previousEnabled;
  }
});

test('public configuration rejects non-GET requests', async () => {
  const response = {
    setHeader() {},
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await authHandler({ method: 'POST', query: { action: 'config' } }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.body.error, 'Method not allowed.');
});
