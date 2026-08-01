import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, User } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function AgentAssignmentsPage(): React.JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ agentEmail: '', pollingStationCode: '' });

  const { data: assignments } = useQuery({ queryKey: ['agents','assignments'], queryFn: () => apiClient.get('/election/assignments').then(r => r.data?.data ?? []) });

  const assignMutation = useMutation({
    mutationFn: (payload: typeof form) => apiClient.post('/election/assignments', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents','assignments'] }); setShowForm(false); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Agent Assignments</h2><p className="text-sm text-gray-500">Assign agents to polling stations nationwide</p></div>
        <button onClick={() => setShowForm(true)} className="vc-btn-primary gap-2"><Plus className="w-4 h-4" />Assign Agent</button>
      </div>

      {showForm && (
        <div className="vc-card border-violet-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Assign Agent to Station</h3>
          <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="vc-label">Agent Email</label><input className="vc-input" type="email" value={form.agentEmail} onChange={e => setForm({...form, agentEmail: e.target.value})} required /></div>
              <div><label className="vc-label">Polling Station Code</label><input className="vc-input" value={form.pollingStationCode} onChange={e => setForm({...form, pollingStationCode: e.target.value})} placeholder="e.g. 047-001-001-0001" required /></div>
            </div>
            <div className="flex gap-3"><button type="submit" disabled={assignMutation.isPending} className="vc-btn-primary">{assignMutation.isPending ? 'Assigning…' : 'Assign'}</button><button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-600" />Station Assignments ({assignments?.length ?? 0})</h3>
        {!assignments || assignments.length === 0 ? (
          <div className="text-center py-12"><User className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No agents assigned yet</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Agent</th><th>Polling Station</th><th>County</th><th>Status</th></tr></thead>
            <tbody>
              {assignments.map((a: any) => (
                <tr key={a.id}>
                  <td>{a.agentEmail ?? a.agentName}</td>
                  <td className="font-mono text-xs">{a.pollingStationCode}</td>
                  <td>{a.countyName ?? '—'}</td>
                  <td><span className={`vc-badge ${a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{a.status ?? 'ASSIGNED'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
