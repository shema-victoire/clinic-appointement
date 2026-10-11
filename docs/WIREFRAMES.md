# Wireframes and Frontend Layout Guide

Source of truth for the React frontend (Checkpoint 3), together with docs/SPEC.md.
The PNG sheets in docs/wireframes/ show every screen at phone (360 px), tablet (768 px) and desktop (1280 px) widths. Build from these. They are wireframes, so match the structure and behaviour, not the exact pixels.

## Breakpoints (Tailwind)
- Phone: below 640 px (default styles)
- Tablet: 640 px and up (sm:)
- Desktop: 1024 px and up (lg:), content container max width 1100 px, centered

## Rules that apply to every screen
- Top navigation bar: logo and name "ClinicCare" on the left. Phone: links collapse into a hamburger menu. Tablet: links plus an avatar. Desktop: links plus a user chip showing the role.
- The active link is highlighted with the accent color and an underline.
- Lists: below 640 px every table becomes one card per row. From 640 px up it is a normal table. Where noted, tablet hides one less important column.
- Forms: one column below 640 px, two columns from 640 px up. Textareas always span the full width. Buttons stack full width on phone.
- Status badges: CONFIRMED teal, COMPLETED gray, PENDING amber, FULFILLED teal. Role badges: PATIENT gray, DOCTOR teal, ADMIN amber.
- Accent color teal (#0f766e) for primary buttons, active links and badges. Neutral grays for everything else. Cards are white with a light border and rounded corners on a light gray page background.
- Every page needs a loading state, an empty state ("Nothing here yet") and an error banner for failed API calls. A 403 shows "You are not allowed to do this".
- After login, redirect by role: Patient to /patient/book, Doctor to /doctor/appointments, Admin to /admin/users. Routes are guarded by role, so a Patient who opens /admin/users is redirected away.

## Navigation per role
- Patient: Book Appointment, My Appointments, My Prescriptions
- Doctor: My Appointments
- Admin: Users, Appointments, Prescriptions, Medications

## Screens

### 01 Login (/login, all roles) - 01-login.png
- Card with title "Sign in", subtitle, a "Continue with Google" button and the note "New accounts start as Patient."
- Starts Google sign-in through Supabase Auth, then calls POST /auth/me to create the profile on first login.
- Desktop: hero image placeholder on the left, card on the right. Tablet: centered card. Phone: full width card.

### 02 Book Appointment (/patient/book) - 02-patient-book.png
- Fields: Doctor (select, from GET /doctors), Date, Time (select of time slots), Reason for visit (textarea). Buttons: Book appointment, Cancel.
- Submits POST /appointments. On 409 show "That time is already taken". On success go to My Appointments with a success message.

### 03 My Appointments (/patient/appointments) - 03-patient-appointments.png
- Button "+ Book appointment" opens the booking screen.
- Columns: Date, Time, Doctor, Reason, Status. Tablet hides Reason. Data from GET /appointments.

### 04 My Prescriptions and Notes (/patient/prescriptions) - 04-patient-prescriptions.png
- One card per prescription: date, status badge, doctor, diagnosis, medicines with quantities, and a link "View consultation note".
- Data from GET /prescriptions. The note link loads GET /consultation-notes/:appointmentId and shows it in a modal or an expanded section.
- Two cards per row on tablet and desktop, one on phone.

### 05 Doctor: My Appointments (/doctor/appointments) - 05-doctor-appointments.png
- Columns: Date, Time, Patient, Reason, Status, Actions (Open). Tablet hides Reason. Phone card title is the patient name. Data from GET /appointments.

### 06 Doctor: Appointment Detail (/doctor/appointments/:id) - 06-doctor-appointment-detail.png
- Summary card: patient name, date and time, reason, status badge.
- Consultation note card: Symptoms, Diagnosis, Treatment, Notes.
- Prescription card: Medication (select from GET /medications), Quantity, Dosage, "+ Add item", and the list of added items each with Remove.
- Button "Complete consultation" sends POST /appointments/:id/complete with the note and the items. Require at least one note field and one prescription item.
- Desktop: note and prescription side by side. Tablet and phone: stacked.

### 07 Admin: Users (/admin/users) - 07-admin-users.png
- Columns: Name, Email, Role, Actions. The button "Make Doctor" appears only on PATIENT rows and calls PUT /users/:id/role.

### 08 Admin: All Appointments (/admin/appointments) - 08-admin-appointments.png
- Read only table: Date, Time, Patient, Doctor, Status. Tablet hides Time. Data from GET /appointments.

### 09 Admin: Prescriptions (/admin/prescriptions) - 09-admin-prescriptions.png
- Columns: Date, Patient, Doctor, Items, Status, Actions. Tablet hides Doctor.
- The "Fulfil" button appears only on PENDING rows and calls PUT /prescriptions/:id/fulfill. If the API says stock is too low, show the red banner naming the medication, as in the wireframe.

### 10 Admin: Medications (/admin/medications) - 10-admin-medications.png
- Columns: Medication, Stock, Price (RWF), Actions (Edit). Button "+ Add medication". Add and Edit open a small form or modal. Data from GET /medications, POST and PUT /medications.
