// ============================================================
// VoteCapsule™ — Campaign SMS (Party Portal)
// Phase 14C — SMS compose, templates, batch history
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Plus, CheckCircle, Clock, X, BarChart3, Users, FileText, AlertTriangle } from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function CampaignSMSContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [tab, setTab]             = useState<'compose' | 'templates' | 'history'>('compose');
  const [showTemplate, setTmpl]   = useState(false);
  const [templateForm, setTplForm] = useState({ templateName: '', body: '', category: 'general' });
  const [composeForm, setCompose] = useState({ messageContent: '', batchName: '', audienceFilter: '{}' });

  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => campaignApi.list().then((r) => r.data?.data ?? r.data ?? []) });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  const { data: templates = [] } = useQuery({
    queryKey: ['sms-templates', campaign?.id],
    queryFn: () => campaign ? campaignApi.sms.listTemplates(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['sms-batches', campaign?.id],
    queryFn: () => campaign ? campaignApi.sms.listBatches(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['sms-stats', campaign?.id],
    queryFn: () => campaign ? campaignApi.sms.stats(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled: !!campaign?.id,
  });

  const createTplMut = useMutation({
    mutationFn: () => campaign ? campaignApi.sms.createTemplate(campaign.id, templateForm) : Promise.reject(new Error('no-campaign')),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sms-templates'] }); setTmpl(false); },
  });

  const approveTplMut = useMutation({
    mutationFn: (id: string) => campaign ? campaignApi.sms.approveTemplate(campaign.id, id) : Promise.reject(new Error('no-campaign')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms-templates'] }),
  });

  const sendMut = useMutation({
    mutationFn: () => campaign ? campaignApi.sms.sendBatch(campaign.id, composeForm) : Promise.reject(new Error('no-campaign')),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sms-batches'] }); setCompose({ messageContent: '', batchName: '', audienceFilter: '{}' }); },
  });

  const charCount = composeForm.messageContent.length;
  const smsCount  = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-6">
      {!campaign && (
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-violet-500 flex-shrink-0" />
          <p className="text-sm text-violet-700">Create a campaign to start sending SMS messages. <a href="/campaign/create" className="font-semibold underline hover:text-violet-900">Get started →</a></p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign SMS</h2>
          <p className="text-sm text-gray-500 mt-1">Send targeted SMS to your campaign supporters</p>
        </div>
        {tab === 'templates' && (
          <button onClick={() => setTmpl(true)} disabled={!campaign} className={`vc-btn-primary inline-flex items-center gap-2 text-sm ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Batches',   value: stats.totalBatches,  icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Total Sent',      value: stats.totalSent,     icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Delivered',       value: stats.totalDelivered, icon: CheckCircle,  color: 'text-emerald-600',bg: 'bg-emerald-50' },
            { label: 'Cost (KES)',      value: `KES ${stats.totalCostKes?.toLocaleString()}`, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="vc-stat-card">
              <div className="flex items-start justify-between">
                <div><p className="text-sm text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900 mt-1">{value}</p></div>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        {[{ key: 'compose', label: 'Compose', icon: MessageSquare }, { key: 'templates', label: 'Templates', icon: FileText }, { key: 'history', label: 'Sent History', icon: Clock }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Compose Tab */}
      {tab === 'compose' && campaign && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="vc-card space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Compose Message</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
              <input className="vc-input" placeholder="e.g. Nairobi Rally Reminder" value={composeForm.batchName} onChange={(e) => setCompose({ ...composeForm, batchName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-gray-400 font-normal">({charCount} chars · {smsCount} SMS)</span>
              </label>
              <textarea
                className="vc-input"
                rows={5}
                placeholder="Type your message here..."
                value={composeForm.messageContent}
                onChange={(e) => setCompose({ ...composeForm, messageContent: e.target.value })}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{160 - (charCount % 160)} chars remaining in current SMS</span>
                <span className={`text-xs font-medium ${smsCount > 1 ? 'text-amber-600' : 'text-gray-500'}`}>{smsCount} SMS</span>
              </div>
            </div>
            <button
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending || !composeForm.messageContent.trim() || !campaign}
              className={`vc-btn-primary w-full inline-flex items-center justify-center gap-2 ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Send className="w-4 h-4" />
              {sendMut.isPending ? 'Queuing...' : 'Send Batch'}
            </button>
            {sendMut.isSuccess && <p className="text-sm text-emerald-600 bg-emerald-50 p-2 rounded-lg">✓ SMS batch queued successfully!</p>}
          </div>

          {/* Template Picker */}
          <div className="vc-card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Use Template</h3>
            <div className="space-y-2">
              {templates.filter((t: any) => t.approvalStatus === 'approved').map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setCompose({ ...composeForm, messageContent: t.body })}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{t.templateName}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.body}</p>
                </button>
              ))}
              {templates.filter((t: any) => t.approvalStatus === 'approved').length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No approved templates</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="vc-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Name','Body Preview','Category','Status','Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.templateName}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[250px] truncate">{t.body}</td>
                  <td className="px-4 py-3"><span className="vc-badge bg-gray-100 text-gray-700">{t.category}</span></td>
                  <td className="px-4 py-3">
                    <span className={`vc-badge ${t.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : t.approvalStatus === 'pending_approval' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.approvalStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.approvalStatus !== 'approved' && (
                      <button onClick={() => approveTplMut.mutate(t.id)} className="text-xs text-violet-600 hover:text-violet-800 font-medium">Approve</button>
                    )}
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No templates yet. Create your first template!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="vc-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Batch Name','Sent','Delivered','Failed','Rate','Status','Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.batchName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{b.sentCount}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{b.deliveredCount}</td>
                  <td className="px-4 py-3 text-red-600">{b.failedCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${b.deliveryRate ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{b.deliveryRate ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`vc-badge ${b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'queued' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No SMS batches sent yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplate && campaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">New SMS Template</h3>
              <button onClick={() => setTmpl(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input className="vc-input" value={templateForm.templateName} onChange={(e) => setTplForm({ ...templateForm, templateName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body *</label>
                <textarea className="vc-input" rows={4} placeholder="Use {{first_name}}, {{ward}}, {{event_date}} for variables..." value={templateForm.body} onChange={(e) => setTplForm({ ...templateForm, body: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="vc-input" value={templateForm.category} onChange={(e) => setTplForm({ ...templateForm, category: e.target.value })}>
                  {['general','event_reminder','mobilization','results','urgent'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setTmpl(false)} className="flex-1 vc-btn-secondary">Cancel</button>
                <button onClick={() => createTplMut.mutate()} disabled={createTplMut.isPending || !templateForm.templateName || !templateForm.body} className="flex-1 vc-btn-primary">
                  {createTplMut.isPending ? 'Saving...' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignSMSPage() {
  return <PageErrorBoundary page="Campaign SMS"><CampaignSMSContent /></PageErrorBoundary>;
}
