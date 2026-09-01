import test from 'node:test';
import assert from 'node:assert/strict';
import login from '../api/admin/login.js';
import session from '../api/admin/session.js';
import logout from '../api/admin/logout.js';

function response() {
  return { statusCode: 200, headers: {}, body: null,
    setHeader(name,value){ this.headers[name]=value; },
    status(code){ this.statusCode=code; return this; },
    json(value){ this.body=value; return this; }
  };
}

test('Admin can log in, validate the session, and log out', async () => {
  process.env.ADMIN_USERNAME='test-admin'; process.env.ADMIN_PASSWORD='test-admin-password-abcdefghijklmnopqrstuvwxyz'; process.env.SESSION_SECRET='test-session-secret-abcdefghijklmnopqrstuvwxyz';
  let res=response(); await login({method:'POST',headers:{},body:{email:process.env.ADMIN_USERNAME,password:process.env.ADMIN_PASSWORD}},res);
  assert.equal(res.statusCode,200); assert.match(res.headers['Set-Cookie'],/HttpOnly/);
  const cookie=res.headers['Set-Cookie'].split(';')[0];
  res=response(); session({method:'GET',headers:{cookie}},res);
  assert.equal(res.statusCode,200); assert.deepEqual(res.body.roles,['ADMIN']);
  res=response(); logout({method:'POST'},res);
  assert.equal(res.statusCode,200); assert.match(res.headers['Set-Cookie'],/Max-Age=0/);
});

test('Salon Owner and Customer credentials cannot call admin APIs', async () => {
  for (const credentials of [{email:'owner@example.com',password:'owner-pass'},{email:'customer@example.com',password:'customer-pass'}]) {
    const loginResponse=response(); await login({method:'POST',headers:{},body:credentials},loginResponse);
    assert.equal(loginResponse.statusCode,401);
  }
  const sessionResponse=response(); session({method:'GET',headers:{}},sessionResponse);
  assert.equal(sessionResponse.statusCode,403);
});

test('tampered admin cookies are rejected', () => {
  const res=response(); session({method:'GET',headers:{cookie:'salonmate_admin=forged.token'}},res);
  assert.equal(res.statusCode,403);
});
