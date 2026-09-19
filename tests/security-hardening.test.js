import assert from 'node:assert/strict';
import test from 'node:test';
import { adminConfig, ConfigurationError, rateLimitStoreConfig, sessionSecret, validateProductionConfig } from '../lib/config.js';
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
test('csrf protection derives the deployment origin when PUBLIC_APP_URL is omitted', () => {
  const oldNodeEnv=process.env.NODE_ENV; const oldPublicUrl=process.env.PUBLIC_APP_URL;
  try {
    process.env.NODE_ENV='production'; delete process.env.PUBLIC_APP_URL;
    let res=response(); let next=false;
    csrfProtection({method:'POST',headers:{origin:'https://preview.example','x-forwarded-host':'preview.example','x-forwarded-proto':'https'}},res,()=>{next=true;});
    assert.equal(next,true); assert.equal(res.statusCode,200);
    res=response(); next=false;
    csrfProtection({method:'POST',headers:{origin:'https://evil.example','x-forwarded-host':'preview.example','x-forwarded-proto':'https'}},res,()=>{next=true;});
    assert.equal(next,false); assert.equal(res.statusCode,403);
  } finally { if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=oldNodeEnv; if (oldPublicUrl === undefined) delete process.env.PUBLIC_APP_URL; else process.env.PUBLIC_APP_URL=oldPublicUrl; }
});
test('rate limit store recognizes Vercel KV and Upstash integration variables', () => {
  const old={...process.env};
  try {
    delete process.env.RATE_LIMIT_STORE_URL; delete process.env.RATE_LIMIT_STORE_TOKEN;
    process.env.KV_REST_API_URL='https://kv.example'; process.env.KV_REST_API_TOKEN='kv-token';
    assert.deepEqual(rateLimitStoreConfig(), { url: 'https://kv.example', token: 'kv-token' });
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL='https://upstash.example'; process.env.UPSTASH_REDIS_REST_TOKEN='upstash-token';
    assert.deepEqual(rateLimitStoreConfig(), { url: 'https://upstash.example', token: 'upstash-token' });
  } finally { process.env=old; }
});
test('production authentication rate limits fall back locally when the shared store is unavailable', async () => {
  const oldEnvironment = { ...process.env };
  const oldFetch = globalThis.fetch;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.RATE_LIMIT_STORE_URL; delete process.env.RATE_LIMIT_STORE_TOKEN;
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetRateLimits();
    const limiter = rateLimit({ name: 'production-test', limit: 1, windowMs: 10_000 });
    let next = false;
    const req = { socket: { remoteAddress: '127.0.0.1' } };
    let res = response(); await limiter(req, res, () => { next = true; });
    assert.equal(next, true); assert.equal(res.statusCode, 200);
    res = response(); await limiter(req, res, () => {});
    assert.equal(res.statusCode, 429);
    process.env.RATE_LIMIT_STORE_URL = 'https://rate-limit.example'; process.env.RATE_LIMIT_STORE_TOKEN = 'token';
    globalThis.fetch = async () => { throw new Error('unavailable'); };
    resetRateLimits(); res = response(); await limiter(req, res, () => {});
    assert.equal(res.statusCode, 200);
  } finally { process.env = oldEnvironment; globalThis.fetch = oldFetch; resetRateLimits(); }
});
