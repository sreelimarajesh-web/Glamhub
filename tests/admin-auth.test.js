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

test('Admin can log in, validate the session, and log out', () => {
  delete process.env.ADMIN_USERNAME; delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD;
  let res=response(); login({method:'POST',body:{email:'admin',password:'infy@123'}},res);
  assert.equal(res.statusCode,200); assert.match(res.headers['Set-Cookie'],/HttpOnly/);
  const cookie=res.headers['Set-Cookie'].split(';')[0];
  res=response(); session({method:'GET',headers:{cookie}},res);
  assert.equal(res.statusCode,200); assert.deepEqual(res.body.roles,['ADMIN']);
  res=response(); logout({method:'POST'},res);
  assert.equal(res.statusCode,200); assert.match(res.headers['Set-Cookie'],/Max-Age=0/);
});

test('Salon Owner and Customer credentials cannot call admin APIs', () => {
  for (const credentials of [{email:'owner@example.com',password:'owner-pass'},{email:'customer@example.com',password:'customer-pass'}]) {
    const loginResponse=response(); login({method:'POST',body:credentials},loginResponse);
    assert.equal(loginResponse.statusCode,401);
  }
  const sessionResponse=response(); session({method:'GET',headers:{}},sessionResponse);
  assert.equal(sessionResponse.statusCode,403);
});

test('tampered admin cookies are rejected', () => {
  const res=response(); session({method:'GET',headers:{cookie:'salonmate_admin=forged.token'}},res);
  assert.equal(res.statusCode,403);
});
