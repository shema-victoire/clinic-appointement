/**
 * NavBar.tsx
 *
 * Per WIREFRAMES.md:
 * - Left: logo + "ClinicCare" text
 * - Phone (<640 px): hamburger toggle; links collapse into a dropdown
 * - Tablet (≥640 px): inline links + avatar initials
 * - Desktop (≥1024 px): inline links + user chip showing the role
 * - Active link highlighted with accent color + underline
 * - Navigation links vary by role (PATIENT / DOCTOR / ADMIN)
 */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Stethoscope } from 'lucide-react';
import { useAuth } from '../auth';
import { StatusPill } from './StatusPill';
import type { Profile } from '../auth';

interface NavItem {
  label: string;
  to: string;
}

function linksForRole(role: Profile['role']): NavItem[] {
  if (role === 'PATIENT') {
    return [
      { label: 'Book Appointment', to: '/patient/book' },
      { label: 'My Appointments', to: '/patient/appointments' },
      { label: 'My Prescriptions', to: '/patient/prescriptions' },
    ];
  }
  if (role === 'DOCTOR') {
    return [{ label: 'My Appointments', to: '/doctor/appointments' }];
  }
  // ADMIN
  return [
    { label: 'Users', to: '/admin/users' },
    { label: 'Appointments', to: '/admin/appointments' },
    { label: 'Prescriptions', to: '/admin/prescriptions' },
    { label: 'Medications', to: '/admin/medications' },
  ];
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function NavBar() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!profile) return null;

  const links = linksForRole(profile.role);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'text-sm font-medium transition-colors',
      isActive
        ? 'text-teal-700 underline underline-offset-4'
        : 'text-gray-600 hover:text-teal-700',
    ].join(' ');

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-teal-700" />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            ClinicCare
          </span>
        </div>

        {/* Desktop & tablet links */}
        <div className="hidden sm:flex sm:items-center sm:gap-6">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Tablet: avatar initials */}
          <div className="hidden sm:flex lg:hidden items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
              {initials(profile.full_name)}
            </div>
          </div>

          {/* Desktop: role chip */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {profile.full_name}
            </span>
            <StatusPill status={profile.role} />
            <button
              onClick={signOut}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>

          {/* Hamburger (phone only) */}
          <button
            className="sm:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          <hr className="border-gray-100" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {profile.full_name}
              </p>
              <StatusPill status={profile.role} className="mt-1" />
            </div>
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
