/**
 * VoteCapsule™ — Tenant Members Page
 *
 * Lists members of a tenant and allows adding users as members with a role.
 * Flow: Search existing user by email → assign role → add to tenant.
 */

import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Users, UserPlus, Search,
  X, Shield, Trash2, AlertCircle,
} from 'lucide-react';
import { tenantApi } from '../api/tenantApi';
import { usersApi, ROLE_LABELS, MOBILE_ROLES, type User } from '../api/usersApi';
import { identityClient, tenantClient } from '../api/apiClient';
import { clsx } from 'clsx';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/slices/uiSlice';

interface TenantMember {
  id: string;
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
  status: string;
  joinedAt: string;
}

function TenantMembersPageContent(): React.JSX.Element {
  const { id: tenantId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searchError, setSearchError] = useState('');
  const [selectedRole, setSelectedRole] = useState('PARTY_ADMIN');
  const [searching, setSearching] = useState(false);

  // Fetch tenant members
  const { data: members, isLoading, error } = useQuery({
    queryKey: ['tenant-members', tenantId],
    queryFn: () => tenantApi.getMembers(tenantId!),
    enabled: !!tenantId,
  });

  const membersList = (Array.isArray(members) ? members : (members as Record<string, unknown>)?.data ?? []) as TenantMember[];

  // Add member mutation — assigns user to tenant + role
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Update user: set tenantId + roles
      await usersApi.update(userId, {
        tenantId: tenantId!,
        roles: [role],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-members', tenantId] });
      dispatch(addToast({ type: 'success', title: 'Member Added', message: 'User has been added to this tenant.' }));
      setShowAddModal(false);
      setSearchEmail('');
      setSearchResult(null);
    },
    onError: () => {
      dispatch(addToast({ type: 'error', title: 'Failed', message: 'Could not add member. Check the user exists.' }));
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await tenantClient.delete(`/tenants/${tenantId}/members/${userId}`).catch(() => {
        // Fallback: update user to remove tenantId
        return usersApi.update(userId, { roles: [] });
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-members', tenantId] });
      dispatch(addToast({ type: 'success', title: 'Member Removed', message: 'User removed from tenant.' }));
    },
  });

  // Search for user by email
  const handleSearch = useCallback(async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const { data } = await identityClient.get('/users', {
        params: { search: searchEmail.trim(), limit: 1 },
      });
      const users = (data?.data ?? data ?? []) as User[];
      if (users.length > 0) {
        setSearchResult(users[0]!);
      } else {
        setSearchError('No user found with that email. Create the user first from Users page.');
      }
    } catch {
      setSearchError('Search failed. Check API connection.');
    } finally {
      setSearching(false);
    }
  }, [searchEmail]);

  const handleAddMember = useCallback(() => {
    if (!searchResult) return;
    addMemberMutation.mutate({ userId: searchResult.id, role: selectedRole });
  }, [searchResult, selectedRole, addMemberMutation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/tenants/${tenantId}`)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Members</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="vc-btn-primary ml-auto flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading members…</div>
        ) : error ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Could not load members</p>
            <p className="text-xs text-gray-400 mt-1">The endpoint may not be deployed yet. Add members via the user detail page.</p>
          </div>
        ) : membersList.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No members yet</p>
            <p className="text-xs text-gray-400 mt-1">Add team members to grant them portal access</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {membersList.map((member) => {
                const roleInfo = ROLE_LABELS[member.role ?? ''];
                return (
                  <tr key={member.id || member.userId} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{member.email}</p>
                      {(member.firstName || member.lastName) && (
                        <p className="text-xs text-gray-400">{[member.firstName, member.lastName].filter(Boolean).join(' ')}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {roleInfo ? (
                        <span className={clsx('vc-badge', roleInfo.color)}>
                          {roleInfo.emoji} {roleInfo.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{member.role ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={clsx('vc-badge', member.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-600 bg-gray-100')}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                        disabled={removeMemberMutation.isPending}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        aria-label="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add Member</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Search user by email */}
            <div className="space-y-4">
              <div>
                <label className="vc-label">Search User by Email</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="vc-input pl-9"
                      placeholder="user@example.com"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchEmail.trim()}
                    className="vc-btn-primary px-4"
                  >
                    {searching ? '…' : 'Find'}
                  </button>
                </div>
                {searchError && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{searchError}
                  </p>
                )}
              </div>

              {/* Search result */}
              {searchResult && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{searchResult.email}</p>
                  <p className="text-xs text-gray-500">ID: {searchResult.id.slice(0, 8)}… | Status: {searchResult.status}</p>
                </div>
              )}

              {/* Role selection */}
              {searchResult && (
                <div>
                  <label className="vc-label flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#0B3C6D]" />
                    Assign Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="vc-input"
                  >
                    {MOBILE_ROLES.filter(r => [
                      'PARTY_ADMIN', 'TENANT_ADMIN', 'CAPSULE_AGENT',
                      'VALIDATOR', 'OBSERVER', 'CANDIDATE',
                    ].includes(r.name)).map((r) => (
                      <option key={r.name} value={r.name}>
                        {ROLE_LABELS[r.name]?.emoji ?? ''} {ROLE_LABELS[r.name]?.label ?? r.name} — {r.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            {searchResult && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setShowAddModal(false)} className="vc-btn-secondary">Cancel</button>
                <button
                  onClick={handleAddMember}
                  disabled={addMemberMutation.isPending}
                  className="vc-btn-primary"
                >
                  {addMemberMutation.isPending ? 'Adding…' : 'Add to Tenant'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TenantMembersPage() {
  return (
    <PageErrorBoundary page="Tenant Members">
      <TenantMembersPageContent />
    </PageErrorBoundary>
  );
}
