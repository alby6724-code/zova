# Operations & Disaster Recovery Runbook

**Project**: ForAntigravity — OLX-style Marketplace Admin Panel  
**Target Environment**: Kubernetes / Docker Swarm / Standalone Containers

---

## 1. Local Development Quickstart

```bash
# 1. Start backend server (Port 5000)
cd server
npm run dev

# 2. Start frontend dev server (Port 3000)
cd ../client
npm run dev
```

Navigate to: `http://localhost:3000`

---

## 2. Production Docker Deployment

```bash
# Spin up Server, Client, PostgreSQL 16, and Redis 7 in isolated network
docker-compose up -d --build

# Check status of containers
docker-compose ps

# Tail logs
docker-compose logs -f server
```

---

## 3. Database Backup & Restore Playbook

### Automated Daily Full Backup
```bash
# Create timestamped SQL dump
docker exec -t forantigravity-postgres pg_dumpall -c -U olx_admin > /backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress and encrypt using AES-256
gpg --symmetric --cipher-algo AES256 /backups/db_backup_*.sql
```

### Point-In-Time Restore
```bash
# 1. Terminate application connections
docker-compose stop server client

# 2. Decrypt and restore dump
cat /backups/db_backup_20260910.sql | docker exec -i forantigravity-postgres psql -U olx_admin -d forantigravity

# 3. Restart server and run integrity validation
docker-compose start server client
curl -f http://localhost:5000/api/system/health
```

---

## 4. Disaster Recovery & Failover

1. **Database Failover**:
   - Secondary replica promoted via Patroni / managed RDS failover.
   - Update `DATABASE_URL` environment variable and trigger zero-downtime rolling restart.
2. **Kubernetes Rollback**:
   ```bash
   helm rollback forantigravity <PREVIOUS_REVISION> -n production
   ```
3. **Observability & Incident Triaging**:
   - **Health Check**: `GET /api/system/health`
   - **Prometheus Metrics**: `GET /api/system/metrics`
   - **Real-time WebSocket**: `ws://<host>/ws`
