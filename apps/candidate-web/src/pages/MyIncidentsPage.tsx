// ============================================================
// VoteCapsule™ — My Campaign Incidents (Candidate Portal)
// Phase 14C — Report and track campaign incidents
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, Plus, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

const INCIDENT_TYPES = [
  'security_threat','rally_disruption','vehicle_breakdown','equipment_failure',
  'scheduling_conflict','permit_revoked','poster_vandalism','billboard_removal',
  'team_misconduct','supplier_failure','budget_overrun','other',
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_COLORS: Record<string, string> = {
  reported:      'bg-red-50 text-red-700',
  acknowledged:  'bg-amber-50 text-amber-700',
  investigating: 'bg-blue-50 text-blue-700',
  escalated:     'bg-orange-50 text-orange-700',
  resolved:      'bg-emerald-50 text-emerald-700',
  closed:        'bg-gray-50 text-gray-600',
};

function ReportIncidentModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', category: 'operational',
    incidentType: 'other', severity: 'medium',
    locationName: '', wardCode: '',
    incidentDatetime: new Date().toISOString().slice(0, 16),
  });

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.incidents.create(campaignId, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['my-incidents'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">Report Incident</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className="vc-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief description of incident" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select className="vc-input" value={form.incidentType} onChange={(e) => setForm({ ...form, incidentType: e.target.value })}>
                {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
              <select className="vc-input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {['critical','high','medium','low'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
            <input type="datetime-local" className="vc-input" required value={form.incidentDatetime} onChange={(e) => setForm({ ...form, incidentDatetime: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input className="vc-input" value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} placeholder="e.g. Mwiki Market" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
              <input className="vc-input" value={form.wardCode} onChange={(e) => setForm({ ...form, wardCode: e.target.value })} placeholder="e.g. 0101" maxLength={4} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea className="vc-input" rows={3} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what happened in detail…" />
          </div>
          {mut.isError && <p className="text-sm text-red-600">Failed to report incident. Please try again.</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Reporting…' : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MyIncidentsContent(): React.JSX.Element {
  const campaign = useMyCampaign();
  const qc       = useQueryClient();
  const [showModal, setModal]   = useState(false);
  const [filter, setFilter]     = useState<string>('all');
  const [resolveId, setResolve] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  const { data: incidents = [] } = useQuery({
    queryKey: ['my-incidents', campaign?.id],
    queryFn:  () => campaign ? campaignApi.incidents.list(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, data }: any) => campaignApi.incidents.resolve(campaign!.id, id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['my-incidents'] }); setResolve(null); setResolution(''); },
  });

  const filtered = filter === 'all' ? incidents : incidents.filter((i: any) => i.status === filter || i.severity === filter);
  const openCount = incidents.filter((i: any) => !['resolved','closed'].includes(i.status)).length;

  return (
    <div className="space-y-5">
      {!campaign && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Create a campaign to start reporting incidents. <a href="/campaign" className="font-semibold underline hover:text-amber-900">Get started →</a></p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Incidents</h2>
          <p className="text-sm text-gray-500 mt-1">{openCount > 0 ? `${openCount} open incident${openCount !== 1 ? 's' : ''}` : 'No open incidents'}</p>
        </div>
        <button onClick={() => setModal(true)} disabled={!campaign} className={`vc-btn-primary inline-flex items-center gap-2 text-sm ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Plus className="w-4 h-4" /> Report
        </button>
      </div>

      {/* Severity breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Critical', key: 'critical', color: 'text-red-700',    bg: 'bg-red-50' },
          { label: 'High',     key: 'high',     color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Medium',   key: 'medium',   color: 'text-amber-700',  bg: 'bg-amber-50' },
          { label: 'Resolved', key: 'resolved', color: 'text-emerald-700',bg: 'bg-emerald-50' },
        ].map(({ label, key, color, bg }) => {
          const count = key === 'resolved'
            ? incidents.filter((i: any) => ['resolved','closed'].includes(i.status)).length
            : incidents.filter((i: any) => i.severity === key).length;
          return (
            <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)} className={`vc-stat-card text-center cursor-pointer ${filter === key ? 'ring-2 ring-amber-400' : ''}`}>
              <p className={`text-xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </button>
          );
        })}
      </div>

      {/* Incident list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="vc-card text-center py-12">
            <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No incidents to show</p>
          </div>
        ) : (
          filtered.map((inc: any) => (
            <div key={inc.id} className={`vc-card border-l-4 ${inc.severity === 'critical' ? 'border-red-500' : inc.severity === 'high' ? 'border-orange-500' : inc.severity === 'medium' ? 'border-amber-400' : 'border-gray-300'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${SEVERITY_COLORS[inc.severity] ?? SEVERITY_COLORS.low}`}>
                      {inc.severity}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[inc.status] ?? STATUS_COLORS.reported}`}>
                      {inc.status?.replace(/_/g,' ')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-2">{inc.title}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{inc.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {inc.locationName && <span>{inc.locationName}</span>}
                    {inc.incidentDatetime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inc.incidentDatetime).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span className="capitalize">{(inc.incidentType ?? '').replace(/_/g,' ')}</span>
                  </div>
                </div>
                {!['resolved','closed'].includes(inc.status) && (
                  <button
                    onClick={() => setResolve(inc.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex-shrink-0"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve modal */}
      {resolveId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Resolve Incident</h3>
            <textarea className="vc-input" rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Describe how the incident was resolved…" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setResolve(null); setResolution(''); }} className="flex-1 vc-btn-secondary">Cancel</button>
              <button onClick={() => resolveMut.mutate({ id: resolveId, data: { resolution } })} disabled={resolveMut.isPending || !resolution.trim()} className="flex-1 vc-btn-primary">
                {resolveMut.isPending ? 'Saving…' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && campaign && <ReportIncidentModal campaignId={campaign.id} onClose={() => setModal(false)} />}
    </div>
  );
}

export function MyIncidentsPage() {
  return (
    <PageErrorBoundary page="My Campaign Incidents">
      <MyIncidentsContent />
    </PageErrorBoundary>
  );
}
