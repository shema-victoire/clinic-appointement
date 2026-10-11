import { useState, useEffect } from 'react';
import { api, ApiError } from '../../api';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface Medication {
  id: string;
  name: string;
  quantity_in_stock: number;
  price: string | number;
}

export function AdminMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [formName, setFormName] = useState('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<Medication[]>('/medications');
      setMedications(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You are not allowed to do this');
      } else {
        setError(err.message || 'Failed to load medications');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const openAddModal = () => {
    setEditingMed(null);
    setFormName('');
    setFormStock(0);
    setFormPrice(0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMed(med);
    setFormName(med.name);
    setFormStock(med.quantity_in_stock);
    setFormPrice(Number(med.price));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMed(null);
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Medication name is required');
      return;
    }
    if (formStock === '' || Number(formStock) < 0) {
      setFormError('Stock must be 0 or greater');
      return;
    }
    if (formPrice === '' || Number(formPrice) < 0) {
      setFormError('Price must be 0 or greater');
      return;
    }

    try {
      setSaving(true);
      if (editingMed) {
        // Edit existing medication: PUT /medications/:id
        const updated = await api<Medication>(`/medications/${editingMed.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formName.trim(),
            quantity_in_stock: Number(formStock),
            price: Number(formPrice),
          }),
        });
        setMedications((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        );
      } else {
        // Add new medication: POST /medications
        const created = await api<Medication>('/medications', {
          method: 'POST',
          body: JSON.stringify({
            name: formName.trim(),
            quantity_in_stock: Number(formStock),
            price: Number(formPrice),
          }),
        });
        setMedications((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeModal();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save medication');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
          <p className="mt-1 text-sm text-gray-500">Manage pharmacy inventory and unit prices</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-md bg-[#0f766e] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 transition cursor-pointer"
        >
          + Add medication
        </button>
      </div>

      {loading && <Loading message="Loading medications..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={fetchMedications} className="mb-6" />
      )}

      {!loading && !error && medications.length === 0 && (
        <EmptyState message="Nothing here yet" />
      )}

      {!loading && !error && medications.length > 0 && (
        <>
          {/* Tablet & Desktop: Table */}
          <div className="hidden sm:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Medication</th>
                  <th scope="col" className="px-6 py-3">Stock</th>
                  <th scope="col" className="px-6 py-3">Price (RWF)</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {medications.map((med) => (
                  <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {med.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {med.quantity_in_stock}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {Number(med.price).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openEditModal(med)}
                        className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: Cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <h2 className="font-semibold text-gray-900">{med.name}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Stock {med.quantity_in_stock} · {Number(med.price).toLocaleString()} RWF
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditModal(med)}
                  className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition cursor-pointer"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              {editingMed ? 'Edit Medication' : 'Add Medication'}
            </h2>

            {formError && (
              <div
                role="alert"
                className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="med-name" className="block text-xs font-semibold text-gray-700">
                  Medication Name
                </label>
                <input
                  id="med-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="med-stock" className="block text-xs font-semibold text-gray-700">
                  Stock
                </label>
                <input
                  id="med-stock"
                  type="number"
                  min={0}
                  required
                  value={formStock}
                  onChange={(e) =>
                    setFormStock(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="med-price" className="block text-xs font-semibold text-gray-700">
                  Price (RWF)
                </label>
                <input
                  id="med-price"
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={formPrice}
                  onChange={(e) =>
                    setFormPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingMed ? 'Save changes' : 'Add medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminMedications;
