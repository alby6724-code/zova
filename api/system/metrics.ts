import { createHandler } from '../_lib/handler.js';
import { db } from '../_lib/database/store.js';

const startTime = Date.now();

export default createHandler((req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const kpis = db.getKPIs();

  const metrics = [
    `# HELP ZOVA_uptime_seconds Total application uptime in seconds`,
    `# TYPE ZOVA_uptime_seconds counter`,
    `ZOVA_uptime_seconds ${uptime}`,
    `# HELP ZOVA_total_users Total registered users in system`,
    `# TYPE ZOVA_total_users gauge`,
    `ZOVA_total_users ${kpis.totalUsers.count}`,
    `# HELP ZOVA_total_listings Total listings in system`,
    `# TYPE ZOVA_total_listings gauge`,
    `ZOVA_total_listings ${kpis.totalListings.count}`,
    `# HELP ZOVA_reported_items Total reported listings pending review`,
    `# TYPE ZOVA_reported_items gauge`,
    `ZOVA_reported_items ${kpis.reportedItems.count}`,
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(metrics);
});

