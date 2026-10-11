import { useState, useEffect } from 'react';
import { api, ApiError } from '../../api';
import { StatusPill } from '../../components/StatusPill';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  created_at: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<UserProfile[]>('/users');
      setUsers(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You are not allowed to do this');
      } else {
        setError(err.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleMakeDoctor = async (userId: string) => {
    setActionError(null);
    try {
      setUpdatingId(userId);
      const updated = await api<UserProfile>(`/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: 'DOCTOR' }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">Manage user accounts and role assignments</p>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {actionError}
        </div>
      )}

      {loading && <Loading message="Loading users..." />}

      {!loading && error && (
        <ErrorState message={error} onRetry={fetchUsers} className="mb-6" />
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState message="Nothing here yet" />
      )}

      {!loading && !error && users.length > 0 && (
        <>
          {/* Tablet & Desktop: Table */}
          <div className="hidden sm:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Name</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {u.full_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {u.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusPill status={u.role} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {u.role === 'PATIENT' ? (
                        <button
                          type="button"
                          disabled={updatingId === u.id}
                          onClick={() => handleMakeDoctor(u.id)}
                          className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition disabled:opacity-50 cursor-pointer"
                        >
                          {updatingId === u.id ? 'Updating...' : 'Make Doctor'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: Cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {users.map((u) => (
              <div
                key={u.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{u.full_name}</span>
                  <StatusPill status={u.role} />
                </div>
                <p className="mt-1 text-xs text-gray-500">{u.email}</p>
                {u.role === 'PATIENT' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={updatingId === u.id}
                      onClick={() => handleMakeDoctor(u.id)}
                      className="inline-flex items-center rounded border border-[#0f766e] px-3 py-1 text-xs font-medium text-[#0f766e] hover:bg-teal-50 transition disabled:opacity-50 cursor-pointer"
                    >
                      {updatingId === u.id ? 'Updating...' : 'Make Doctor'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default AdminUsers;
