# Campaign Amplification Platform - Backend API & Production DevOps Guide

Production-minded Node.js, Express, and TypeScript API utilizing Prisma ORM, designed for hosted deployment on **Render Web Services** backed by **Supabase Managed PostgreSQL**.

---

## 🏛️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Mobile Client (React Native + Expo)                  │
│   • Configured with EXPO_PUBLIC_API_URL (HTTPS in production)          │
│   • Persistent demo sessions stored via expo-secure-store              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (JWT + Demo Headers)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Render Hosted Web Service (Node.js)                   │
│   • Binds to 0.0.0.0 and process.env.PORT                              │
│   • Strict Zod environment validation on boot                          │
│   • Security headers & payload limits (1MB)                            │
│   • Sanitized request logging (passwords/tokens/secrets redacted)      │
│   • Liveness probe: GET /api/health                                    │
│   • Dependency readiness probe: GET /api/ready                         │
│   • Graceful shutdown on SIGTERM/SIGINT (clean Prisma disconnect)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ TLS Encrypted (sslmode=require)
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
       ┌───────────────────────────┐ ┌───────────────────────────┐
       │ Supabase Connection Pool  │ │ Supabase Direct Connection│
       │ (Port 6543 / PgBouncer)   │ │ (Port 5432 / Direct DDL)  │
       │ DATABASE_URL for runtime  │ │ DIRECT_URL for migrations │
       └───────────────────────────┘ └───────────────────────────┘
```

---

## ☁️ Supabase Managed PostgreSQL Integration

Supabase provides enterprise PostgreSQL with built-in PgBouncer connection pooling. Because connection poolers in transaction mode do not support database migration locks or prepared statements, Prisma 5 uses a dual-connection architecture:

1. **`DATABASE_URL` (Runtime Queries)**: Connects to the Supabase Transaction Pooler on port **6543**.
2. **`DIRECT_URL` (Schema Migrations)**: Connects to the direct PostgreSQL instance on port **5432**.

### How to Retrieve Supabase Connection Strings
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and create or select your project.
2. Navigate to **Project Settings** (gear icon) -> **Database**.
3. Under **Connection string**:
   - Select the **Transaction** mode tab (Port `6543`).
   - Copy the URI. It will look like:
     ```
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
     ```
     Set this as your **`DATABASE_URL`**.
   - Select the **Direct** or **Session** mode tab (Port `5432`).
   - Copy the URI. It will look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require
     ```
     Set this as your **`DIRECT_URL`**.
4. Replace `[YOUR-PASSWORD]` with your actual Supabase database password. Ensure special characters in the password are URL-encoded if necessary.

---

## 🚀 Render Web Service Deployment

