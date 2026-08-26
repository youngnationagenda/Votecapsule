import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function IncidentTrackingPageContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', pollingStationCode: '', severity: 'MEDIUM' });

  const { data: incidents } = useQuery({ queryKey: ['observer','incidents'], queryFn: () => apiClient.get('/audit/logs?limit=20&resourceType=OBSERVER_INCIDENT').then(r => r.data?.items ?? r.data?.data ?? r.data ?? []) });

  const logMutation = useMutation({
    mutationFn: (p: typeof form) => apiClient.post('/audit/logs', { action: 'OBSERVER_INCIDENT_LOGGED', resourceType: 'OBSERVER_INCIDENT', serviceName: 'observer-portal', metadata: { ...p, source: 'OBSERVER' }, status: 'SUCCESS' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['observer','incidents'] }); setShowForm(false); },
  });

  const severityBadge: Record<string, string> = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Incident Tracking</h2><p className="text-sm text-gray-500">Log observations and flag concerns for the election authority</p></div>
        <button onClick={() => setShowForm(true)} className="vc-btn-primary gap-2"><Plus className="w-4 h-4" />Log Incident</button>
      </div>

      {showForm && (
        <div className="vc-card border-sky-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Log New Incident</h3>
          <form onSubmit={(e) => { e.preventDefault(); logMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="vc-label">Title</label><input className="vc-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div><label className="vc-label">Station Code (optional)</label><input className="vc-input" value={form.pollingStationCode} onChange={e => setForm({...form, pollingStationCode: e.target.value})} placeholder="e.g. 047-001-001-0001" /></div>
              <div><label className="vc-label">Severity</label><select className="vc-input" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></div>
              <div className="md:col-span-2"><label className="vc-label">Description</label><textarea className="vc-input h-20 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
            </div>
            <div className="flex gap-3"><button type="submit" disabled={logMutation.isPending} className="vc-btn-primary">{logMutation.isPending ? 'Logging…' : 'Log Incident'}</button><button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-sky-600" />Observer Incidents ({incidents?.length ?? 0})</h3>
        {!incidents || incidents.length === 0 ? (
          <div className="text-center py-12"><AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No incidents logged yet</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Title</th><th>Station</th><th>Severity</th><th>Logged At</th><th>Status</th></tr></thead>
            <tbody>
              {incidents.map((inc: any) => (
                <tr key={inc.id}><td className="font-medium">{inc.metadata?.title ?? inc.action ?? '—'}</td><td className="font-mono text-xs">{inc.metadata?.pollingStationCode ?? '—'}</td><td><span className={`vc-badge ${severityBadge[inc.metadata?.severity ?? 'MEDIUM'] ?? 'bg-gray-100'}`}>{inc.metadata?.severity ?? 'MEDIUM'}</span></td><td className="text-xs">{inc.createdAt ? new Date(inc.createdAt).toLocaleString() : '—'}</td><td><span className="vc-badge bg-blue-100 text-blue-700">{inc.status ?? 'OPEN'}</span></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function IncidentTrackingPage() {
  return (
    <PageErrorBoundary page="Incident Tracking">
      <IncidentTrackingPageContent />
    </PageErrorBoundary>
  );
}
