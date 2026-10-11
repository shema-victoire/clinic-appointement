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
import MyAppointments from './pages/patient/MyAppointments';
import MyPrescriptions from './pages/patient/MyPrescriptions';
import DoctorAppointments from './pages/doctor/Appointments';
import AppointmentDetail from './pages/doctor/AppointmentDetail';
import AdminUsers from './pages/admin/Users';
import AdminAppointments from './pages/admin/Appointments';
import AdminPrescriptions from './pages/admin/Prescriptions';
import {
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
              <Route path="appointments" element={<MyAppointments />} />
              <Route path="prescriptions" element={<MyPrescriptions />} />
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
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="appointments/:id" element={<AppointmentDetail />} />
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
              <Route path="users" element={<AdminUsers />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="prescriptions" element={<AdminPrescriptions />} />
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
