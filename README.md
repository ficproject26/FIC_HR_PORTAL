# HR CRM — Monitoring & Lead Management System

A full-stack HR Monitoring and Lead Management CRM with separate Admin and HR dashboards, real-time updates via Socket.io, and comprehensive analytics.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router v6 |
| Charts | Recharts |
| Real-time | Socket.io-client |
| HTTP | Axios |
| Backend | Node.js, Express.js |
| Auth | JWT (8h expiry) |
| WebSocket | Socket.io |
| Database | PostgreSQL |
| File Upload | Multer + xlsx |

---

## Project Structure

```
HR/
├── backend/
│   ├── config/
│   │   ├── db.js           # PostgreSQL pool
│   │   ├── schema.sql      # Full DB schema
│   │   └── seed.js         # Demo data seeder
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── routes/
│   │   ├── auth.js         # Login/logout/profile
│   │   ├── admin.js        # Admin dashboard & HR mgmt
│   │   ├── hr.js           # HR dashboard & follow-ups
│   │   ├── leads.js        # Lead CRUD + bulk upload
│   │   ├── attendance.js   # Login tracking
│   │   ├── performance.js  # Metrics & comparison
│   │   ├── notifications.js
│   │   ├── reports.js      # Excel exports
│   │   ├── candidates.js   # Candidate profiles
│   │   └── tasks.js        # Task management
│   ├── socket/
│   │   └── socketHandlers.js  # Real-time events
│   ├── uploads/            # File storage
│   ├── .env                # Environment config
│   └── server.js           # Entry point
│
└── frontend/
    └── src/
        ├── components/
        │   ├── ui/         # Reusable UI components
        │   └── ProtectedRoute.jsx
        ├── layouts/
        │   ├── AdminLayout.jsx
        │   └── HRLayout.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── admin/      # Admin pages
        │   └── hr/         # HR pages
        ├── store/          # Zustand stores
        └── utils/          # API, socket, helpers
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```sql
-- In psql or pgAdmin:
CREATE DATABASE hr_crm_db;
\c hr_crm_db
\i backend/config/schema.sql
```

### 2. Configure Environment

Edit `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_crm_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000
```

### 3. Install & Run

```bash
# Backend
cd backend
npm install
npm run seed      # Load demo data
npm run dev       # Start on :5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev       # Start on :3000
```

Or double-click the `.bat` files:
- `start-backend.bat`
- `start-frontend.bat`

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hrcrm.com | password |
| HR 1 | priya@hrcrm.com | password |
| HR 2 | rahul@hrcrm.com | password |
| HR 3 | anjali@hrcrm.com | password |

---

## Features

### Admin Dashboard
- **Overview** — Total HR, active today, leads, conversions, pending follow-ups, conversion rate
- **HR Monitoring** — Real-time online/offline status, login/logout times, working hours, idle time, today's activity
- **Lead Management** — Full CRUD, bulk Excel upload, status pipeline, assign to HR, filters
- **HR Management** — Add/edit/block/unblock HR users, reset passwords, view performance
- **Performance** — Comparison charts, daily/weekly/monthly metrics per HR
- **Reports** — Export leads, performance, attendance to Excel
- **Notifications** — System alerts, missed follow-up warnings

### HR Dashboard
- **Overview** — Assigned leads, pending follow-ups, today's targets, conversion stats
- **My Leads** — Update status, add notes, schedule follow-ups, pipeline view
- **Follow-ups** — Pending/completed/missed list, complete with outcome
- **Calendar** — Monthly calendar view with follow-up dots, upcoming panel
- **Candidates** — Profile management, resume upload, skills, salary, education
- **Tasks** — Create/complete/delete tasks with priority and due dates
- **Profile** — Edit info, change password

### Real-time (Socket.io)
- Online/offline status broadcast
- New notification push
- Lead added/updated events
- Missed follow-up alerts (every 5 min)
- Idle time tracking

---

## API Reference

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/me
POST   /api/auth/change-password

GET    /api/admin/dashboard
GET    /api/admin/monitoring
GET    /api/admin/hr-users
POST   /api/admin/hr-users
PUT    /api/admin/hr-users/:id
POST   /api/admin/hr-users/:id/block
POST   /api/admin/hr-users/:id/reset-password
DELETE /api/admin/hr-users/:id

GET    /api/leads
POST   /api/leads
PUT    /api/leads/:id
DELETE /api/leads/:id
POST   /api/leads/bulk-upload
GET    /api/leads/pipeline/stats

GET    /api/hr/dashboard
GET    /api/hr/follow-ups
POST   /api/hr/follow-ups
PUT    /api/hr/follow-ups/:id
GET    /api/hr/calendar

GET    /api/attendance
GET    /api/attendance/today
GET    /api/attendance/my

GET    /api/performance
GET    /api/performance/today
POST   /api/performance/log
GET    /api/performance/comparison

GET    /api/reports/leads?format=excel
GET    /api/reports/performance?format=excel
GET    /api/reports/attendance?format=excel

GET    /api/candidates
GET    /api/candidates/:id
PUT    /api/candidates/:id
POST   /api/candidates/:id/resume

GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/notifications
PUT    /api/notifications/:id/read
PUT    /api/notifications/read-all
```
