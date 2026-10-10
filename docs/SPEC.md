# Clinic Appointment & Prescription Management System

Web Technology Final Project: Requirements, Domain Model and Data Schema

Prepared by Shema Victoire, AUCA, 2026-2027

## 1. Problem Statement, Users, Objectives and Scope

**Problem.** Small clinics often handle appointments, consultation records and prescriptions on paper, in chat apps or in disconnected tools. Patients cannot easily book or review their records, doctors lose time rewriting prescriptions, and pharmacy stock is tracked separately, so prescriptions get delayed and stock runs out unnoticed.

**Target users.** Patients, Doctors, and Clinic Administrators (who also run the pharmacy counter).

**Objectives.**

1. Let patients book appointments and see their appointments, consultation notes and prescriptions online.
2. Let doctors complete consultations, record notes and issue prescriptions in one place.
3. Let the admin fulfil prescriptions and keep medication stock accurate.
4. Notify patients by email when an appointment is confirmed and when a prescription is ready.

**In scope.** Google sign-in, role-based access (Patient, Doctor, Admin), appointment booking, consultation notes, prescriptions, medication stock, email notifications through RabbitMQ, responsive web UI.

**Out of scope.** Separate Pharmacist role, patient-doctor messaging, SMS, appointment reminders, payments, cancelling or rescheduling appointments.

**Design decision.** Pharmacy fulfilment is handled by the Admin role to keep the system focused on the core clinical workflow. Medication and stock are modelled as their own entities, so a dedicated Pharmacist role can be added later without restructuring the data.

## 2. Functional and Business Requirements

| ID | Requirement |
| --- | --- |
| FR1 | Users sign in with Google (OAuth2). A new user is created with the role Patient. |
| FR2 | Admin can list users and promote a Patient to Doctor. |
| FR3 | Patient books an appointment with a doctor for a date and time. Status is CONFIRMED immediately. A doctor cannot be double-booked for the same date and time. |
| FR4 | Patient can view only their own appointments, consultation notes and prescriptions. |
| FR5 | Doctor can view their own appointments. |
| FR6 | Doctor completes an appointment by saving a consultation note (MongoDB) and creating a prescription with items (PostgreSQL). The appointment becomes COMPLETED. |
| FR7 | Admin can view all prescriptions and mark one FULFILLED. The stock of each prescribed medication decreases by the prescribed quantity in a single transaction. Fulfilment fails if any stock is insufficient. |
| FR8 | Admin can add, edit and list medications (name, stock, price). |
| FR9 | Admin can view all appointments. |
| FR10 | An email is sent to the patient when an appointment is confirmed and when a prescription is fulfilled, delivered through RabbitMQ. |
| FR11 | Every protected API route enforces role-based access control on the server. |
| FR12 | The interface is responsive and usable on phone, tablet and desktop. |

## 3. Measurable Quality Attributes

| Attribute | Target |
| --- | --- |
| Usability | A new patient can book a first appointment within 3 minutes of logging in. Pages show no horizontal scrolling at 360, 768 and 1280 px widths. |
| Performance | List endpoints respond in 500 ms or less (95th percentile) with 1,000 seeded rows. First page load takes 3 seconds or less on a 4G connection. All foreign keys and filter columns are indexed. |
| Reliability | Fulfilling a prescription (status change plus stock decrement) runs in one database transaction, so there is no partial fulfilment. If the email worker is offline, messages stay queued (durable queue, persistent messages, manual acknowledgement) and are delivered when it restarts. |
| Security | No passwords are stored (Google OAuth2). A JWT is verified on every request. Missing token gives 401, wrong role gives 403. Secrets live only in environment variables. Row Level Security is enabled on all Supabase tables so the public anon key cannot read data directly. All inputs are validated server-side. |
| Maintainability | Layered backend (routes, controllers, services, data access). Git history with meaningful commits. |

## 4. User Stories and Acceptance Criteria

**US1. Patient books an appointment.** As a patient, I want to book an appointment with a doctor so that I can be seen at a time that suits me.

- Given I am logged in as a patient and the slot is free, when I submit the booking form, then the appointment is saved as CONFIRMED and appears in My Appointments.
- Given the slot is already taken, when I submit, then I see a clear message and nothing is saved (HTTP 409).
- When the appointment is saved, then an appointment.confirmed event is published to RabbitMQ and I receive an email.

**US2. Doctor completes a consultation.** As a doctor, I want to record notes and prescribe medication so that the patient has a complete record.

- Given an appointment assigned to me with status CONFIRMED, when I save a note and at least one prescription item, then the note is stored in MongoDB, the prescription is stored as PENDING, and the appointment becomes COMPLETED.
- Given an appointment assigned to another doctor, when I try to complete it, then the request is rejected (403).

**US3. Admin fulfils a prescription.** As an admin, I want to fulfil a prescription so that the patient can collect their medication.

- Given a PENDING prescription and enough stock, when I click Fulfil, then the status becomes FULFILLED, each medication stock decreases by the prescribed quantity, and the patient receives a prescription.fulfilled email.
- Given insufficient stock for any item, when I click Fulfil, then nothing changes and I see which medication is short.
- Given I am a patient or doctor, when I call the fulfil endpoint, then the request is rejected (403).

## 5. Domain Concepts (abstract)

