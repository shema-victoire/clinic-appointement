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

export interface AdminPrescription {
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

function doctorName(presc: AdminPrescription): string {
  const name = presc.doctor?.profile?.full_name;
  if (!name) return 'Doctor';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}

export function AdminPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<AdminPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stock shortage banner
  const [stockError, setStockError] = useState<string | null>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<AdminPrescription[]>('/prescriptions');
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

  const handleFulfill = async (prescId: string) => {
    setStockError(null);
    try {
      setFulfillingId(prescId);
      await api(`/prescriptions/${prescId}/fulfill`, {
        method: 'PUT',
      });
      // Mark as fulfilled in state
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === prescId ? { ...p, status: 'FULFILLED' } : p))
      );
    } catch (err: any) {
      if (err instanceof ApiError && err.data?.details && Array.isArray(err.data.details)) {
        // e.g. "Paracetamol 500mg (Need: 10, Have: 5)" -> "Not enough stock: Paracetamol 500mg (Need: 10, Have: 5)"
        setStockError(`Not enough stock: ${err.data.details.join(', ')}`);
      } else if (err instanceof ApiError && err.status === 400 && err.message.toLowerCase().includes('stock')) {
        setStockError(`Not enough stock: ${err.message}`);
      } else {
        setStockError(err.message || 'Failed to fulfill prescription');
      }
    } finally {
      setFulfillingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
        <p className="mt-1 text-sm text-gray-500">Fulfil medications for patient prescriptions</p>
      </div>

      {/* Stock shortage / action banner */}
      {stockError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {stockError}
        </div>
      )}

      {loading && <Loading message="Loading prescriptions..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={fetchPrescriptions} className="mb-6" />
      )}

      {!loading && !error && prescriptions.length === 0 && (
        <EmptyState message="Nothing here yet" />
      )}

      {!loading && !error && prescriptions.length > 0 && (
        <>
          {/* Tablet & Desktop: Table */}
          <div className="hidden sm:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Patient</th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-3">Doctor</th>
                  <th scope="col" className="px-6 py-3">Items</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {prescriptions.map((presc) => {
                  const itemCount = presc.items.length;
                  const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;

                  return (
                    <tr key={presc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                        {formatDate(presc.appointment?.appointment_date || presc.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-900">
                        {presc.patient?.profile?.full_name || 'Patient'}
                      </td>
                      <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-600">
                        {doctorName(presc)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        {itemLabel}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusPill status={presc.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {presc.status === 'PENDING' ? (
                          <button
                            type="button"
                            disabled={fulfillingId === presc.id}
                            onClick={() => handleFulfill(presc.id)}
                            className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition disabled:opacity-50 cursor-pointer"
                          >
                            {fulfillingId === presc.id ? 'Fulfilling...' : 'Fulfil'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone: Cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {prescriptions.map((presc) => {
              const itemCount = presc.items.length;
              const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;

              return (
                <div
                  key={presc.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {presc.patient?.profile?.full_name || 'Patient'}
                    </span>
                    <StatusPill status={presc.status} />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatDate(presc.appointment?.appointment_date || presc.created_at)} · {itemLabel}
                  </div>
                  {presc.status === 'PENDING' && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={fulfillingId === presc.id}
                        onClick={() => handleFulfill(presc.id)}
                        className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition disabled:opacity-50 cursor-pointer"
                      >
                        {fulfillingId === presc.id ? 'Fulfilling...' : 'Fulfil'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

export default AdminPrescriptions;
