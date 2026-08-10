import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function CandidateManagementPageContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: 'MP', countyCode: '', constituencyCode: '' });
  const [search, setSearch] = useState('');

  const { data: candidates, isLoading } = useQuery({ queryKey: ['candidates'], queryFn: () => apiClient.get('/candidate/candidates').then(r => r.data?.data ?? []) });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => apiClient.post('/candidate/candidates', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); setShowForm(false); },
  });

  const filtered = (candidates ?? []).filter((c: any) =>
    !search || `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const positions = ['PRESIDENT', 'GOVERNOR', 'SENATOR', 'WOMEN_REP', 'MP', 'MCA'];
  const statusBadge: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Candidate Management</h2><p className="text-sm text-gray-500 mt-1">Register and manage party candidates across all positions</p></div>
        <button onClick={() => setShowForm(true)} className="vc-btn-primary gap-2"><Plus className="w-4 h-4" />Add Candidate</button>
      </div>

      {showForm && (
        <div className="vc-card border-violet-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Register New Candidate</h3>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="vc-label">First Name</label><input className="vc-input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required /></div>
              <div><label className="vc-label">Last Name</label><input className="vc-input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required /></div>
              <div><label className="vc-label">Email</label><input className="vc-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><label className="vc-label">Phone</label><input className="vc-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="vc-label">Position</label><select className="vc-input" value={form.position} onChange={e => setForm({...form, position: e.target.value})}>{positions.map(p => <option key={p}>{p}</option>)}</select></div>
              <div><label className="vc-label">County Code</label><input className="vc-input" value={form.countyCode} onChange={e => setForm({...form, countyCode: e.target.value})} placeholder="e.g. 047" /></div>
            </div>
            <div className="flex gap-3"><button type="submit" disabled={createMutation.isPending} className="vc-btn-primary">{createMutation.isPending ? 'Saving…' : 'Register Candidate'}</button><button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="vc-input pl-9" placeholder="Search candidates…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="vc-card">
        {isLoading ? <div className="text-center py-12 text-gray-500">Loading…</div> : filtered.length === 0 ? (
          <div className="text-center py-12"><Users className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No candidates registered yet</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Name</th><th>Position</th><th>Region</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.firstName} {c.lastName}</td>
                  <td><span className="vc-badge bg-violet-100 text-violet-700">{c.position}</span></td>
                  <td>{c.countyName ?? c.constituencyName ?? '—'}</td>
                  <td><span className={`vc-badge ${statusBadge[c.status] ?? 'bg-gray-100 text-gray-500'}`}>{c.status ?? 'PENDING'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function CandidateManagementPage() {
  return (
    <PageErrorBoundary page="Candidate Management">
      <CandidateManagementPageContent />
    </PageErrorBoundary>
  );
}
