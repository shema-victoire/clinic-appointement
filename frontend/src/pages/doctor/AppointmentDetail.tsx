import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api';
import { StatusPill } from '../../components/StatusPill';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';

export interface AppointmentDetailData {
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
      email?: string;
    };
  };
}

export interface Medication {
  id: string;
  name: string;
  quantity_in_stock: number;
  price: string | number;
}

export interface AddedPrescriptionItem {
  medication_id: string;
  name: string;
  quantity: number;
  dosage_instructions: string;
}

export interface ExistingConsultationNote {
  symptoms: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
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

export function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<AppointmentDetailData | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note fields
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');

  // Prescription builder
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [dosage, setDosage] = useState('');
  const [items, setItems] = useState<AddedPrescriptionItem[]>([]);

  // Validation & Submission
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [apptData, medsData] = await Promise.all([
        api<AppointmentDetailData>(`/appointments/${id}`),
        api<Medication[]>('/medications'),
      ]);
      setAppointment(apptData);
      setMedications(medsData);

      // If already COMPLETED, load consultation note if available
      if (apptData.status === 'COMPLETED') {
        try {
          const noteData = await api<ExistingConsultationNote>(`/consultation-notes/${id}`);
          if (noteData) {
            setSymptoms(noteData.symptoms || '');
            setDiagnosis(noteData.diagnosis || '');
            setTreatment(noteData.treatment || '');
            setNotes(noteData.notes || '');
          }
        } catch {
          // Note may not be found or not needed
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You are not allowed to do this');
      } else {
        setError(err.message || 'Failed to load appointment details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedMedId) {
      setValidationError('Please select a medication');
      return;
    }
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      setValidationError('Please enter a valid quantity');
      return;
    }

    const med = medications.find((m) => m.id === selectedMedId);
    if (!med) return;

    // Check if already added
    if (items.some((i) => i.medication_id === selectedMedId)) {
      setValidationError('This medication has already been added');
      return;
    }

    setItems([
      ...items,
      {
        medication_id: med.id,
        name: med.name,
        quantity: qtyNum,
        dosage_instructions: dosage.trim(),
      },
    ]);

    setSelectedMedId('');
    setQuantity('');
    setDosage('');
  };

  const handleRemoveItem = (medId: string) => {
    setItems(items.filter((i) => i.medication_id !== medId));
  };

  const handleComplete = async () => {
    setValidationError(null);
    setSubmitError(null);

    // Validation per requirements:
    // Require at least one filled note field and at least one prescription item
    const hasNote = Boolean(
      symptoms.trim() || diagnosis.trim() || treatment.trim() || notes.trim()
    );
    if (!hasNote) {
      setValidationError('Please fill in at least one consultation note field.');
      return;
    }

    if (items.length === 0) {
      setValidationError('Please add at least one prescription item.');
      return;
    }

    try {
      setSubmitting(true);
      await api(`/appointments/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          symptoms: symptoms.trim() || undefined,
          diagnosis: diagnosis.trim() || undefined,
          treatment: treatment.trim() || undefined,
          notes: notes.trim() || undefined,
          prescriptionItems: items.map((i) => ({
            medication_id: i.medication_id,
            quantity: i.quantity,
            dosage_instructions: i.dosage_instructions || undefined,
          })),
        }),
      });
      navigate('/doctor/appointments');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to complete consultation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <Loading message="Loading appointment details..." />
      </main>
    );
  }

  if (error || !appointment) {
    return (
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <ErrorState message={error || 'Appointment not found'} onRetry={loadData} />
      </main>
    );
  }

  const isCompleted = appointment.status === 'COMPLETED';

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/doctor/appointments"
          className="text-xs font-semibold text-[#0f766e] hover:underline"
        >
          &lt; Back to appointments
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Appointment Detail</h1>

      {/* Summary Card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {appointment.patient?.profile?.full_name || 'Patient'}
          </h2>
          <StatusPill status={appointment.status} />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {formatDate(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Reason: {appointment.reason || 'None provided'}
        </p>
      </div>

      {/* Validation / Submit error alerts */}
      {validationError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800"
        >
          {validationError}
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {submitError}
        </div>
      )}

      {/* Desktop: side by side. Tablet/phone: stacked */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Consultation Note */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Consultation note</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="symptoms" className="block text-xs font-semibold text-gray-700">
                Symptoms
              </label>
              <textarea
                id="symptoms"
                rows={3}
                disabled={isCompleted}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Patient symptoms..."
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="diagnosis" className="block text-xs font-semibold text-gray-700">
                Diagnosis
              </label>
              <input
                id="diagnosis"
                type="text"
                disabled={isCompleted}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Confirmed diagnosis..."
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="treatment" className="block text-xs font-semibold text-gray-700">
                Treatment
              </label>
              <textarea
                id="treatment"
                rows={3}
                disabled={isCompleted}
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="Treatment plan..."
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                disabled={isCompleted}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Prescription */}
        <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="mb-4 text-base font-bold text-gray-900">Prescription</h2>

            {!isCompleted ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="medication" className="block text-xs font-semibold text-gray-700">
                      Medication
                    </label>
                    <select
                      id="medication"
                      value={selectedMedId}
                      onChange={(e) => setSelectedMedId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      <option value="">Select...</option>
                      {medications.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.quantity_in_stock} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-xs font-semibold text-gray-700">
                      Quantity
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="0"
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dosage" className="block text-xs font-semibold text-gray-700">
                    Dosage
                  </label>
                  <input
                    id="dosage"
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 2 per day"
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center rounded border border-[#0f766e] px-4 py-1.5 text-xs font-semibold text-[#0f766e] hover:bg-teal-50 transition cursor-pointer"
                  >
                    + Add item
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Appointment completed. Prescriptions are locked.
              </p>
            )}

            {/* List of added items */}
            <div className="mt-6 space-y-2">
              {items.length === 0 && !isCompleted && (
                <p className="text-xs text-gray-400">No items added yet</p>
              )}
              {items.map((item) => (
                <div
                  key={item.medication_id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      x {item.quantity} {item.dosage_instructions && `· ${item.dosage_instructions}`}
                    </p>
                  </div>
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.medication_id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Complete consultation button */}
      {!isCompleted && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={handleComplete}
            className="w-full sm:w-auto inline-flex justify-center rounded-md bg-[#0f766e] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-50 transition cursor-pointer"
          >
            {submitting ? 'Saving...' : 'Complete consultation'}
          </button>
        </div>
      )}
    </main>
  );
}

export default AppointmentDetail;
