/**
 * Vote Capsule™ Admin Portal — Party Management Page
 *
 * Dedicated admin interface for managing all 98 registered political parties.
 * Features: KYC verification, official role delegation, branding review,
 * portal access management, and suspension controls.
 *
 * API Endpoints:
 *   GET  /tenants?type=political_party&page={n}&limit=20&search={q}
 *   GET  /tenants/:id  (full tenant with settings)
 *   PATCH /tenants/:id (update status, KYC verification)
 *   GET  /tenants/:id/officials
 *   POST /tenants/:id/officials
 *   PATCH /tenants/:id/officials/:officialId
 *   POST /tenants/:id/members (grant portal access)
 *   DELETE /tenants/:id/members/:userId (revoke portal access)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Flag, X, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, Clock, ShieldCheck, UserPlus,
  UserMinus, Building2, Globe, Palette, Users, FileCheck,
  AlertTriangle, ExternalLink, MoreHorizontal,
} from 'lucide-react';
import { tenantApi, type Tenant } from '../api/tenantApi';
import { tenantClient } from '../api/apiClient';
import { clsx } from 'clsx';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────────────────────

interface PartyTenant extends Tenant {
  settings?: PartySettings;
}

interface PartySettings {
  abbreviation?: string;
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
  orpp_certificate_serial?: string;
  orpp_registration_date?: string;
  symbol_description?: string;
  postal_address?: string;
  head_office?: string;
  slogan?: string;
  former_names?: string[];
  logo_url?: string;
  banner_url?: string;
  social_facebook?: string;
  social_twitter?: string;
  social_instagram?: string;
  social_youtube?: string;
  social_tiktok?: string;
  social_website?: string;
  kyc_status?: 'pending' | 'verified' | 'rejected';
}

interface PartyOfficial {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role?: 'PARTY_ADMIN' | 'CAMPAIGN_COORDINATOR' | null;
  hasPortalAccess: boolean;
  userId?: string;
}

interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ── API helpers (extend tenantApi for party-specific endpoints) ──────────────

function unwrap<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === 'object' &&
    'success' in (body as object) &&
    'data' in (body as object)
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

const partyApi = {
  findParties: async (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) => {
    const { data } = await tenantClient.get('/tenants', {
      params: {
        type: 'political_party',
        page: params.page,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
        ...(params.status && params.status !== 'all' ? { status: params.status } : {}),
      },
    });
    return unwrap<{ data: PartyTenant[]; meta: PaginatedMeta }>(data);
  },

  getPartyDetail: async (id: string): Promise<PartyTenant> => {
    const { data } = await tenantClient.get(`/tenants/${id}`);
    return unwrap<PartyTenant>(data);
  },

  getPartySettings: async (id: string): Promise<PartySettings> => {
    const { data } = await tenantClient.get(`/tenants/${id}/settings`);
    return unwrap<PartySettings>(data);
  },

  getOfficials: async (id: string): Promise<PartyOfficial[]> => {
    const { data } = await tenantClient.get(`/tenants/${id}/officials`);
    return unwrap<PartyOfficial[]>(data);
  },

  updateOfficial: async (tenantId: string, officialId: string, payload: { role?: string | null }) => {
    const { data } = await tenantClient.patch(`/tenants/${tenantId}/officials/${officialId}`, payload);
    return unwrap(data);
  },

  verifyKyc: async (tenantId: string) => {
    const { data } = await tenantClient.patch(`/tenants/${tenantId}`, {
      settings: { kyc_status: 'verified' },
    });
    return unwrap(data);
  },

  toggleStatus: async (tenantId: string, newStatus: 'active' | 'suspended') => {
    const { data } = await tenantClient.patch(`/tenants/${tenantId}`, { status: newStatus });
    return unwrap(data);
  },

  grantAccess: async (tenantId: string, userId: string, role: string) => {
    const { data } = await tenantClient.post(`/tenants/${tenantId}/members`, { userId, role });
    return unwrap(data);
  },

  revokeAccess: async (tenantId: string, userId: string) => {
    await tenantClient.delete(`/tenants/${tenantId}/members/${userId}`);
  },
};

// ── Status config ────────────────────────────────────────────────────────────

const PARTY_STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ElementType }> = {
  active:    { label: 'Active',    classes: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  suspended: { label: 'Suspended', classes: 'text-amber-700 bg-amber-50 border-amber-200',     icon: AlertTriangle },
  pending:   { label: 'Pending',   classes: 'text-blue-700 bg-blue-50 border-blue-200',        icon: Clock },
  deactivated: { label: 'Deactivated', classes: 'text-red-700 bg-red-50 border-red-200',      icon: XCircle },
};

const KYC_STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending:  { label: 'Pending Verification', classes: 'text-amber-700 bg-amber-50' },
  verified: { label: 'Verified',             classes: 'text-emerald-700 bg-emerald-50' },
  rejected: { label: 'Rejected',             classes: 'text-red-700 bg-red-50' },
};

// ── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}): React.JSX.Element {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Party Detail Slide-Over Modal ────────────────────────────────────────────

type DetailTab = 'kyc' | 'officials' | 'branding' | 'social';

function PartyDetailModal({
  party,
  onClose,
}: {
  party: PartyTenant;
  onClose: () => void;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<DetailTab>('kyc');
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch full settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['party-settings', party.id],
    queryFn: () => partyApi.getPartySettings(party.id),
  });

  // Fetch officials
  const { data: officials, isLoading: officialsLoading } = useQuery({
    queryKey: ['party-officials', party.id],
    queryFn: () => partyApi.getOfficials(party.id),
  });

  // KYC verify mutation
  const verifyKycMutation = useMutation({
    mutationFn: () => partyApi.verifyKyc(party.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-settings', party.id] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });

  // Role assignment mutation
  const assignRoleMutation = useMutation({
    mutationFn: ({ officialId, role }: { officialId: string; role: string | null }) =>
      partyApi.updateOfficial(party.id, officialId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-officials', party.id] });
    },
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      partyApi.grantAccess(party.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-officials', party.id] });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: (userId: string) => partyApi.revokeAccess(party.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-officials', party.id] });
    },
  });

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const tabs: { id: DetailTab; label: string; icon: React.ElementType }[] = [
    { id: 'kyc',       label: 'KYC',          icon: FileCheck },
    { id: 'officials', label: 'Officials',    icon: Users },
    { id: 'branding',  label: 'Branding',     icon: Palette },
    { id: 'social',    label: 'Social Media', icon: Globe },
  ];

  const kycStatus = settings?.kyc_status ?? 'pending';
  const kycCfg = KYC_STATUS_CONFIG[kycStatus] ?? KYC_STATUS_CONFIG.pending;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={`Party details: ${party.name}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            {settings?.primary_color && (
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: settings.primary_color }}
              />
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{party.name}</h2>
              <p className="text-xs text-gray-500">{settings?.abbreviation ?? party.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-[#0B3C6D] text-[#0B3C6D]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#0B3C6D]/20 border-t-[#0B3C6D] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── KYC Tab ── */}
              {activeTab === 'kyc' && (
                <div className="space-y-6">
                  {/* KYC Status banner */}
                  <div className={clsx('rounded-lg p-4 flex items-center justify-between', kycCfg.classes)}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="text-sm font-medium">KYC Status: {kycCfg.label}</span>
                    </div>
                    {kycStatus !== 'verified' && (
                      <button
                        onClick={() => verifyKycMutation.mutate()}
                        disabled={verifyKycMutation.isPending}
                        className="vc-btn-primary text-xs py-1.5 px-3"
                      >
                        {verifyKycMutation.isPending ? 'Verifying…' : 'Verify KYC'}
                      </button>
                    )}
                  </div>

                  {/* ORPP Registration Data */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">ORPP Registration Data</h3>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-gray-500">Certificate Serial No.</dt>
                        <dd className="font-medium mt-1 font-mono">{settings?.orpp_certificate_serial ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Registration Date</dt>
                        <dd className="font-medium mt-1">
                          {settings?.orpp_registration_date
                            ? new Date(settings.orpp_registration_date).toLocaleDateString()
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Party Symbol</dt>
                        <dd className="font-medium mt-1">{settings?.symbol_description ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Abbreviation</dt>
                        <dd className="font-medium mt-1">{settings?.abbreviation ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Postal Address</dt>
                        <dd className="font-medium mt-1">{settings?.postal_address ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Head Office</dt>
                        <dd className="font-medium mt-1">{settings?.head_office ?? '—'}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-gray-500">Slogan</dt>
                        <dd className="font-medium mt-1 italic">{settings?.slogan ?? '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Party Colors */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Official Colors</h3>
                    <div className="flex items-center gap-3">
                      {[settings?.primary_color, settings?.secondary_color, settings?.tertiary_color]
                        .filter(Boolean)
                        .map((color, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-md border border-gray-200 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-gray-500 font-mono uppercase">{color}</span>
                          </div>
                        ))}
                      {!settings?.primary_color && (
                        <span className="text-sm text-gray-400">No colors registered</span>
                      )}
                    </div>
                  </div>

                  {/* Former Names */}
                  {settings?.former_names && settings.former_names.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Former Names</h3>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {settings.former_names.map((name, idx) => (
                          <li key={idx}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ── Officials Tab ── */}
              {activeTab === 'officials' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Party Officials</h3>
                  </div>

                  {officialsLoading ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Loading officials…</div>
                  ) : !officials || officials.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No officials registered yet</p>
                      <p className="text-xs text-gray-400 mt-1">Officials will appear here once the party registers them via the ORPP data import</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Name</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Title</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Portal Role</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {officials.map((official) => (
                            <tr key={official.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{official.name}</p>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{official.title}</td>
                              <td className="px-4 py-3">
                                <p className="text-gray-600">{official.email}</p>
                                <p className="text-xs text-gray-400">{official.phone}</p>
                              </td>
                              <td className="px-4 py-3">
                                {official.hasPortalAccess ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {official.role ?? 'Access Granted'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">No access</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Role assignment dropdown */}
                                  <RoleDropdown
                                    currentRole={official.role ?? null}
                                    onChange={(role) => {
                                      if (role) {
                                        assignRoleMutation.mutate({ officialId: official.id, role });
                                        if (official.userId && !official.hasPortalAccess) {
                                          grantAccessMutation.mutate({ userId: official.userId, role });
                                        }
                                      }
                                    }}
                                  />
                                  {/* Revoke button */}
                                  {official.hasPortalAccess && official.userId && (
                                    <button
                                      onClick={() => revokeAccessMutation.mutate(official.userId!)}
                                      disabled={revokeAccessMutation.isPending}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                      title="Revoke portal access"
                                    >
                                      <UserMinus className="w-3 h-3" />
                                      Revoke
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Branding Tab ── */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  {/* Logo */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Party Logo</h3>
                    {settings?.logo_url ? (
                      <div className="w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                        <img
                          src={settings.logo_url}
                          alt={`${party.name} logo`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-400">No logo uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Banner */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Party Banner</h3>
                    {settings?.banner_url ? (
                      <div className="w-full h-40 border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <img
                          src={settings.banner_url}
                          alt={`${party.name} banner`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-400">No banner uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Color Palette */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Color Palette</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Primary', color: settings?.primary_color },
                        { label: 'Secondary', color: settings?.secondary_color },
                        { label: 'Tertiary', color: settings?.tertiary_color },
                      ].map(({ label, color }) => (
                        <div key={label} className="text-center">
                          <div
                            className="w-full h-16 rounded-lg border border-gray-200 shadow-sm"
                            style={{ backgroundColor: color ?? '#F3F4F6' }}
                          />
                          <p className="text-xs text-gray-500 mt-1.5">{label}</p>
                          <p className="text-xs font-mono text-gray-400">
                            {color?.toUpperCase() ?? 'Not set'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Social Media Tab ── */}
              {activeTab === 'social' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Social Media Handles</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Website', value: settings?.social_website, prefix: '' },
                      { label: 'Facebook', value: settings?.social_facebook, prefix: 'facebook.com/' },
                      { label: 'Twitter / X', value: settings?.social_twitter, prefix: '@' },
                      { label: 'Instagram', value: settings?.social_instagram, prefix: '@' },
                      { label: 'YouTube', value: settings?.social_youtube, prefix: 'youtube.com/' },
                      { label: 'TikTok', value: settings?.social_tiktok, prefix: '@' },
                    ].map(({ label, value, prefix }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-600 font-medium">{label}</span>
                        {value ? (
                          <a
                            href={value.startsWith('http') ? value : `https://${prefix}${value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#0B3C6D] hover:underline flex items-center gap-1"
                          >
                            {prefix}{value}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">Not provided</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Role Dropdown ────────────────────────────────────────────────────────────

function RoleDropdown({
  currentRole,
  onChange,
}: {
  currentRole: string | null;
  onChange: (role: string) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const roles = [
    { value: 'PARTY_ADMIN', label: 'Party Admin' },
    { value: 'CAMPAIGN_COORDINATOR', label: 'Campaign Coordinator' },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        title="Assign role"
      >
        <UserPlus className="w-3 h-3" />
        {currentRole ? 'Change' : 'Assign'}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          {roles.map((role) => (
            <button
              key={role.value}
              onClick={() => {
                onChange(role.value);
                setOpen(false);
              }}
              className={clsx(
                'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors',
                currentRole === role.value ? 'text-[#0B3C6D] font-medium bg-blue-50' : 'text-gray-700',
              )}
            >
              {role.label}
              {currentRole === role.value && (
                <span className="float-right text-[#0B3C6D]">Current</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page Content ────────────────────────────────────────────────────────

function PartyManagementPageContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedParty, setSelectedParty] = useState<PartyTenant | null>(null);
  const [sortField, setSortField] = useState<'name' | 'abbreviation' | 'cert'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch all parties (98 total — small, fixed dataset)
  // We fetch all at once for reliable client-side search by both name AND abbreviation/slug
  const { data: partiesResult, isLoading, error } = useQuery({
    queryKey: ['parties', statusFilter],
    queryFn: () => partyApi.findParties({
      page: 1,
      limit: 100,
      search: undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  // Client-side filter by name, slug, OR abbreviation — server search doesn't cover slug
  const allParties = partiesResult?.data ?? [];
  const parties = debouncedSearch
    ? allParties.filter(p => {
        const term = debouncedSearch.toLowerCase();
        return p.name.toLowerCase().includes(term) ||
               (p.slug ?? '').toLowerCase().includes(term) ||
               (p.settings?.abbreviation ?? '').toLowerCase().includes(term);
      })
    : allParties;
  const meta = partiesResult?.meta;

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['party-stats'],
    queryFn: async () => {
      // Use the general stats endpoint, or compute from the full list
      const allParties = await partyApi.findParties({ page: 1, limit: 1, search: undefined });
      return {
        total: allParties.meta?.total ?? 0,
      };
    },
    staleTime: 30000,
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: 'active' | 'suspended' }) =>
      partyApi.toggleStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party-stats'] });
    },
  });

  // Sort parties client-side (server returns paginated but we sort within page)
  const sortedParties = [...parties].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * dir;
      case 'abbreviation':
        return (a.slug ?? '').localeCompare(b.slug ?? '') * dir;
      default:
        return 0;
    }
  });

  const handleSort = (field: 'name' | 'abbreviation' | 'cert') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Compute stats from parties or meta
  const totalParties = meta?.total ?? stats?.total ?? 0;
  const activeCount = parties.filter(p => p.status === 'active').length;
  const suspendedCount = parties.filter(p => p.status === 'suspended').length;
  const pendingKycCount = parties.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0B3C6D]/10 rounded-lg flex items-center justify-center">
              <Flag className="w-5 h-5 text-[#0B3C6D]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Political Parties</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage all 98 registered political parties
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Parties"
          value={totalParties}
          icon={Flag}
          color="bg-[#0B3C6D]/10 text-[#0B3C6D]"
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Suspended"
          value={suspendedCount}
          icon={AlertTriangle}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Pending KYC Verification"
          value={pendingKycCount}
          icon={Clock}
          color="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by party name or abbreviation…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D]"
            aria-label="Search parties"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] text-gray-700"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>

        <span className="text-sm text-gray-400 ml-auto">
          {parties.length} of {totalParties} parties
        </span>
      </div>

      {/* Party Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-[#0B3C6D]/20 border-t-[#0B3C6D] rounded-full animate-spin mx-auto mb-3" />
            Loading parties…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Failed to load parties. Check API connection.
          </div>
        ) : sortedParties.length === 0 ? (
          <div className="p-8 text-center">
            <Flag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No parties found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Political party tenants will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">
                    #
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center gap-1">
                      Party Name
                      {sortField === 'name' && (
                        <span className="text-[#0B3C6D]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('abbreviation')}
                  >
                    <span className="flex items-center gap-1">
                      Abbreviation
                      {sortField === 'abbreviation' && (
                        <span className="text-[#0B3C6D]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Colors
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 hidden lg:table-cell"
                    onClick={() => handleSort('cert')}
                  >
                    <span className="flex items-center gap-1">
                      ORPP Cert#
                      {sortField === 'cert' && (
                        <span className="text-[#0B3C6D]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                    Head Office
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedParties.map((party, idx) => {
                  const statusCfg = PARTY_STATUS_CONFIG[party.status] ?? PARTY_STATUS_CONFIG.active;
                  const StatusIcon = statusCfg.icon;
                  const rowNum = ((meta?.page ?? page) - 1) * 20 + idx + 1;

                  // Use settings if already fetched with tenant, else use defaults
                  const primaryColor = (party.settings?.primary_color) ?? '#6B7280';

                  return (
                    <tr
                      key={party.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ borderLeft: `4px solid ${primaryColor}` }}
                    >
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                        {rowNum}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border border-gray-200"
                            style={{ backgroundColor: `${primaryColor}15` }}
                          >
                            <Flag className="w-4 h-4" style={{ color: primaryColor }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{party.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{party.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">
                          {party.settings?.abbreviation ?? party.slug?.toUpperCase().slice(0, 5) ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {[party.settings?.primary_color, party.settings?.secondary_color, party.settings?.tertiary_color]
                            .filter(Boolean)
                            .map((color, ci) => (
                              <div
                                key={ci}
                                className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                                style={{ backgroundColor: color }}
                                title={color?.toUpperCase()}
                              />
                            ))}
                          {!party.settings?.primary_color && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                          statusCfg.classes,
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-600 font-mono">
                          {party.settings?.orpp_certificate_serial ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-sm text-gray-600">
                          {party.settings?.head_office ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedParty(party)}
                            className="vc-btn-secondary text-xs py-1 px-2.5"
                            title="View KYC details"
                          >
                            View KYC
                          </button>
                          <button
                            onClick={() => {
                              setSelectedParty(party);
                              // Will open on officials tab - handled via a slight delay
                            }}
                            className="vc-btn-secondary text-xs py-1 px-2.5 hidden sm:inline-flex"
                            title="Manage officials"
                          >
                            Officials
                          </button>
                          <button
                            onClick={() => toggleStatusMutation.mutate({
                              id: party.id,
                              newStatus: party.status === 'active' ? 'suspended' : 'active',
                            })}
                            disabled={toggleStatusMutation.isPending}
                            className={clsx(
                              'text-xs py-1 px-2.5 rounded-md border font-medium transition-colors',
                              party.status === 'active'
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                            )}
                            title={party.status === 'active' ? 'Suspend party' : 'Activate party'}
                          >
                            {party.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPreviousPage}
                className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
                className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40 flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Slide-Over Modal */}
      {selectedParty && (
        <PartyDetailModal
          party={selectedParty}
          onClose={() => setSelectedParty(null)}
        />
      )}
    </div>
  );
}

// ── Exported Page (wrapped in error boundary) ────────────────────────────────

export function PartyManagementPage(): React.JSX.Element {
  return (
    <PageErrorBoundary page="Party Management">
      <PartyManagementPageContent />
    </PageErrorBoundary>
  );
}
