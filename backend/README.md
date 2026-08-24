# FMCG Software — Platform Backend

FastAPI backend powering the FMCG Software Product Development Platform.
Uses **MySQL 8.0** via SQLAlchemy (async) + aiomysql driver.

## Quick Start

### Prerequisites
- Python 3.11+
- MySQL 8.0 running on `localhost:3306`
- A database named `fmcg_software` (created manually or by the seed script)

```sql
-- Run once in MySQL before starting
CREATE DATABASE IF NOT EXISTS fmcg_software CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> **Note:** If you are already using `fmcg_software` as your DB name, keep it — the name in `.env` controls which DB is used.

### 1. Create virtual environment
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in your MySQL credentials:

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=fmcg_software
```

### 4. Seed demo data
```bash
python seed.py
```
This creates all tables and loads 7 projects, 19 tasks, 3 PPDs, 4 formulas, 4 lab experiments, 3 plant trials, 4 regulatory checks, 3 sensory evaluations, 3 costing records, 3 claims, 3 artwork briefs, 9 audit logs, and 15 users.

### 5. Start the API server
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

API is now live at **http://localhost:8001**

### 6. API docs (auto-generated)
- Swagger UI: http://localhost:8001/docs
- ReDoc:       http://localhost:8001/redoc

---

## Available Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| GET  | `/api/auth/me` | Current user info |
| GET  | `/api/dashboard` | Role-aware dashboard data |
| GET  | `/api/dashboard/summary` | Notification badge count |
| GET  | `/api/projects` | List projects (role-filtered) |
| POST | `/api/projects` | Create project |
| PUT  | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project (admin only) |
| GET  | `/api/users` | List users (admin only) |
| POST | `/api/users` | Add user (admin only) |
| PUT  | `/api/users/{id}` | Update user (admin only) |
| DELETE | `/api/users/{id}` | Delete user (admin only) |
| GET  | `/api/audit` | Audit logs |

---

## Demo Credentials

All demo users have password: `Welcome@123`

| Email | Role |
|-------|------|
| admin@fmcgsoftware.com | System Administrator |
| source@fmcgsoftware.com | Source Team |
| fd@fmcgsoftware.com | R&D / F&D Team Member |
| rd_head@fmcgsoftware.com | R&D Head |
| marketing@fmcgsoftware.com | Marketing Team |
| regulatory@fmcgsoftware.com | Regulatory Team |
| production@fmcgsoftware.com | Production / Plant Trial |
| ceo@fmcgsoftware.com | CEO |
| mgmt@fmcgsoftware.com | Management Committee |
| adl@fmcgsoftware.com | ADL Team |
| pmsa@fmcgsoftware.com | PM & SA Team |
| sa@fmcgsoftware.com | SA Team |
| packaging@fmcgsoftware.com | Packaging Team |
| pm@fmcgsoftware.com | Project Management |

---

## Role-Aware Dashboard

The dashboard endpoint (`GET /api/dashboard`) returns **personalized data per role**:

- **admin / mgmt / ceo** → Full platform view (all projects, all tasks, all activity)
- **fd** → My formulas, lab tests, pending approvals in R&D
- **regulatory** → Pending reviews, rework items, compliance tasks
- **marketing** → PPDs under review, artwork briefs, brand launches
- **production** → Plant trial schedule, batch reports
- All others → Filtered view scoped to their team's projects

Any change made by admin (changing project status, assigning tasks, etc.) is **immediately reflected** when any role refreshes their dashboard.

---

## Frontend Integration

Set this in your Next.js `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

The frontend has a built-in **offline fallback** — if the API is unreachable, it uses seeded demo data so the UI always renders.

---

## Session Timeout

Per SOW requirement: sessions expire after **5 minutes of inactivity**. This is enforced on the frontend via event listeners (mouse/keyboard/touch activity resets the timer). Backend JWT tokens are valid for 480 minutes but the frontend will auto-logout at 5 minutes idle.
