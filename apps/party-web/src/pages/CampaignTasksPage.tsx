// ============================================================
// VoteCapsule™ — Campaign Tasks (Party Portal)
// Phase 14A — Kanban/List Task Board
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckSquare, Clock, AlertTriangle, ChevronDown, X, User, Calendar, Flag } from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const COLUMNS = [
  { key: 'todo',        label: 'To Do',      color: 'bg-gray-100 text-gray-700' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { key: 'blocked',     label: 'Blocked',    color: 'bg-red-100 text-red-700' },
  { key: 'done',        label: 'Done',       color: 'bg-emerald-100 text-emerald-700' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
};

function CampaignTasksContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [showCreate, setCreate] = useState(false);
  const [filter, setFilter] = useState({ status: '', wardCode: '' });
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '', wardCode: '', assignedToName: '' });

  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => campaignApi.list().then((r) => r.data?.data ?? r.data ?? []) });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['campaign-tasks', campaign?.id, filter],
    queryFn: () => campaign ? campaignApi.tasks.list(campaign.id, filter).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => campaign ? campaignApi.tasks.create(campaign.id, data) : Promise.reject(new Error('no-campaign')),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-tasks'] }); setCreate(false); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => campaign ? campaignApi.tasks.updateStatus(campaign.id, id, status) : Promise.reject(new Error('no-campaign')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-tasks'] }),
  });

  const tasksByStatus: Record<string, any[]> = {};
  COLUMNS.forEach((col) => { tasksByStatus[col.key] = tasks.filter((t: any) => t.status === col.key); });

  if (isLoading) return <div className="flex justify-center h-64 items-center"><div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {!campaign && (
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-violet-500 flex-shrink-0" />
          <p className="text-sm text-violet-700">Create a campaign to start managing tasks. <a href="/campaign/create" className="font-semibold underline hover:text-violet-900">Get started →</a></p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">Track and assign campaign activities</p>
        </div>
        <button onClick={() => setCreate(true)} disabled={!campaign} className={`vc-btn-primary inline-flex items-center gap-2 text-sm ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input className="vc-input max-w-[180px]" placeholder="Ward code..." value={filter.wardCode} onChange={(e) => setFilter({ ...filter, wardCode: e.target.value })} />
        <select className="vc-input max-w-[160px]" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All statuses</option>
          {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.color}`}>{col.label}</span>
                <span className="text-xs text-gray-500">{tasksByStatus[col.key]?.length ?? 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              {(tasksByStatus[col.key] ?? []).map((task: any) => (
                <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{task.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority] ?? ''}`}>{task.priority}</span>
                  </div>
                  {task.assignedToName && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <User className="w-3 h-3" />{task.assignedToName}
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {task.wardCode && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Flag className="w-3 h-3" /> Ward {task.wardCode}
                    </div>
                  )}
                  {/* Status transitions */}
                  <select
                    className="mt-2 w-full text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
                    value={task.status}
                    onChange={(e) => statusMutation.mutate({ id: task.id, status: e.target.value })}
                  >
                    {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              ))}
              {(tasksByStatus[col.key] ?? []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && campaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">New Task</h3>
              <button onClick={() => setCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input className="vc-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="vc-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select className="vc-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {['low','medium','high','critical'].map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="datetime-local" className="vc-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input className="vc-input" placeholder="Name" value={form.assignedToName} onChange={(e) => setForm({ ...form, assignedToName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
                  <input className="vc-input" placeholder="0101" value={form.wardCode} onChange={(e) => setForm({ ...form, wardCode: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreate(false)} className="flex-1 vc-btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 vc-btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignTasksPage() {
  return <PageErrorBoundary page="Campaign Tasks"><CampaignTasksContent /></PageErrorBoundary>;
}
