/**
 * VoteCapsule™ — Invite / Provision User Modal
 *
 * Superadmin flow to create a new user with:
 *   - Email
 *   - First / Last name
 *   - Role (CAPSULE_AGENT, VALIDATOR, OBSERVER, CANDIDATE, PARTY_ADMIN, etc.)
 *   - Tenant (IEBC, YNA Party, Observers, or none)
 *   - Temp password (auto-generated or manual)
 *
 * Calls POST /api/v1/identity/users/provision which:
 *   1. Creates the Cognito user (AdminCreateUser + AdminSetUserPassword)
 *   2. Sets custom:roles + custom:tenantId in Cognito
 *   3. Creates the DB user record
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, UserPlus, Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { usersApi, MOBILE_ROLES, ROLE_LABELS } from '../../api/usersApi';
import { tenantApi } from '../../api/tenantApi';
import { clsx } from 'clsx';

interface Props {
  onClose: () => void;
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$';
  const all = upper + lower + digits + specials;
  let pw = '';
  pw += upper[Math.floor(Math.random() * upper.length)]!;
  pw += lower[Math.floor(Math.random() * lower.length)]!;
  pw += digits[Math.floor(Math.random() * digits.length)]!;
  pw += specials[Math.floor(Math.random() * specials.length)]!;
  for (let i = 4; i < 12; i++) pw += all[Math.floor(Math.random() * all.length)]!;
  // Shuffle
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

export function InviteUserModal({ onClose }: Props): React.JSX.Element {
  const qc = useQueryClient();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRole, setSelectedRole] = useState('CAPSULE_AGENT');
  const [selectedTenantId, setSelectedTenantId] = useState('a1b2c3d4-e5f6-7890-abcd-ef1234567890'); // IEBC default
  const [password, setPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null);

  // Load tenants for selector
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-invite'],
    queryFn: () => tenantApi.findAll({ limit: 50 }),
  });
  const tenants = tenantsData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.createUser({
        email:      email.trim().toLowerCase(),
        firstName:  firstName.trim() || undefined,
        lastName:   lastName.trim() || undefined,
        tenantId:   selectedTenantId || undefined,
        roles:      [selectedRole],
        password,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setCreatedUser({ email: email.trim().toLowerCase(), password });
      setSuccess(true);
    },
  });

  const canSubmit =
    email.trim().length > 3 &&
    email.includes('@') &&
    password.length >= 8 &&
    !mutation.isPending;

  const roleInfo = ROLE_LABELS[selectedRole];

  if (success && createdUser) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">User Created!</h2>
            <p className="text-sm text-gray-500 mb-6">Share these credentials with the user. The password should be changed on first login.</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 mb-6">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email</p>
                <p className="text-sm font-mono text-gray-900 mt-0.5">{createdUser.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Temporary Password</p>
                <p className="text-sm font-mono text-gray-900 mt-0.5 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">{createdUser.password}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Role</p>
                <p className="text-sm text-gray-900 mt-0.5">{roleInfo?.label ?? selectedRole}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Email: ${createdUser.email}\nPassword: ${createdUser.password}`
                  );
                }}
                className="flex-1 vc-btn-secondary text-sm py-2"
              >
                Copy Credentials
              </button>
              <button onClick={onClose} className="flex-1 vc-btn-primary text-sm py-2">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0B3C6D]/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-[#0B3C6D]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create User</h2>
              <p className="text-xs text-gray-500">Provision a new platform user</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md" aria-label="Close">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Role selector — first so it frames the context */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_ROLES.filter(r => !['PLATFORM_SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(r.name)).map((role) => {
                const info = ROLE_LABELS[role.name];
                const isSelected = selectedRole === role.name;
                return (
                  <button
                    key={role.name}
                    type="button"
                    onClick={() => setSelectedRole(role.name)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-all',
                      isSelected
                        ? 'border-[#0B3C6D] bg-[#0B3C6D] text-white'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    )}
                  >
                    <span className="text-base">{info?.emoji ?? '👤'}</span>
                    <div className="min-w-0">
                      <p className={clsx('font-medium truncate text-xs', isSelected ? 'text-white' : 'text-gray-900')}>
                        {info?.label ?? role.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedRole && (
              <p className="text-xs text-gray-400 mt-1.5">
                {MOBILE_ROLES.find(r => r.name === selectedRole)?.description}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@iebc.or.ke"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]/30 focus:border-[#0B3C6D]"
              autoFocus
            />
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]/30 focus:border-[#0B3C6D]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Kamau"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]/30 focus:border-[#0B3C6D]"
              />
            </div>
          </div>

          {/* Tenant */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organisation / Tenant</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]/30 focus:border-[#0B3C6D] bg-white"
            >
              <option value="">— No tenant (platform user) —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type})
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">Temporary Password *</label>
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="flex items-center gap-1 text-xs text-[#0B3C6D] hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]/30 focus:border-[#0B3C6D] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Min 12 chars with uppercase, lowercase, digit and symbol. Share this with the user — they must change it on first login.
            </p>
          </div>

          {/* Error */}
          {mutation.isError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                {(mutation.error as Error)?.message ?? 'Failed to create user. Please try again.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="vc-btn-secondary flex-1 py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="vc-btn-primary flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
