# ClinicCare – Appointment & Prescription Management System

A full-stack web application that lets patients book GP appointments, doctors review and complete consultations, and admins manage users, medications and prescriptions. It is built as a monorepo with a Node/Express REST API, a React SPA, a RabbitMQ email worker, and three external data stores (Supabase/PostgreSQL, MongoDB Atlas, CloudAMQP).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Supabase JS |
| Backend API | Node.js, Express 4, TypeScript, Prisma 5 (ORM) |
| Auth | Supabase Auth (Google OAuth) |
| Primary DB | Supabase / PostgreSQL (appointments, prescriptions, medications, users) |
| Document DB | MongoDB Atlas (consultation notes) |
| Message queue | RabbitMQ via CloudAMQP |
| Email worker | Nodemailer (SMTP) consuming RabbitMQ events |
| Testing | Jest + Supertest (backend) |

---

## Prerequisites

- Node.js ≥ 20 and npm ≥ 10
- A [Supabase](https://supabase.com) project (PostgreSQL + Auth with Google provider enabled)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A [CloudAMQP](https://www.cloudamqp.com) instance (free "Little Lemur" tier works)
- An SMTP server or Gmail app-password for outgoing email

---

## Setup

```bash
# 1. Clone
git clone https://github.com/shema-victoire/clinic-appointement.git
cd clinic-appointement

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Configure environment
cp .env.example .env
# Open .env and fill in every value – see the table below
```

---

## Environment Variables

Copy `.env.example` to `.env` and supply real values. **Never commit `.env`.**

### Backend

| Variable | Meaning |
|---|---|
| `SUPABASE_URL` | Supabase project URL (Project Settings › API) |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key – backend only, never sent to browser |
| `DATABASE_URL` | Postgres connection string for Prisma (Supabase › Database › URI) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (registered inside Supabase Dashboard) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `MONGODB_URI` | MongoDB Atlas connection string (stores consultation notes) |
| `AMQP_URL` | Full CloudAMQP AMQP URL (appointment event queue) |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port (usually 587 or 465) |
| `SMTP_USER` | SMTP login username |
| `SMTP_PASS` | SMTP login password or app-password |
| `EMAIL_FROM` | "From" address for outgoing notification emails |
| `PORT` | Port the Express server listens on (default `5000`) |
| `FRONTEND_URL` | Frontend origin used for CORS (e.g. `http://localhost:5173`) |

### Frontend (Vite reads `VITE_*` at build time)

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Full URL of the Express API (e.g. `http://localhost:5000`) |
| `VITE_SUPABASE_URL` | Same value as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same value as `SUPABASE_ANON_KEY` |

---

## Running Locally (three terminals)

**Terminal 1 – Backend API**
```bash
cd backend
npm run dev
```

**Terminal 2 – Email worker**
```bash
cd backend
npm run worker
```

**Terminal 3 – Frontend**
```bash
cd frontend
npm run dev
```

The frontend dev server starts on `http://localhost:5173` by default.

---

## Running Tests

```bash
cd backend
npm test
```

All tests are Jest + Supertest integration tests with mocked Prisma and Supabase; no real database connections are made.

---

## Creating the First Admin

Supabase Auth assigns every new Google sign-in the `PATIENT` role. To bootstrap an admin:

1. Sign in once with the target Google account so the profile row is created.
2. Open the Supabase Dashboard › Table Editor › `profiles`.
3. Find the row and set `role` to `ADMIN` (or run the SQL below):
   ```sql
   UPDATE profiles SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```
4. Sign out and sign back in – the app will redirect to the Admin dashboard.

**Promoting a Doctor:** Log in as Admin, go to **Users**, find the account and use the role dropdown to set it to `DOCTOR`.

---

## Role & Access Summary

| Role | Can do |
|---|---|
| **PATIENT** | Book appointments, view own appointments, view own prescriptions |
| **DOCTOR** | View own appointments, complete consultations (adds notes + prescription), view all prescriptions |
| **ADMIN** | View/change all user roles, view all appointments, fulfill prescriptions, manage medication stock |

---

## Project Structure

```
clinic-appointement/
├── .env.example          # Template – copy to .env and fill in values
├── .gitignore
├── docs/
│   ├── SPEC.md           # Functional specification
│   └── WIREFRAMES.md     # Screen-by-screen wireframe descriptions
├── backend/
│   ├── prisma/           # Prisma schema and migrations
│   └── src/
│       ├── config/       # Environment validation (env.ts)
│       ├── db/           # Prisma client, Mongoose, RabbitMQ connection, seed
│       ├── middleware/    # authenticate, requireRole
│       ├── routes/       # auth, appointments, doctors, medications,
│       │                 #   prescriptions, users, health
│       ├── services/     # RabbitMQ publisher
│       ├── __tests__/    # Jest + Supertest tests
│       ├── server.ts     # Express entry point
│       └── worker.ts     # RabbitMQ → Nodemailer email worker
└── frontend/
    └── src/
        ├── components/   # NavBar, RoleGuard, Loading, EmptyState,
        │                 #   ErrorState, StatusPill
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── patient/  # BookAppointment, MyAppointments, MyPrescriptions
        │   ├── doctor/   # Appointments, AppointmentDetail
        │   └── admin/    # Users, Appointments, Prescriptions, Medications
        ├── api.ts        # Typed fetch wrapper
        ├── auth.tsx      # AuthContext, AuthProvider, useAuth
        ├── supabase.ts   # Supabase browser client
        └── App.tsx       # Route definitions
```

---

## Documentation

- [Functional Specification](docs/SPEC.md)
- [Wireframes](docs/WIREFRAMES.md)
