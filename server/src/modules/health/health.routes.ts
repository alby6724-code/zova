import { Router, Request, Response } from 'express';
import { db } from '../../database/store.js';

const router = Router();
const startTime = Date.now();

router.get('/health', (req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memory = process.memoryUsage();

  res.json({
    status: 'healthy',
    system: 'ZOVA (Zioeemarket) Production Server',
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

// Prometheus text format metrics
router.get('/metrics', (req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const kpis = db.getKPIs();

  const metrics = [
    `# HELP zova_uptime_seconds Total application uptime in seconds`,
    `# TYPE zova_uptime_seconds counter`,
    `zova_uptime_seconds ${uptime}`,
    `# HELP zova_total_users Total registered users in system`,
    `# TYPE zova_total_users gauge`,
    `zova_total_users ${kpis.totalUsers.count}`,
    `# HELP zova_total_listings Total listings in system`,
    `# TYPE zova_total_listings gauge`,
    `zova_total_listings ${kpis.totalListings.count}`,
    `# HELP zova_reported_items Total reported listings pending review`,
    `# TYPE zova_reported_items gauge`,
    `zova_reported_items ${kpis.reportedItems.count}`,
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(metrics);
});

export default router;
