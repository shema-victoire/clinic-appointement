/**
 * RoleGuard.tsx
 *
 * Wraps a route group and enforces that the logged-in user has one of the
 * allowed roles. If not authenticated, redirects to /login. If authenticated
 * but wrong role, redirects to the user's own home.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import type { Profile } from '../auth';

function homeForRole(role: Profile['role']): string {
  if (role === 'PATIENT') return '/patient/book';
  if (role === 'DOCTOR') return '/doctor/appointments';
  return '/admin/users';
}

interface RoleGuardProps {
  allow: Profile['role'][];
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-500">Loading…</span>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to={homeForRole(profile.role)} replace />;
  }

  return <>{children}</>;
}
