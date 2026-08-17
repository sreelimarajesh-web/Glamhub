import { mongodbHealth } from '../lib/mongodb-connection.js';

export default async function handler(_req, res) {
  const database = await mongodbHealth();
  return res.status(database.ok ? 200 : 503).json({
    ok: database.ok,
    app: 'Zaya',
    database: 'mongodb',
    ...database,
  });
}
