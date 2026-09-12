# CLASH OF CODES — PRODUCTION DEPLOYMENT GUIDE

This guide walks you through deploying **CLASH OF CODES** to the production stack:
- **Database:** Neon PostgreSQL (Free Tier)
- **Backend API:** Render Web Service (Free Tier)
- **Frontend App:** Vercel (Free Tier)

---

## ARCHITECTURE OVERVIEW

```
  Participant Browsers (Mobile & Desktop)
                   │
                   ▼
       Vercel (React + Vite SPA)
      https://clash-of-codes.vercel.app
                   │
                   │ HTTPS API Requests (Bearer JWT)
                   ▼
      Render Web Service (Node.js + Express)
      https://clash-of-codes-api.onrender.com
                   │
                   │ Prisma ORM (Connection Pool / SSL)
                   ▼
          Neon PostgreSQL 16
   postgresql://user:pass@ep-xyz.neon.tech/neondb
```

---

## 1. NEON POSTGRESQL (DATABASE SETUP)

1. Sign up / Log in to [Neon.tech](https://neon.tech) (Free Tier provides 0.5 GB storage and auto-suspend).
2. Click **Create Project**:
   - **Project Name:** `clash-of-codes`
   - **Postgres version:** `16` (recommended)
   - **Region:** Choose the region closest to your college (e.g., `AWS ap-southeast-1` Singapore or `AWS eu-central-1` / `AWS us-east-2`).
3. Once the database is created, navigate to **Dashboard** $\to$ **Connection Details**.
4. Select **Prisma** or **PostgreSQL** connection string format. Ensure `?sslmode=require` is present:
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-royal-feather-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
5. Keep this `DATABASE_URL` safe for step 2.

---

## 2. BACKEND DEPLOYMENT (RENDER FREE TIER)

### Option A: Via GitHub Repository (Recommended)
1. Push your project to GitHub (or ensure your repository contains the `server/` directory and root schema).
2. Sign in to [Render.com](https://render.com).
3. Click **New +** $\to$ **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name:** `clash-of-codes-api`
   - **Region:** Same region as Neon (for lowest latency).
   - **Root Directory:** `server` (or leave blank if repository root is the server).
   - **Environment:** `Node`
   - **Build Command:**
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
   - **Instance Type:** `Free`

6. Add **Environment Variables** in Render:
   | Key | Example Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://...@ep-xyz.neon.tech/neondb?sslmode=require` | Your Neon connection string |
   | `JWT_SECRET` | `generate-a-64-character-random-hex-string` | Secret for participant and admin JWTs |
   | `ADMIN_USER_ID` | `admin` | Admin dashboard login username |
   | `ADMIN_PASSWORD` | `ClashArena@2026!Live` | Strong password for admin login |
   | `FRONTEND_URL` | `https://clash-of-codes.vercel.app` | Allowed CORS origin (update after Vercel deploy) |
   | `NODE_ENV` | `production` | Enables production optimizations |

7. Click **Create Web Service**.
8. Render will run `npm install`, compile Prisma Client, execute migrations via `prisma migrate deploy`, and launch the server.
9. Verify deployment:
   - Open `https://clash-of-codes-api.onrender.com/api/health` in your browser.
   - Expected response:
     ```json
     {
       "status": "ok",
       "database": "connected",
       "server_time": "2026-09-12T12:35:00.000Z"
     }
     ```

### Seeding Initial Data on Render (Optional)
If starting with fresh tables and wanting default admin + events:
1. In Render Dashboard, click the **Shell** tab of your service.
2. Run:
   ```bash
   npm run seed
   ```
*(Note: If migrating existing SQLite data, see Section 4 below).*

---

## 3. FRONTEND DEPLOYMENT (VERCEL FREE TIER)

1. Sign up / Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** $\to$ **Project**.
3. Import your GitHub repository.
4. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and choose `client`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Configure Environment Variables:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://clash-of-codes-api.onrender.com` (Your Render backend URL without trailing slash) |
6. Click **Deploy**.
7. Once deployed, note your Vercel URL (e.g. `https://clash-of-codes.vercel.app`).
8. Return to **Render** $\to$ **Environment** $\to$ update `FRONTEND_URL` to match this URL, and click **Save Changes**.

---

## 4. DATA MIGRATION FROM SQLITE TO NEON POSTGRESQL

If you want to migrate all existing registered teams, questions, and allocations from the local database directly into Neon:

1. From your local machine terminal:
   ```powershell
   # Point to your Neon database URL temporarily
   $env:DATABASE_URL="postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-xyz.neon.tech/neondb?sslmode=require"
   
   # Run prisma migrations on Neon
   npx prisma migrate deploy --schema=./server/prisma/schema.prisma
   
   # Run the automated migration script
   node ./server/scripts/migrateFromSqlite.js
   ```
2. The script will automatically:
   - Read from `server/db/techarena.db`.
   - Upsert all admins, events, sections, teams, questions, code scramble data, hidden tech questions, and allocations into Neon.
   - Reset all PostgreSQL serial sequences (`setval`).
   - Validate 100% record match and print a summary table.

---

## 5. DATABASE BACKUP & DISASTER RECOVERY

Regular backups ensure zero data loss before and after the live event.

### Taking a Full Database Backup (Pre-Event & Post-Event)
Run this command from any machine with `pg_dump` installed (or in Git Bash / WSL / PowerShell):
```bash
# Set your Neon connection string
export DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz.neon.tech/neondb?sslmode=require"

# Create a compressed custom-format backup with timestamp
pg_dump "$DATABASE_URL" -F c -b -v -f clash_backup_$(date +%Y%m%d_%H%M%S).dump

# Or plain SQL backup:
pg_dump "$DATABASE_URL" --no-owner --no-acl -f clash_backup_plain.sql
```

### Restoring from Backup
In case of emergency or if you need to restore to a new database instance:
```bash
# Restore custom-format dump into target database
pg_restore -d "$DATABASE_URL" --clean --no-owner --no-acl -v clash_backup_pre_event.dump

# Or if using plain SQL:
psql "$DATABASE_URL" -f clash_backup_plain.sql
```

---

## 6. LIVE EVENT DAY MASTER CHECKLIST

### Phase 1: Pre-Event Preparation (T-24 Hours to T-2 Hours)
- [ ] **Neon Connection Verified:** Confirm Neon dashboard shows active compute and storage healthy.
- [ ] **Render Service Active:** Verify Render Web Service shows `Deployed` status.
- [ ] **Vercel Frontend Active:** Verify Vercel deployment has correct `VITE_API_URL` pointing to Render.
- [ ] **Pre-Event Database Backup:** Run `pg_dump` to create a clean snapshot of all pre-registered teams and questions.
- [ ] **Admin Credentials Test:** Log in at `/admin/login` using `ADMIN_USER_ID` and `ADMIN_PASSWORD`.
- [ ] **Audit Questions & Allocations:** Check that 10 questions for 2nd Year (Code Scramble) and 6 questions for 3rd Year (Hidden Tech) are present and verified.
- [ ] **Event Settings Configured:** Verify time limits (e.g. 45 min) and questions per team (5) in Admin Settings.

### Phase 2: Live Room Setup & Warmup (T-30 Minutes)
- [ ] **Warm Up Render Backend:** Send a GET request to `https://YOUR-BACKEND.onrender.com/api/health` to ensure the Render container is spun up and database latency is warm.
- [ ] **Single Test Participant Smoke Test:**
  - Log in with a test team account.
  - Verify participant dashboard displays team details and event status "Waiting for event to start" or "Not Started".
  - **PRIVACY CHECK:** Ensure NO score, marks, deductions, or point counters are visible to the participant. Only line alignment status and question numbers should be shown.
- [ ] **Projector / Screen Check:** If projecting leaderboards, keep `/admin/results` open on the organizer PC. Participants must NOT see this screen during the event.

### Phase 3: During the Event (T-0 to Event Conclusion)
- [ ] **Event Start:** In Admin Dashboard $\to$ Settings, click **Start Event**. Status switches to **LIVE**.
- [ ] **Participant Arena Unlock:** All participant browsers will transition automatically to the live question arena.
- [ ] **Authoritative Timer Running:** Timer counts down uniformly across all participant PCs based on server time.
- [ ] **Score Privacy Enforced:** Participants see real-time line alignment feedback (green lines on correct position) with ZERO points or deductions shown.
- [ ] **Live Monitoring:** Admin can refresh `/admin/results` or live dashboard to observe team submissions and progress in real time.

### Phase 4: Event Conclusion & Results
- [ ] **Automatic Expiry Locking:** At `00:00`, participant sessions automatically lock. Any further attempt to swap, clue, or submit returns HTTP 403 `time_expired`.
- [ ] **Final Submission Capture:** All saved attempts are finalized.
- [ ] **Export Official Results:** In Admin Results, click **Export CSV** to download the verified rankings with total marks, completion timestamps, hints used, and tiebreakers.
- [ ] **Post-Event Database Snapshot:** Run `pg_dump` to archive the final competition database state.
