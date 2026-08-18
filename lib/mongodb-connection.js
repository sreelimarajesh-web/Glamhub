import mongoose from 'mongoose';

const cacheKey = Symbol.for('zaya.mongodb.connection');
const globalCache = globalThis;
globalCache[cacheKey] ||= { connection: null, promise: null };
const cache = globalCache[cacheKey];

export function mongodbConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not configured.');
  if (cache.connection && mongoose.connection.readyState === 1) return cache.connection;

  cache.promise ||= mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  }).then(async (instance) => {
    await instance.connection.db.admin().ping();
    return instance;
  }).catch((error) => {
    cache.promise = null;
    cache.connection = null;
    throw error;
  });

  cache.connection = await cache.promise;
  return cache.connection;
}

export async function mongodbHealth() {
  if (!mongodbConfigured()) return { ok: false, configured: false, status: 'missing_configuration' };
  const startedAt = Date.now();
  try {
    const connection = await connectToMongoDB();
    return { ok: true, configured: true, status: 'connected', readyState: connection.connection.readyState, latencyMs: Date.now() - startedAt };
  } catch (error) {
    console.error('MongoDB health check failed:', error.message);
    return { ok: false, configured: true, status: 'connection_failed', latencyMs: Date.now() - startedAt };
  }
}