### Method 1: Infrastructure as Code (`render.yaml` Blueprint)
The repository includes a ready-to-deploy [`render.yaml`](file:///c:/Users/acer/OneDrive/Desktop/Campaign/render.yaml) at root.
1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will parse `render.yaml` and configure:
   - Build command: `npm install && npm run prisma:generate --workspace=api && npm run build --workspace=api`
   - Pre-deploy command: `npm run prisma:deploy --workspace=api` (`prisma migrate deploy`)
   - Start command: `npm run start --workspace=api`
   - Health check path: `/api/health`
5. Enter your `DATABASE_URL` and `DIRECT_URL` when prompted.
6. Click **Apply**.

### Method 2: Manual Web Service Setup on Render
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `campaign-amplification-api`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install && npm run prisma:generate --workspace=api && npm run build --workspace=api
     ```
   - **Pre-Deploy Command**:
     ```bash
     npm run prisma:deploy --workspace=api
     ```
   - **Start Command**:
     ```bash
     npm run start --workspace=api
     ```
4. Under **Advanced** -> **Health Check Path**, enter:
   ```
   /api/health
   ```
5. Add the following **Environment Variables**:

| Variable | Value / Description | Sensitive? |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | No |
| `DATABASE_URL` | Supabase Transaction Pooler URI (port 6543) | **Yes** |
| `DIRECT_URL` | Supabase Direct Connection URI (port 5432) | **Yes** |
| `AUTH_SECRET` | Generate 32+ character random secret | **Yes** |
| `CLIENT_ORIGIN` | Your production web app domain or `*` | No |

---

## 📦 Database Migrations & Safe Seeding

### 1. Applying Migrations in Production
Production deployments must **never** run `prisma db push` or `prisma migrate dev`. Instead, use:
```bash
npm run api:deploy-migrate
# Executes: prisma migrate deploy
```
This applies pending migrations recorded in `apps/api/prisma/migrations/` sequentially without interactive prompts and records migration history in `_prisma_migrations`.

### 2. Idempotent Demo Seeding
Seeding is strictly separated from deployment:
- The server does **not** auto-seed demo data on startup in production.
- Seeding is blocked in `NODE_ENV=production` by default.
- To seed a staging or development database explicitly:
  ```bash
  # Local development:
  npm run api:seed

  # Staging / Demo Cloud Database:
  ALLOW_PRODUCTION_SEED=true npm run api:seed
  ```
The seed script uses `prisma.user.upsert` and `prisma.campaign.upsert` so it never deletes real campaign or backer records.

### 3. Database Backup & Disaster Recovery
- **Automatic Backups**: Supabase takes automated daily backups retained according to your plan tier.
- **Point-in-Time Recovery (PITR)**: Available in Supabase Pro settings.
- **Manual CLI Backup (`pg_dump`)**:
  ```bash
  pg_dump -d "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require" -Fc -f backup_$(date +%Y%m%d).dump
  ```
- **Manual Restore (`pg_restore`)**:
  ```bash
  pg_restore -d "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require" --clean --no-owner backup_20261016.dump
  ```

---

## 📱 Mobile App Connection (`apps/mobile`)

The mobile client is configured via `EXPO_PUBLIC_API_URL`.

### Local Development
Copy `apps/mobile/.env.example` to `apps/mobile/.env`:
- **Web browser / iOS Simulator**: `http://localhost:4000/api`
- **Android Emulator**: `http://10.0.2.2:4000/api`
- **Physical Device (Expo Go on Wi-Fi)**: `http://192.168.1.6:4000/api` (replace with your machine's local LAN IP)

### Production Build
When creating a production build (via EAS Build or standalone):
```env
EXPO_PUBLIC_API_URL="https://campaign-amplification-api.onrender.com/api"
```
**Safety Guarantee**: In production builds (`__DEV__ === false`), the app verifies that `EXPO_PUBLIC_API_URL` begins with `https://`. If missing or insecure, it fails clearly with a setup error rather than silently degrading.

---

## 🛡️ Production Security Checklist

- [x] **No Secrets in Client Code**: `DATABASE_URL` and `AUTH_SECRET` are never exposed to Expo.
- [x] **No Secrets in Git**: `.gitignore` strictly ignores `.env`, `.env.*` (preserving only `.env.example`).
- [x] **Fail-Fast Database Validation**: In `NODE_ENV=production`, the server aborts startup immediately if `DATABASE_URL` is missing, points to localhost, or fails connection.
- [x] **Secure HTTP Headers**: Automatically sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `HSTS`.
- [x] **Rate Limiting**: Sensitive endpoints (auth, contributions) protected with sliding-window rate limiters.
- [x] **Minor-Unit Financial Arithmetic**: All financial calculations use integer cents/paise (95% media, 5% fee model) preventing floating-point rounding errors.
- [x] **Audited State Transitions**: All campaign lifecycle transitions enforced by centralized state machine with role verification.
- [x] **Liveness & Readiness Separation**: Liveness probe (`/api/health`) reports service uptime; readiness probe (`/api/ready`) actively pings PostgreSQL via `SELECT 1`.

---

## 🧪 Verification Commands

```bash
# Validate Prisma schema
npm run prisma:generate --workspace=api

# Run full automated test suite (24 tests)
npm test --workspace=api

# Compile backend TypeScript
npm run build --workspace=api

# Compile mobile TypeScript
npm run --prefix apps/mobile tsc -- --noEmit
```
