/**
 * App.tsx – Application router
 *
 * Routes:
 *   /login                        LoginPage (public)
 *   /patient/*                    RoleGuard(PATIENT) → patient pages
 *   /doctor/*                     RoleGuard(DOCTOR)  → doctor pages
 *   /admin/*                      RoleGuard(ADMIN)   → admin pages
 *   *                             → /login fallback
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { RoleGuard } from './components/RoleGuard';
import LoginPage from './pages/LoginPage';
import BookAppointment from './pages/patient/BookAppointment';
import {
  PatientAppointmentsPage,
  PatientPrescriptionsPage,
} from './pages/patient/PatientPages';
import {
  DoctorAppointmentsPage,
  DoctorAppointmentDetailPage,
} from './pages/doctor/DoctorPages';
import {
  AdminUsersPage,
  AdminAppointmentsPage,
  AdminPrescriptionsPage,
  AdminMedicationsPage,
} from './pages/admin/AdminPages';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Patient */}
      <Route
        path="/patient/*"
        element={
          <RoleGuard allow={['PATIENT']}>
            <Routes>
              <Route path="book" element={<BookAppointment />} />
              <Route path="appointments" element={<PatientAppointmentsPage />} />
              <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
              <Route path="*" element={<Navigate to="book" replace />} />
            </Routes>
          </RoleGuard>
        }
      />

      {/* Doctor */}
      <Route
        path="/doctor/*"
        element={
          <RoleGuard allow={['DOCTOR']}>
            <Routes>
              <Route path="appointments" element={<DoctorAppointmentsPage />} />
              <Route path="appointments/:id" element={<DoctorAppointmentDetailPage />} />
              <Route path="*" element={<Navigate to="appointments" replace />} />
            </Routes>
          </RoleGuard>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <RoleGuard allow={['ADMIN']}>
            <Routes>
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="appointments" element={<AdminAppointmentsPage />} />
              <Route path="prescriptions" element={<AdminPrescriptionsPage />} />
              <Route path="medications" element={<AdminMedicationsPage />} />
              <Route path="*" element={<Navigate to="users" replace />} />
            </Routes>
          </RoleGuard>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
