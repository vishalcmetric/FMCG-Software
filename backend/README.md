# Zydus Wellness — Platform Backend

FastAPI backend powering the Zydus Wellness Product Development Platform.
Uses **MySQL 8.0** via SQLAlchemy (async) + aiomysql driver.

## Quick Start

### Prerequisites
- Python 3.11+
- MySQL 8.0 running on `localhost:3306`
- A database named `zydus_wellness` (created manually or by the seed script)

```sql
-- Run once in MySQL before starting
CREATE DATABASE IF NOT EXISTS zydus_wellness CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

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
MYSQL_DB=zydus_wellness
```

### 4. Seed demo data
```bash
python seed.py
```
This creates all tables and loads 7 projects, 8 tasks, 8 audit log entries, and 12 users.

### 5. Start the API server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API is now live at **http://localhost:8000**

### 6. API docs (auto-generated)
- Swagger UI: http://localhost:8000/docs
- ReDoc:       http://localhost:8000/redoc

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
| admin@zyduswellness.com | System Administrator |
| source@zyduswellness.com | Source Team |
| fd@zyduswellness.com | R&D / F&D Team Member |
| rd_head@zyduswellness.com | R&D Head |
| marketing@zyduswellness.com | Marketing Team |
| regulatory@zyduswellness.com | Regulatory Team |
| production@zyduswellness.com | Production / Plant Trial |
| ceo@zyduswellness.com | CEO |

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
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The frontend has a built-in **offline fallback** — if the API is unreachable, it uses seeded demo data so the UI always renders.
