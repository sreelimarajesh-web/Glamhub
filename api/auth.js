import google from '../lib/auth-handlers/google.js';
import login from '../lib/auth-handlers/login.js';
import logout from '../lib/auth-handlers/logout.js';
import register from '../lib/auth-handlers/register.js';
import session from '../lib/auth-handlers/session.js';

const handlers = { google, login, logout, register, session };

export default function handler(req, res) {
  const action = String(req.query?.action || req.authAction || '').toLowerCase();
  const actionHandler = handlers[action];
  if (!actionHandler) return res.status(404).json({ error: 'Authentication route not found.' });
  return actionHandler(req, res);
}
