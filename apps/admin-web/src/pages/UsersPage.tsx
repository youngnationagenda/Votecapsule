import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Search, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { usersApi, type User } from '../api/usersApi';
import { clsx } from 'clsx';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  active: { color: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 },
  suspended: { color: 'text-amber-700 bg-amber-50', icon: Clock },
  deactivated: { color: 'text-red-700 bg-red-50', icon: XCircle },
};

export function UsersPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.findAll({ page, limit: 20 }),
  });

  const filtered = (data?.data ?? []).filter(
    (u) => !search || u.email.includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">All platform users across all tenants</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D]"
            aria-label="Search users"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Verified</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Last Login</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user: User) => {
                const cfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.active!;
                const Icon = cfg.icon;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/users/${user.id}`)}>
                    <td className="px-5 py-3 text-sm text-gray-900">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={clsx('vc-badge gap-1', cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={clsx('text-xs', user.emailVerified ? 'text-emerald-600' : 'text-gray-400')}>
                        {user.emailVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {data && data.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {data.meta.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.meta.hasPreviousPage} className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={!data.meta.hasNextPage} className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
