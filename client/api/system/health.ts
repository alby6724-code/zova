import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

const startTime = Date.now();

export default createHandler((req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memory = process.memoryUsage();

  res.json({
    status: 'healthy',
    system: 'ZOVA Production Serverless API',
    uptimeSeconds: uptime,
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
    },
    database: {
      status: 'connected',
      usersCount: db.users.length,
      listingsCount: db.listings.length,
    },
  });
});

