/**
 * VoteCapsule™ — User Detail Page
 *
 * Full view + management of a single user:
 *  - Profile details (email, name, status, last login)
 *  - Role badges + add/remove role
 *  - Tenant membership
 *  - Suspend / reactivate / delete
 *  - Cognito sub (for debugging)
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Shield,
  Trash2, AlertTriangle, Plus, X as RemoveIcon, Building2,
} from 'lucide-react';
import { usersApi, ROLE_LABELS, MOBILE_ROLES } from '../api/usersApi';
import { tenantApi } from '../api/tenantApi';
import { clsx } from 'clsx';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  active:      { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'Active' },
  suspended:   { color: 'text-amber-700 bg-amber-50 border-amber-200',       icon: Clock,        label: 'Suspended' },
  deactivated: { color: 'text-red-700 bg-red-50 border-red-200',             icon: XCircle,      label: 'Deactivated' },
};

function UserDetailPageContent(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showAddRole, setShowAddRole]     = useState(false);
  const [roleToAdd, setRoleToAdd]         = useState('CAPSULE_AGENT');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssignTenant, setShowAssignTenant] = useState(false);
  const [tenantToAssign, setTenantToAssign]     = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.findById(id!),
    enabled: !!id,
  });

  // Fetch tenants for assignment dropdown
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', 'all-for-assign'],
    queryFn: () => tenantApi.findAll({ page: 1, limit: 200 }),
    enabled: showAssignTenant,
  });

  // Status toggle mutation
  const statusMutation = useMutation({
    mutationFn: (status: string) => usersApi.update(id!, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
  });

  // Add role mutation — updates roles array and refreshes user
  const addRoleMutation = useMutation({
    mutationFn: (roleName: string) => {
      const newRoles = [...(user?.roles ?? []), roleName];
      return usersApi.update(id!, { roles: newRoles });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', id] });
      setShowAddRole(false);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: (roleName: string) => {
      const newRoles = (user?.roles ?? []).filter(r => r !== roleName);
      return usersApi.update(id!, { roles: newRoles });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
  });

  // Assign tenant mutation
  const assignTenantMutation = useMutation({
    mutationFn: (tenantId: string) => usersApi.update(id!, { tenantId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', id] });
      setShowAssignTenant(false);
      setTenantToAssign('');
    },
  });

  // Soft delete
  const deleteMutation = useMutation({
    mutationFn: () => usersApi.update(id!, { status: 'deactivated' }),
    onSuccess: () => navigate('/users'),
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading user…</div>;
  if (!user)     return <div className="p-8 text-center text-red-600">User not found</div>;

  const cfg    = STATUS_CONFIG[user.status] ?? STATUS_CONFIG['active']!;
  const Icon   = cfg.icon;
  const roles  = user.roles ?? [];
  const existingRoleNames = new Set(roles);
  const availableRoles    = MOBILE_ROLES.filter(r => !existingRoleNames.has(r.name));

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Back nav ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/users')}
          className="p-2 rounded-md hover:bg-gray-100"
          aria-label="Back to users"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{user.email}</h1>
          <p className="text-xs text-gray-400 font-mono">{user.id}</p>
        </div>
        <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border', cfg.color)}>
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </span>
      </div>

      {/* ── Profile card ─────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Profile</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-400">Email</dt>
            <dd className="font-medium mt-1 text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Email Verified</dt>
            <dd className={clsx('font-medium mt-1', user.emailVerified ? 'text-emerald-600' : 'text-gray-400')}>
              {user.emailVerified ? '✓ Verified' : 'Unverified'}
            </dd>
          </div>
          {user.profile?.firstName && (
            <div>
              <dt className="text-gray-400">Name</dt>
              <dd className="font-medium mt-1 text-gray-900">
                {[user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ')}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">Tenant</dt>
            <dd className="font-medium mt-1 text-gray-900">
              {user.tenantId ? (
                <button
                  onClick={() => navigate(`/tenants/${user.tenantId}`)}
                  className="text-[#0B3C6D] hover:underline font-mono text-xs inline-flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3" />
                  {user.tenantId.slice(0, 8)}…
                </button>
              ) : (
                <span className="text-gray-400 text-xs">
                  None —{' '}
                  <button
                    onClick={() => setShowAssignTenant(true)}
                    className="text-[#0B3C6D] hover:underline"
                  >
                    Assign tenant
                  </button>
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Last Login</dt>
            <dd className="font-medium mt-1 text-gray-900">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Created</dt>
            <dd className="font-medium mt-1 text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {/* ── Roles card ───────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Roles</h2>
          {availableRoles.length > 0 && (
            <button
              onClick={() => setShowAddRole((v) => !v)}
              className="flex items-center gap-1 text-xs text-[#0B3C6D] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Role
            </button>
          )}
        </div>

        {/* Current roles */}
        {roles.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No roles assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {roles.map((role) => {
              const info = ROLE_LABELS[role];
              return (
                <span
                  key={role}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border',
                    info?.color ?? 'bg-gray-100 text-gray-600 border-gray-200',
                  )}
                >
                  {info?.emoji && <span>{info.emoji}</span>}
                  {info?.label ?? role}
                  <button
                    onClick={() => removeRoleMutation.mutate(role)}
                    disabled={removeRoleMutation.isPending}
                    className="ml-1 hover:opacity-70"
                    aria-label={`Remove ${role} role`}
                  >
                    <RemoveIcon className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Add role selector */}
        {showAddRole && (
          <div className="mt-3 flex gap-2 items-center border-t border-gray-100 pt-3">
            <select
              value={roleToAdd}
              onChange={(e) => setRoleToAdd(e.target.value)}
              className="flex-1 py-1.5 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] bg-white"
            >
              {availableRoles.map((r) => (
                <option key={r.name} value={r.name}>
                  {ROLE_LABELS[r.name]?.emoji ?? ''} {ROLE_LABELS[r.name]?.label ?? r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => addRoleMutation.mutate(roleToAdd)}
              disabled={addRoleMutation.isPending}
              className="vc-btn-primary text-xs py-1.5 px-3"
            >
              {addRoleMutation.isPending ? 'Adding…' : 'Add'}
            </button>
            <button onClick={() => setShowAddRole(false)} className="text-gray-400 hover:text-gray-600">
              <RemoveIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Tenant Assignment (shown when "Assign tenant" clicked) */}
      {showAssignTenant && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Assign Tenant</h2>
          <div className="flex gap-2 items-center">
            <select
              value={tenantToAssign}
              onChange={(e) => setTenantToAssign(e.target.value)}
              className="flex-1 py-1.5 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] bg-white"
            >
              <option value="">Select a tenant…</option>
              {(tenantsData?.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
            <button
              onClick={() => tenantToAssign && assignTenantMutation.mutate(tenantToAssign)}
              disabled={!tenantToAssign || assignTenantMutation.isPending}
              className="vc-btn-primary text-xs py-1.5 px-3"
            >
              {assignTenantMutation.isPending ? 'Assigning…' : 'Assign'}
            </button>
            <button onClick={() => setShowAssignTenant(false)} className="text-gray-400 hover:text-gray-600">
              <RemoveIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Actions card ─────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {user.status === 'active' ? (
            <button
              onClick={() => statusMutation.mutate('suspended')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-amber-300 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Suspend User
            </button>
          ) : user.status === 'suspended' ? (
            <button
              onClick={() => statusMutation.mutate('active')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Reactivate User
            </button>
          ) : null}

          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Deactivate User
          </button>
        </div>

        {/* Confirm delete */}
        {confirmDelete && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Deactivate this user?</p>
                <p className="text-xs text-red-600 mt-1">
                  This will set the user status to deactivated. Their data is preserved.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deactivating…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Debug info (collapsible) ─────────────────────── */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 select-none">
          <Shield className="w-3 h-3" />
          Developer info
        </summary>
        <div className="mt-2 bg-gray-50 rounded-lg p-4 text-xs font-mono space-y-1 text-gray-600 border border-gray-100">
          <p><span className="text-gray-400">id:</span> {user.id}</p>
          <p><span className="text-gray-400">roles:</span> {JSON.stringify(user.roles)}</p>
          <p><span className="text-gray-400">tenantId:</span> {user.tenantId ?? 'null'}</p>
          <p><span className="text-gray-400">status:</span> {user.status}</p>
          <p><span className="text-gray-400">emailVerified:</span> {String(user.emailVerified)}</p>
        </div>
      </details>
    </div>
  );
}

export function UserDetailPage() {
  return (
    <PageErrorBoundary page="User Detail">
      <UserDetailPageContent />
    </PageErrorBoundary>
  );
}
