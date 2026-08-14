/**
 * Vote Capsule™ — Party Officials Management Page
 *
 * Manages the 8 standard party positions (pre-created) plus custom positions.
 * Each official can be assigned portal access with CAMPAIGN_COORDINATOR role.
 * Editing is done via a slide-over panel from the right.
 */

import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Pencil, UserPlus, Shield, X,
  CheckCircle2, AlertCircle, Loader2, Phone, Mail, CreditCard,
} from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface Official {
  id: string;
  position: string;
  name: string;
  phone: string;
  email: string;
  nationalId: string;
  hasPortalAccess: boolean;
  isStandard: boolean;
}

const STANDARD_POSITIONS = [
  'Party Leader',
  'Deputy Party Leader',
  'Secretary General',
  'Treasurer',
  'Organizing Secretary',
  'National Chairperson',
  "Women's League Chairperson",
  'Youth League Chairperson',
];

// ── Toast Component ──────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function OfficialsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-44 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

// ── Official Card ────────────────────────────────────────────

function OfficialCard({
  official,
  onEdit,
  onToggleAccess,
}: {
  official: Official;
  onEdit: () => void;
  onToggleAccess: () => void;
}) {
  const isFilled = !!official.name.trim();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">{official.position}</p>
          {official.isStandard && (
            <span className="text-[10px] text-gray-400 font-medium">Standard Position</span>
          )}
        </div>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          title="Edit official"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {isFilled ? (
        <div className="space-y-2">
          <p className="text-base font-semibold text-gray-900">{official.name}</p>
          {official.phone && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />{official.phone}
            </p>
          )}
          {official.email && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />{official.email}
            </p>
          )}
          {official.nationalId && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />{official.nationalId}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-4 text-gray-400">
          <Pencil className="w-4 h-4" />
          <span className="text-sm">Not yet filled</span>
        </div>
      )}

      {/* Portal Access Toggle */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Shield className="w-3 h-3" /> Portal Access
        </span>
        <button
          onClick={onToggleAccess}
          disabled={!isFilled}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            official.hasPortalAccess ? 'bg-violet-600' : 'bg-gray-200'
          } ${!isFilled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            official.hasPortalAccess ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
      </div>
    </div>
  );
}

// ── Slide-over Edit Panel ────────────────────────────────────

