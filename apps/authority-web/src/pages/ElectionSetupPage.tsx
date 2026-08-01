import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Vote, Calendar, Settings, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function ElectionSetupPage(): React.JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', electionType: 'GENERAL', nominationStart: '', nominationEnd: '', electionDate: '', description: '' });

  const { data: elections, isLoading } = useQuery({
    queryKey: ['elections'],
    queryFn: () => apiClient.get('/election/elections').then((r) => r.data?.data ?? r.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => apiClient.post('/election/elections', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['elections'] }); setShowForm(false); },
  });

  const electionTypes = ['GENERAL', 'BY_ELECTION', 'REFERENDUM', 'COUNTY_REFERENDUM'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Election Setup</h2>
          <p className="text-sm text-gray-500 mt-1">Create and configure elections, positions, and schedules</p>
        </div>
        <button onClick={() => setShowForm(true)} className="vc-btn-primary gap-2">
          <Plus className="w-4 h-4" />New Election
        </button>
      </div>

      {showForm && (
        <div className="vc-card border-emerald-200">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Create New Election</h3>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Election Name</label>
                <input className="vc-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2027 Kenya General Election" required />
              </div>
              <div>
                <label className="vc-label">Election Type</label>
                <select className="vc-input" value={form.electionType} onChange={(e) => setForm({ ...form, electionType: e.target.value })}>
                  {electionTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="vc-label">Nomination Start Date</label>
                <input type="date" className="vc-input" value={form.nominationStart} onChange={(e) => setForm({ ...form, nominationStart: e.target.value })} required />
              </div>
              <div>
                <label className="vc-label">Nomination End Date</label>
                <input type="date" className="vc-input" value={form.nominationEnd} onChange={(e) => setForm({ ...form, nominationEnd: e.target.value })} required />
              </div>
              <div>
                <label className="vc-label">Election Date</label>
                <input type="date" className="vc-input" value={form.electionDate} onChange={(e) => setForm({ ...form, electionDate: e.target.value })} required />
              </div>
              <div>
                <label className="vc-label">Description</label>
                <input className="vc-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createMutation.isPending} className="vc-btn-primary">
                {createMutation.isPending ? 'Creating…' : 'Create Election'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="vc-card text-center py-12 text-gray-500">Loading elections…</div>
      ) : (
        <div className="vc-card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">All Elections</h3>
          {(!elections || elections.length === 0) ? (
            <div className="text-center py-12">
              <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No elections configured yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "New Election" to get started</p>
            </div>
          ) : (
            <table className="vc-table">
              <thead><tr><th>Name</th><th>Type</th><th>Election Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {elections.map((el: any) => (
                  <tr key={el.id}>
                    <td className="font-medium">{el.name}</td>
                    <td><span className="vc-badge bg-emerald-100 text-emerald-700">{el.electionType}</span></td>
                    <td>{el.electionDate ? new Date(el.electionDate).toLocaleDateString() : '—'}</td>
                    <td><span className="vc-badge bg-blue-100 text-blue-700">{el.status ?? 'DRAFT'}</span></td>
                    <td><button className="p-1 text-gray-400 hover:text-gray-600"><ChevronRight className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
