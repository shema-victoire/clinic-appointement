import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api';
import { StatusPill } from '../../components/StatusPill';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface DoctorAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: 'CONFIRMED' | 'COMPLETED';
  created_at: string;
  patient?: {
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

export function DoctorAppointments() {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<DoctorAppointment[]>('/appointments');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <p className="mt-1 text-sm text-gray-500">View scheduled patient consultations</p>
      </div>

      {loading && <Loading message="Loading appointments..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={fetchAppointments} className="mb-6" />
      )}

      {!loading && !error && appointments.length === 0 && (
        <EmptyState message="Nothing here yet" />
      )}

      {!loading && !error && appointments.length > 0 && (
        <>
          {/* Tablet & Desktop: Table */}
          <div className="hidden sm:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Time</th>
                  <th scope="col" className="px-6 py-3">Patient</th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-3">Reason</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
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
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {appt.patient?.profile?.full_name || 'Patient'}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-gray-500 max-w-xs truncate">
                      {appt.reason || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusPill status={appt.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        to={`/doctor/appointments/${appt.id}`}
                        className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: Cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {appt.patient?.profile?.full_name || 'Patient'}
                  </span>
                  <StatusPill status={appt.status} />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {formatDate(appt.appointment_date)} · {formatTime(appt.appointment_time)}
                </div>
                {appt.reason && (
                  <p className="mt-1 text-xs text-gray-600 italic">
                    Reason: {appt.reason}
                  </p>
                )}
                <div className="mt-3 flex justify-end">
                  <Link
                    to={`/doctor/appointments/${appt.id}`}
                    className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default DoctorAppointments;
