import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface Doctor {
  id: string;
  profile_id: string;
  specialization: string;
  profile: {
    full_name: string | null;
    email: string;
  };
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30'
];

export function BookAppointment() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await api<Doctor[]>('/doctors');
      setDoctors(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setFetchError('You are not allowed to do this');
      } else {
        setFetchError(err.message || 'Failed to load doctors');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!doctorId || !date || !time) {
      setSubmitError('Please select a doctor, date, and time.');
      return;
    }

    try {
      setSubmitting(true);
      await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: doctorId,
          appointment_date: date,
          appointment_time: time,
          reason: reason.trim() || undefined,
        }),
      });
      navigate('/patient/appointments');
    } catch (err: any) {
      if ((err instanceof ApiError && err.status === 409) || (err.message && err.message.includes('already booked'))) {
        setSubmitError('That time is already taken');
      } else if (err instanceof ApiError && err.status === 403) {
        setSubmitError('You are not allowed to do this');
      } else {
        setSubmitError(err.message || 'Failed to book appointment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/patient/appointments');
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
        <p className="mt-1 text-sm text-gray-500">Choose a doctor, date and time</p>
      </div>

      {loading && <Loading message="Loading doctors..." />}

      {!loading && fetchError && (
        <ErrorState message={fetchError} onRetry={fetchDoctors} className="mb-6" />
      )}

      {!loading && !fetchError && doctors.length === 0 && (
        <EmptyState message="No doctors available" />
      )}

      {!loading && !fetchError && doctors.length > 0 && (
        <div className="mx-auto max-w-[720px] rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {submitError && (
            <div
              role="alert"
              className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
            >
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="doctor-select" className="block text-xs font-semibold text-gray-700">
                  Doctor
                </label>
                <select
                  id="doctor-select"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="">Select...</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.profile.full_name || 'Doctor'} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date-input" className="block text-xs font-semibold text-gray-700">
                  Date
                </label>
                <input
                  id="date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="time-select" className="block text-xs font-semibold text-gray-700">
                  Time
                </label>
                <select
                  id="time-select"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="">Select...</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="reason-textarea" className="block text-xs font-semibold text-gray-700">
                Reason for visit
              </label>
              <textarea
                id="reason-textarea"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe your symptoms or reason for the visit..."
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex justify-center rounded-md bg-[#0f766e] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Booking...' : 'Book appointment'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default BookAppointment;
