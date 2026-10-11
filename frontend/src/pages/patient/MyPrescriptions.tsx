import { useState, useEffect } from 'react';
import { api, ApiError } from '../../api';
import { StatusPill } from '../../components/StatusPill';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string;
  quantity: number;
  dosage_instructions: string | null;
  medication: {
    id: string;
    name: string;
    quantity_in_stock: number;
    price: string | number;
  };
}

export interface Prescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  status: 'PENDING' | 'FULFILLED';
  created_at: string;
  fulfilled_at: string | null;
  patient?: {
    profile?: {
      full_name: string | null;
      email?: string;
    };
  };
  doctor?: {
    profile?: {
      full_name: string | null;
    };
  };
  items: PrescriptionItem[];
  appointment?: {
    appointment_date: string;
  };
}

export interface ConsultationNote {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  createdAt?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
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

function doctorName(presc: Prescription): string {
  const name = presc.doctor?.profile?.full_name;
  if (!name) return 'Doctor';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}

export function MyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note expansion and fetching state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, ConsultationNote>>({});
  const [loadingNote, setLoadingNote] = useState<Record<string, boolean>>({});
  const [noteError, setNoteError] = useState<Record<string, string>>({});

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<Prescription[]>('/prescriptions');
      setPrescriptions(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You are not allowed to do this');
      } else {
        setError(err.message || 'Failed to load prescriptions');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const toggleNote = async (prescId: string, appointmentId: string) => {
    const isCurrentlyExpanded = !!expanded[prescId];

    if (isCurrentlyExpanded) {
      setExpanded((prev) => ({ ...prev, [prescId]: false }));
      return;
    }

    setExpanded((prev) => ({ ...prev, [prescId]: true }));

    // If note is already loaded, don't re-fetch
    if (notes[appointmentId]) return;

    try {
      setLoadingNote((prev) => ({ ...prev, [appointmentId]: true }));
      setNoteError((prev) => ({ ...prev, [appointmentId]: '' }));
      const noteData = await api<ConsultationNote>(`/consultation-notes/${appointmentId}`);
      setNotes((prev) => ({ ...prev, [appointmentId]: noteData }));
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setNoteError((prev) => ({ ...prev, [appointmentId]: 'No consultation note recorded yet.' }));
      } else if (err instanceof ApiError && err.status === 403) {
        setNoteError((prev) => ({ ...prev, [appointmentId]: 'You are not allowed to view this note.' }));
      } else {
        setNoteError((prev) => ({ ...prev, [appointmentId]: err.message || 'Failed to load consultation note' }));
      }
    } finally {
      setLoadingNote((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Prescriptions & Notes</h1>
        <p className="mt-1 text-sm text-gray-500">Review your past prescriptions and doctor notes</p>
      </div>

      {/* Loading state */}
      {loading && <Loading message="Loading prescriptions..." />}

      {/* Error state */}
      {!loading && error && (
        <ErrorState message={error} onRetry={fetchPrescriptions} className="mb-6" />
      )}

      {/* Empty state */}
      {!loading && !error && prescriptions.length === 0 && (
        <EmptyState message="Nothing here yet" />
      )}

      {/* Prescriptions grid */}
      {!loading && !error && prescriptions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {prescriptions.map((presc) => {
            const isExpanded = !!expanded[presc.id];
            const apptId = presc.appointment_id;
            const note = notes[apptId];
            const isLoadingNote = !!loadingNote[apptId];
            const currentNoteError = noteError[apptId];

            return (
              <div
                key={presc.id}
                className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  {/* Top: Date & Status */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {formatDate(presc.appointment?.appointment_date || presc.created_at)}
                    </span>
                    <StatusPill status={presc.status} />
                  </div>

                  {/* Doctor */}
                  <p className="mt-1 text-sm text-gray-600">{doctorName(presc)}</p>

                  {/* Medicines */}
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Medications
                    </h2>
                    {presc.items.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-400">No medications listed</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5 text-sm text-gray-800">
                        {presc.items.map((item) => (
                          <li key={item.id} className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {item.medication.name} × {item.quantity}
                            </span>
                            {item.dosage_instructions && (
                              <span className="text-xs text-gray-500">
                                {item.dosage_instructions}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Consultation Note Section */}
                <div className="mt-5 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => toggleNote(presc.id, presc.appointment_id)}
                    className="inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800 transition cursor-pointer"
                  >
                    {isExpanded ? 'Hide consultation note ↑' : 'View consultation note >'}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 rounded-md bg-gray-50 p-3.5 text-xs text-gray-700 border border-gray-100">
                      {isLoadingNote && <Loading message="Loading consultation note..." className="py-3" />}

                      {!isLoadingNote && currentNoteError && (
                        <p className="text-amber-800">{currentNoteError}</p>
                      )}

                      {!isLoadingNote && !currentNoteError && note && (
                        <div className="space-y-2">
                          <div>
                            <span className="font-semibold text-gray-800">Symptoms: </span>
                            <span className="text-gray-600">{note.symptoms}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800">Diagnosis: </span>
                            <span className="text-gray-600">{note.diagnosis}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800">Treatment: </span>
                            <span className="text-gray-600">{note.treatment}</span>
                          </div>
                          {note.notes && (
                            <div>
                              <span className="font-semibold text-gray-800">Notes: </span>
                              <span className="text-gray-600">{note.notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default MyPrescriptions;
