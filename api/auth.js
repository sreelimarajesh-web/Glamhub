import google from '../lib/auth-handlers/google.js';
import login from '../lib/auth-handlers/login.js';
import logout from '../lib/auth-handlers/logout.js';
import register from '../lib/auth-handlers/register.js';
import session from '../lib/auth-handlers/session.js';
import salon from '../lib/auth-handlers/salon.js';
import { csrfProtection, rateLimit, requestId, runAsyncMiddleware, runMiddleware, securityHeaders } from '../lib/security.js';

const handlers = { google, login, logout, register, session, salon };

const limits = {
  login: rateLimit({ name: 'login', limit: 10, windowMs: 15 * 60_000 }),
  register: rateLimit({ name: 'register', limit: 5, windowMs: 60 * 60_000 }),
  google: rateLimit({ name: 'google', limit: 10, windowMs: 15 * 60_000 }),
};
export default async function handler(req, res) {
  runMiddleware(requestId, req, res); runMiddleware(securityHeaders, req, res);
  const action = String(req.query?.action || req.authAction || '').toLowerCase();
  const actionHandler = handlers[action];
  if (!actionHandler) return res.status(404).json({ error: 'Authentication route not found.' });
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !runMiddleware(csrfProtection, req, res)) return;
  if (limits[action] && !await runAsyncMiddleware(limits[action], req, res)) return;
  return actionHandler(req, res);
}
