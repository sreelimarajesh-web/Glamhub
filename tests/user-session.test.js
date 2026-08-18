import assert from 'node:assert/strict';
import test from 'node:test';
import { createUserToken, newPassword, passwordDigest, readUserSession, userCookie } from '../lib/user-session.js';

test('user credentials are hashed and sessions use HTTP-only cookies', () => {
  const password = newPassword('correct horse battery staple');
  assert.notEqual(password.passwordHash, 'correct horse battery staple');
  assert.equal(passwordDigest('correct horse battery staple', password.passwordSalt), password.passwordHash);
  const token = createUserToken({ _id: 'account-1', email: 'user@example.com', name: 'User', roles: ['customer'] });
  const cookie = userCookie(token, false);
  assert.match(cookie, /HttpOnly/);
  assert.equal(readUserSession(cookie).sub, 'account-1');
  const tampered = cookie.replace(`${token.slice(0, -1)}${token.at(-1)}`, `${token.slice(0, -1)}${token.at(-1) === 'x' ? 'y' : 'x'}`);
  assert.equal(readUserSession(tampered), null);
});
