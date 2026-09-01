import assert from 'node:assert/strict';
import test from 'node:test';
import { adminConfig, ConfigurationError, sessionSecret, validateProductionConfig } from '../lib/config.js';
import { createUserToken, readUserSession, userCookie } from '../lib/user-session.js';
import { csrfProtection, rateLimit, resetRateLimits, securityHeaders } from '../lib/security.js';
const response = () => ({ statusCode: 200, headers: {}, setHeader(k,v){this.headers[k]=v;}, removeHeader(){}, status(c){this.statusCode=c;return this;}, json(v){this.body=v;return this;} });
test('production secrets fail closed and remain independent', () => {
  const old={...process.env}; try { process.env.NODE_ENV='production'; delete process.env.SESSION_SECRET; assert.throws(sessionSecret, ConfigurationError); delete process.env.ADMIN_USERNAME; delete process.env.ADMIN_PASSWORD; assert.throws(adminConfig, ConfigurationError); process.env.SESSION_SECRET='x'.repeat(40); process.env.ADMIN_USERNAME='pilot-admin'; process.env.ADMIN_PASSWORD=process.env.SESSION_SECRET; assert.throws(adminConfig, /independent/); assert.throws(validateProductionConfig); } finally { process.env=old; }
});
test('no known fallback signs user tokens', () => {
  const old=process.env.SESSION_SECRET; delete process.env.SESSION_SECRET; assert.throws(() => createUserToken({_id:'a',email:'a@b.c',roles:['customer']}), ConfigurationError); process.env.SESSION_SECRET='test-session-secret-abcdefghijklmnopqrstuvwxyz'; const cookie=userCookie(createUserToken({_id:'a',email:'a@b.c',roles:['customer']}),false); process.env.SESSION_SECRET='development-only-change-me-development'; assert.equal(readUserSession(cookie),null); process.env.SESSION_SECRET=old;
});
test('security headers, csrf origins, and rate limit are enforced', async () => {
  let res=response(); securityHeaders({},res,()=>{}); assert.equal(res.headers['X-Content-Type-Options'],'nosniff'); assert.match(res.headers['Content-Security-Policy'],/frame-ancestors 'none'/);
  const old=process.env.PUBLIC_APP_URL; process.env.PUBLIC_APP_URL='https://zaya.example'; res=response(); let next=false; csrfProtection({method:'POST',headers:{origin:'https://evil.example'}},res,()=>{next=true;}); assert.equal(res.statusCode,403); assert.equal(next,false); res=response(); csrfProtection({method:'POST',headers:{origin:'https://zaya.example'}},res,()=>{next=true;}); assert.equal(next,true); process.env.PUBLIC_APP_URL=old;
  resetRateLimits(); const limiter=rateLimit({name:'test',limit:2,windowMs:10000}); const req={socket:{remoteAddress:'127.0.0.1'}}; await limiter(req,response(),()=>{}); await limiter(req,response(),()=>{}); res=response(); await limiter(req,res,()=>{}); assert.equal(res.statusCode,429); assert.ok(res.headers['Retry-After']);
});
