/**
 * VoteCapsule™ — Users Page
 *
 * Full user management for the Super Admin:
 *  - List all users with role badges
 *  - Filter by role / search by email
 *  - Create Agent / Validator / Observer / Candidate / Party Admin / Election Authority
 *  - Click-through to user detail
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, CheckCircle2, XCircle, Clock,
  ChevronRight, UserPlus, Filter,
} from 'lucide-react';
import { usersApi, type User, ROLE_LABELS } from '../api/usersApi';
import { InviteUserModal } from '../components/users/InviteUserModal';
import { clsx } from 'clsx';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  active:      { color: 'text-emerald-700 bg-emerald-50',  icon: CheckCircle2 },
  suspended:   { color: 'text-amber-700 bg-amber-50',      icon: Clock },
  deactivated: { color: 'text-red-700 bg-red-50',          icon: XCircle },
};

// Role filter options — matches the role names in Cognito / DB
const ROLE_FILTER_OPTIONS = [
  { value: '',                  label: 'All Roles' },
  { value: 'CAPSULE_AGENT',     label: '📷 Field Agents' },
  { value: 'VALIDATOR',         label: '🔍 Validators' },
  { value: 'OBSERVER',          label: '👁️ Observers' },
  { value: 'CANDIDATE',         label: '🏛️ Candidates' },
  { value: 'PARTY_ADMIN',       label: '🎗️ Party Admins' },
  { value: 'ELECTION_AUTHORITY',label: '⚖️ Election Authority' },
  { value: 'RETURNING_OFFICER', label: '📋 Returning Officers' },
  { value: 'TENANT_ADMIN',      label: '🏢 Tenant Admins' },
  { value: 'PLATFORM_SUPER_ADMIN', label: '👑 Super Admins' },
];

function UsersPageContent(): React.JSX.Element {
  const navigate = useNavigate();
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.findAll({ page, limit: 20 }),
  });

  const allUsers = data?.data ?? [];

  // Client-side filter (server-side search can be added later)
  const filtered = allUsers.filter((u) => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !roleFilter || (u.roles ?? []).includes(roleFilter);
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.meta.total ?? 0} platform users · {allUsers.filter(u => (u.roles ?? []).includes('CAPSULE_AGENT')).length} agents · {allUsers.filter(u => (u.roles ?? []).includes('VALIDATOR')).length} validators
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="vc-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* ── Quick-create role shortcuts ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { role: 'CAPSULE_AGENT',  label: 'Field Agent',   emoji: '📷', color: 'border-blue-200 hover:bg-blue-50' },
          { role: 'VALIDATOR',      label: 'Validator',     emoji: '🔍', color: 'border-purple-200 hover:bg-purple-50' },
          { role: 'OBSERVER',       label: 'Observer',      emoji: '👁️', color: 'border-teal-200 hover:bg-teal-50' },
          { role: 'ELECTION_AUTHORITY', label: 'Authority', emoji: '⚖️', color: 'border-amber-200 hover:bg-amber-50' },
        ].map((item) => (
          <button
            key={item.role}
            onClick={() => setShowInvite(true)}
            className={clsx(
              'flex items-center gap-3 p-3 bg-white rounded-lg border text-left transition-colors',
              item.color,
            )}
          >
            <span className="text-2xl">{item.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Add {item.label}</p>
              <p className="text-xs text-gray-400">New user</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D]"
          />
        </div>
        <div className="relative flex items-center gap-2 min-w-[200px]">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 py-2 pr-3 pl-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] bg-white"
          >
            {ROLE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No users found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || roleFilter ? 'Try adjusting your filters' : 'Create the first user to get started'}
            </p>
            <button
              onClick={() => setShowInvite(true)}
              className="mt-4 vc-btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Last Login</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user: User) => {
                const cfg  = STATUS_CONFIG[user.status] ?? STATUS_CONFIG['active']!;
                const Icon = cfg.icon;
                const roles = user.roles ?? [];

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/users/${user.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0B3C6D]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#0B3C6D]">
                            {user.email[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.email}</p>
                          <p className="text-xs text-gray-400 font-mono">{user.id.slice(0, 12)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roles.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No role</span>
                        ) : roles.map((role) => {
                          const info = ROLE_LABELS[role];
                          return (
                            <span
                              key={role}
                              className={clsx(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                                info?.color ?? 'bg-gray-100 text-gray-600',
                              )}
                            >
                              {info?.emoji && <span>{info.emoji}</span>}
                              {info?.label ?? role}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page} of {data.meta.totalPages} · {data.meta.total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.meta.hasPreviousPage}
                className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.meta.hasNextPage}
                className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────── */}
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}

export function UsersPage() {
  return (
    <PageErrorBoundary page="Users">
      <UsersPageContent />
    </PageErrorBoundary>
  );
}
