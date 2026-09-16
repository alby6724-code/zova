# ForAntigravity — OLX-style Marketplace Admin Panel

> **Production-grade, responsive, accessible, highly-secure OLX-style Marketplace and Admin Panel.**

Built strictly to match the visual design, typography, spacing, and component hierarchy of the two reference assets:
- **Reference Image 1 ([`olxx.jpeg`](./olxx.jpeg))**: Customer-facing "Qniue" local marketplace storefront (Buy & Sell hero banner, search bar with location picker, category icon grid, featured listings with ₹ pricing, and post ad wizard).
- **Reference Image 2 ([`ox.jpeg`](./ox.jpeg))**: Admin Panel (Dark left navy sidebar `#0b1a30`, 5 KPI cards with trend indicators, Listings by Category donut chart, Platform Activity multi-line chart, Recent Activity stream, Recent Listings moderation table, Top Sellers leaderboard, Quick Actions, User Type donut, Recent Chats, and Reported Listings queue).

---

## 🌟 Key Architecture & Features

### 1. Frontend (`client/`)
- **Framework**: React 18 + TypeScript + Vite.
- **Styling**: Tailored Tailwind CSS with exact HSL color tokens matching `ox.jpeg` (`#0b1a30` navy sidebar, `#2563eb` active pills, custom KPI badge themes).
- **Visual Analytics**: Interactive Recharts donut charts and multi-line activity charts.
- **Real-time Engine**: WebSocket client with live toast alerts for new listings, incoming chat inquiries, and moderation events.
- **Live Storefront Mode**: Instant toggle button to preview and test the customer marketplace (`olxx.jpeg`).

### 2. Backend API & WebSocket (`server/`)
- **Runtime**: Node.js + Express + TypeScript with NestJS-style clean architecture.
- **Authentication**: OAuth 2.0 / OpenID Connect compatible JWT with short-lived access tokens and refresh token rotation.
- **Multi-Factor Auth (2FA)**: RFC 6238 TOTP verification with QR codes and backup recovery codes.
- **Role-Based Access Control (RBAC)**: Enforced permission matrix across 4 administrative tiers: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `SUPPORT`.
- **Security & OWASP**: Helmet CSP headers, HSTS, `X-Frame-Options: DENY`, sliding-window rate limiting, and immutable audit logs.
- **Dual-Mode Persistence**: Fast zero-dependency embedded database for instant local development + PostgreSQL 16 & Redis 7 Docker configuration for containerized deployment.

### 3. Infrastructure & DevOps (`infra/`, `.github/`)
- **Containers**: Multi-stage production `Dockerfile` for backend and Nginx client.
- **Orchestration**: `docker-compose.yml` linking App, PostgreSQL 16, and Redis 7.
- **Kubernetes**: Production Helm chart (`infra/helm/forantigravity/`) with Ingress, Service, Deployment, and Horizontal Pod Autoscaling (HPA).
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`) enforcing Lint, Vitest tests, SCA security scans, and staging deploys.

---


---

## 🚀 Quickstart Guide

### Option 1: Local Development (Single Command)

From the project root:

```bash
# Start both Backend (Port 5000) and Frontend (Port 3000) concurrently
npm run dev
# or: npm start (or on Windows: .\start.bat)
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Separate Terminal Mode (Alternative):

```bash
# 1. Start backend server (Port 5000)
npm run dev:server    # or: cd server && npm run dev

# 2. In a separate terminal, start frontend (Port 3000)
npm run dev:client    # or: cd client && npm run dev
```

### Option 2: Production Docker Compose

```bash
docker-compose up -d --build
```

Access:
- Frontend: `http://localhost`
- Backend API: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/system/health`
- Prometheus Metrics: `http://localhost:5000/api/system/metrics`

---

## 🧪 Testing & Verification

```bash
# Run backend integration tests (Vitest + Supertest)
cd server
npm run test

# Run frontend component unit tests (Vitest + Testing Library)
cd ../client
npm run test
```

---

## 📚 Documentation Links

- [**Enterprise Security & OWASP Checklist**](./docs/SECURITY.md)
- [**Operations & Disaster Recovery Runbook**](./docs/RUNBOOK.md)
- [**OpenAPI 3.0 API Specification**](./docs/openapi.json)
