import assert from 'node:assert/strict';
import test from 'node:test';
import googleHandler from '../lib/auth-handlers/google.js';
import { DEFAULT_GOOGLE_OAUTH_CLIENT_ID, googleOAuthClientId } from '../lib/google-oauth.js';

test('Google OAuth uses the deployed browser client when no environment override exists', () => {
  const previous = process.env.GOOGLE_OAUTH_CLIENT_ID;
  delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  try {
    assert.equal(googleOAuthClientId(), DEFAULT_GOOGLE_OAUTH_CLIENT_ID);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previous;
  }
});

test('Google OAuth prefers a configured client ID', () => {
  const previous = process.env.GOOGLE_OAUTH_CLIENT_ID;
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'configured-client.apps.googleusercontent.com';
  try {
    assert.equal(googleOAuthClientId(), 'configured-client.apps.googleusercontent.com');
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previous;
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
