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
import { NavBar } from './NavBar';

interface RoleGuardProps {
  allow: Profile['role'][];
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-xl font-semibold text-gray-500">Loading...</h1>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(profile.role)) {
    return (
      <>
        <NavBar />
        <div className="flex min-h-screen items-center justify-center">
          <h1 className="text-xl font-bold text-red-600">Not allowed</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