function EditPanel({
  official,
  isNew,
  onSave,
  onClose,
  saving,
}: {
  official: Official | null;
  isNew: boolean;
  onSave: (data: Partial<Official>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    position: official?.position ?? '',
    name: official?.name ?? '',
    phone: official?.phone ?? '',
    email: official?.email ?? '',
    nationalId: official?.nationalId ?? '',
  });

  useEffect(() => {
    if (official) {
      setForm({
        position: official.position,
        name: official.name,
        phone: official.phone,
        email: official.email,
        nationalId: official.nationalId,
      });
    }
  }, [official]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-violet-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              {isNew ? 'Add Custom Position' : `Edit ${official?.position ?? 'Official'}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isNew && (
            <div>
              <label className="text-sm font-medium text-gray-700">Position Title</label>
              <input
                className="vc-input"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="e.g. Director of Communications"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input
              className="vc-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter official's full name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <input
              className="vc-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+254 7XX XXX XXX"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              className="vc-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="official@party.co.ke"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">National ID Number</label>
            <input
              className="vc-input"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              placeholder="e.g. 12345678"
            />
          </div>

          {!isNew && official?.hasPortalAccess && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-800">
              This official has portal access enabled with CAMPAIGN_COORDINATOR role.
              They will receive a login invitation email upon saving.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim() || (isNew && !form.position.trim())}
            className="vc-btn-primary flex-1 gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Saving...' : isNew ? 'Add Official' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="vc-btn-secondary">Cancel</button>
        </div>
      </div>
    </>
  );
}

// ── Main Content ─────────────────────────────────────────────

function PartyOfficialsPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';

  const [loading, setLoading] = useState(true);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [editTarget, setEditTarget] = useState<Official | null>(null);
  const [isNewPosition, setIsNewPosition] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch officials
  useEffect(() => {
    if (!tenantId) return;
    apiClient.get(`/tenant/${tenantId}/officials`)
      .then(r => {
        const data: Official[] = r.data?.data ?? r.data ?? [];
        // Ensure all 8 standard positions exist
        const existing = new Set(data.map(o => o.position));
        const merged = [...data];
        for (const pos of STANDARD_POSITIONS) {
          if (!existing.has(pos)) {
            merged.push({
              id: `placeholder-${pos}`,
              position: pos,
              name: '',
              phone: '',
              email: '',
              nationalId: '',
              hasPortalAccess: false,
              isStandard: true,
            });
          }
        }
        // Sort: standard positions first in order, custom positions after
        merged.sort((a, b) => {
          const ai = STANDARD_POSITIONS.indexOf(a.position);
          const bi = STANDARD_POSITIONS.indexOf(b.position);
          if (ai >= 0 && bi >= 0) return ai - bi;
          if (ai >= 0) return -1;
          if (bi >= 0) return 1;
          return 0;
        });
        setOfficials(merged);
      })
      .catch(() => {
        // Initialize with empty standard positions
        setOfficials(STANDARD_POSITIONS.map(pos => ({
          id: `placeholder-${pos}`,
          position: pos,
          name: '',
          phone: '',
          email: '',
          nationalId: '',
          hasPortalAccess: false,
          isStandard: true,
        })));
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  // Save official
  const handleSave = async (data: Partial<Official>) => {
    setSaving(true);
    try {
      const isPlaceholder = editTarget?.id.startsWith('placeholder-');
      const isCreate = isNewPosition || isPlaceholder;

      if (isCreate) {
        const res = await apiClient.post(`/tenant/${tenantId}/officials`, {
          position: data.position ?? editTarget?.position,
          name: data.name,
          phone: data.phone,
          email: data.email,
          nationalId: data.nationalId,
          isStandard: isPlaceholder ? true : false,
        });
        const created = res.data?.data ?? res.data;
        if (isPlaceholder) {
          setOfficials(prev => prev.map(o =>
            o.id === editTarget?.id ? { ...o, ...created, id: created.id } : o
          ));
        } else {
          setOfficials(prev => [...prev, { ...created, isStandard: false }]);
        }
      } else if (editTarget) {
        await apiClient.patch(`/tenant/${tenantId}/officials/${editTarget.id}`, {
          name: data.name,
          phone: data.phone,
          email: data.email,
          nationalId: data.nationalId,
        });
        setOfficials(prev => prev.map(o =>
          o.id === editTarget.id ? { ...o, ...data } as Official : o
        ));
      }

      setToast({ message: 'Official saved successfully', type: 'success' });
      setEditTarget(null);
      setIsNewPosition(false);
    } catch {
      setToast({ message: 'Failed to save official. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle portal access
  const handleToggleAccess = async (official: Official) => {
    const newValue = !official.hasPortalAccess;
    try {
      await apiClient.patch(`/tenant/${tenantId}/officials/${official.id}`, {
        hasPortalAccess: newValue,
      });
      setOfficials(prev => prev.map(o =>
        o.id === official.id ? { ...o, hasPortalAccess: newValue } : o
      ));
      setToast({
        message: newValue
          ? `Portal access granted to ${official.name} (CAMPAIGN_COORDINATOR role)`
          : `Portal access revoked for ${official.name}`,
        type: 'success',
      });
    } catch {
      setToast({ message: 'Failed to update portal access', type: 'error' });
    }
  };

  if (loading) return <OfficialsSkeleton />;

  const standardOfficials = officials.filter(o => STANDARD_POSITIONS.includes(o.position));
  const customOfficials = officials.filter(o => !STANDARD_POSITIONS.includes(o.position));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Party Officials</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your party's leadership structure and portal access
          </p>
        </div>
        <button
          onClick={() => { setIsNewPosition(true); setEditTarget(null); }}
          className="vc-btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Custom Position
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-violet-900">Portal Access Control</p>
          <p className="text-xs text-violet-700 mt-1">
            Enable the "Portal Access" toggle to create a portal user account for an official.
            They will be assigned the CAMPAIGN_COORDINATOR role and can access the party portal
            to manage campaigns, assign agents, and view results.
          </p>
        </div>
      </div>

      {/* Standard Positions Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Standard Positions ({standardOfficials.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {standardOfficials.map(official => (
            <OfficialCard
              key={official.id}
              official={official}
              onEdit={() => { setEditTarget(official); setIsNewPosition(false); }}
              onToggleAccess={() => handleToggleAccess(official)}
            />
          ))}
        </div>
      </div>

      {/* Custom Positions */}
      {customOfficials.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Custom Positions ({customOfficials.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customOfficials.map(official => (
              <OfficialCard
                key={official.id}
                official={official}
                onEdit={() => { setEditTarget(official); setIsNewPosition(false); }}
                onToggleAccess={() => handleToggleAccess(official)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit Panel (slide-over) */}
      {(editTarget || isNewPosition) && (
        <EditPanel
          official={editTarget}
          isNew={isNewPosition}
          onSave={handleSave}
          onClose={() => { setEditTarget(null); setIsNewPosition(false); }}
          saving={saving}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export function PartyOfficialsPage() {
  return (
    <PageErrorBoundary page="Officials">
      <PartyOfficialsPageContent />
    </PageErrorBoundary>
  );
}
