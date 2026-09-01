import { mongodbHealth } from '../lib/mongodb-connection.js';
import { requestId, runMiddleware, securityHeaders } from '../lib/security.js';

export default async function handler(req, res) {
  runMiddleware(requestId, req, res); runMiddleware(securityHeaders, req, res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const database = await mongodbHealth();
  return res.status(database.ok ? 200 : 503).json({
    ok: database.ok,
    app: 'Zaya',
    database: 'mongodb',
    ...database,
  });
}