- **Actors:** Patient, Doctor, Admin.
- **Processes:** sign-in and role assignment, appointment booking, consultation, prescribing, prescription fulfilment, notification.
- **Data objects:** user profile, appointment, consultation note, prescription, prescription item, medication.

## 6. ER Diagram (relationships)

```text
PROFILE 1 ---- 0..1 PATIENT
PROFILE 1 ---- 0..1 DOCTOR
PATIENT 1 ---- * APPOINTMENT * ---- 1 DOCTOR
APPOINTMENT 1 ---- 0..1 PRESCRIPTION
PATIENT 1 ---- * PRESCRIPTION * ---- 1 DOCTOR
PRESCRIPTION 1 ---- * PRESCRIPTION_ITEM * ---- 1 MEDICATION
APPOINTMENT 1 ---- 0..1 CONSULTATION_NOTE   (MongoDB, linked by appointment_id)
```

A drawn version of this diagram is added to the submission document.

## 7. PostgreSQL Schema (Supabase)

```sql
create type user_role as enum ('PATIENT','DOCTOR','ADMIN');
create type appointment_status as enum ('CONFIRMED','COMPLETED');
create type prescription_status as enum ('PENDING','FULFILLED');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'PATIENT',
  created_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  phone text,
  date_of_birth date
);

create table doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  specialization text not null default 'General Practice'
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  doctor_id uuid not null references doctors(id),
  appointment_date date not null,
  appointment_time time not null,
  reason text,
  status appointment_status not null default 'CONFIRMED',
  created_at timestamptz not null default now(),
  unique (doctor_id, appointment_date, appointment_time)
);
create index idx_appointments_patient on appointments(patient_id);
create index idx_appointments_doctor_date on appointments(doctor_id, appointment_date);

create table medications (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  quantity_in_stock integer not null default 0 check (quantity_in_stock >= 0),
  price numeric(10,2) not null check (price >= 0)
);

create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments(id),
  patient_id uuid not null references patients(id),
  doctor_id uuid not null references doctors(id),
  status prescription_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);
create index idx_prescriptions_patient on prescriptions(patient_id);
create index idx_prescriptions_status on prescriptions(status);

create table prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  medication_id uuid not null references medications(id),
  quantity integer not null check (quantity > 0),
  dosage_instructions text,
  unique (prescription_id, medication_id)
);
create index idx_items_medication on prescription_items(medication_id);
```

**Notes.** Row Level Security is enabled on every table with no public policies; only the backend reads and writes data. On first login the API creates the profile and patient rows. When a user is promoted to Doctor, a doctors row is created.

## 8. MongoDB Collection (Atlas)

`consultation_notes`

```json
{
  "_id": "ObjectId",
  "appointmentId": "uuid string (unique index)",
  "patientId": "uuid string",
  "doctorId": "uuid string",
  "symptoms": "string",
  "diagnosis": "string",
  "treatment": "string",
  "notes": "string",
  "createdAt": "date"
}
```

Indexes: unique on `appointmentId`; compound on `patientId` and `createdAt` (descending). Notes are free-form clinical text that varies per visit and is never joined in SQL, which is why they live in a document store.

## 9. API and Access Control (RBAC)

| Endpoint | Patient | Doctor | Admin |
| --- | --- | --- | --- |
| GET /doctors | Yes | Yes | Yes |
| POST /appointments | Yes | No | No |
| GET /appointments | Own only | Own only | All |
| POST /appointments/:id/complete (note and prescription) | No | Own appointments | No |
| GET /prescriptions | Own only | Own only | All |
| PUT /prescriptions/:id/fulfill | No | No | Yes |
| GET /consultation-notes/:appointmentId | Own only | Own only | No |
| GET /medications | No | Yes | Yes |
| POST and PUT /medications | No | No | Yes |
| GET /users and PUT /users/:id/role | No | No | Yes |

Consultation notes are private medical data, so the Admin cannot read them.

## 10. RabbitMQ Events

- Exchange `clinic.events` (direct, durable) and queue `notifications` (durable).
- Routing keys: `appointment.confirmed` and `prescription.fulfilled`.
- Message body (JSON): type, patient email, patient name, and event details. Messages are persistent.
- One worker consumes the queue, sends the email, then acknowledges the message. Email goes out through Nodemailer with SMTP, or a free email API such as Resend, configured by environment variables.

## 11. Architecture and Build Notes

- **Frontend:** React with TypeScript (Vite, Tailwind CSS), responsive. Patient screens: Book Appointment, My Appointments and Prescriptions. Doctor screens: My Appointments, Appointment Detail (note and prescription form). Admin screens: Users, Prescriptions, Medications.
- **Backend:** Node.js with Express and TypeScript, layered. Prisma for PostgreSQL, Mongoose for MongoDB, amqplib for RabbitMQ.
- **Auth flow:** Google sign-in through Supabase Auth, the frontend sends the session JWT as a Bearer token, the API verifies it, loads the role from `profiles`, then RBAC middleware checks the route.
- **First admin:** set the role to ADMIN directly in the `profiles` table for the project owner's email.
- **Configuration:** all credentials in a `.env` file that is never committed, with a `.env.example` committed instead.
- **Git:** a small commit for each feature, finishing with a pull request to the main branch.
- **Definition of done:** the three user stories pass their acceptance criteria end to end.
