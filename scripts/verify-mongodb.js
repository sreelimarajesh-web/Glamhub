import { connectToMongoDB, mongodbHealth } from '../lib/mongodb-connection.js';

const result = await mongodbHealth();
if (!result.ok) {
  console.error(`MongoDB verification failed: ${result.status}`);
  process.exitCode = 1;
} else {
  const instance = await connectToMongoDB();
  const buildInfo = await instance.connection.db.command({ buildInfo: 1 });
  console.log(JSON.stringify({
    ok: true,
    status: result.status,
    readyState: result.readyState,
    latencyMs: result.latencyMs,
    serverVersion: buildInfo.version,
  }, null, 2));
  await instance.disconnect();
}
