import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api';
import { StatusPill } from '../../components/StatusPill';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: 'CONFIRMED' | 'COMPLETED';
  created_at: string;
  doctor?: {
    id?: string;
    profile?: {
      full_name: string | null;
    };
  };
}

function formatDate(dateStr: string): string {
  try {
    const cleanDate = dateStr.slice(0, 10);
    const [year, month, day] = cleanDate.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].slice(0, 5);
    }
    return timeStr.slice(0, 5);
  } catch {
    return timeStr;
  }
}

function doctorName(appt: Appointment): string {
  const name = appt.doctor?.profile?.full_name;
  if (!name) return 'Doctor';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}

export function MyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<Appointment[]>('/appointments');
      setAppointments(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You are not allowed to do this');
      } else {
        setError(err.message || 'Failed to load appointments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage your scheduled visits</p>
        </div>
        <Link
          to="/patient/book"
          className="inline-flex items-center justify-center rounded-md bg-[#0f766e] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 transition"
        >
          + Book appointment
        </Link>
      </div>

      {/* Loading state */}
      {loading && <Loading message="Loading appointments..." />}

      {/* Error state */}
      {!loading && error && (
        <ErrorState message={error} onRetry={fetchAppointments} className="mb-6" />
      )}

      {/* Empty state */}
      {!loading && !error && appointments.length === 0 && (
        <EmptyState message="Nothing here yet" />
      )}

      {/* Appointments List */}
      {!loading && !error && appointments.length > 0 && (
        <>
          {/* Tablet and Desktop: Table */}
          <div className="hidden sm:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Time</th>
                  <th scope="col" className="px-6 py-3">Doctor</th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-3">Reason</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {formatDate(appt.appointment_date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {formatTime(appt.appointment_time)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {doctorName(appt)}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-gray-500 max-w-xs truncate">
                      {appt.reason || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusPill status={appt.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: One card per appointment */}
          <div className="flex flex-col gap-3 sm:hidden">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {formatDate(appt.appointment_date)}
                  </span>
                  <StatusPill status={appt.status} />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {formatTime(appt.appointment_time)} · {doctorName(appt)}
                </div>
                {appt.reason && (
                  <p className="mt-2 text-xs text-gray-600 italic">
                    {appt.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default MyAppointments;
