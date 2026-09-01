// ============================================================
// VoteCapsule™ — My Campaign SMS (Candidate Portal)
// Phase 14C — Send SMS to own team + view history
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Send, Clock, CheckCircle, XCircle,
  BarChart3, Users, AlertTriangle,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

function MySMSContent(): React.JSX.Element {
  const qc       = useQueryClient();
  const campaign = useMyCampaign();
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const [compose, setCompose] = useState({
    messageContent: '', batchName: '',
    audienceType: 'all_team',
    wardCode: '',
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['my-sms-templates', campaign?.id],
    queryFn:  () => campaign ? campaignApi.sms.listTemplates(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const approvedTemplates = templates.filter((t: any) => t.approvalStatus === 'approved');

  const { data: batches = [] } = useQuery({
    queryKey: ['my-sms-batches', campaign?.id],
    queryFn:  () => campaign ? campaignApi.sms.listBatches(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['my-sms-stats', campaign?.id],
    queryFn:  () => campaign ? campaignApi.sms.stats(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled:  !!campaign?.id,
  });

  const sendMut = useMutation({
    mutationFn: (data: any) => campaignApi.sms.sendBatch(campaign!.id, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['my-sms-batches'] });
      qc.invalidateQueries({ queryKey: ['my-sms-stats'] });
      setCompose({ messageContent: '', batchName: '', audienceType: 'all_team', wardCode: '' });
    },
  });

  const charCount = compose.messageContent.length;
  const smsCount  = Math.ceil(charCount / 160) || 0;

  const AUDIENCE_OPTIONS = [
    { value: 'all_team',          label: 'All Team Members' },
    { value: 'coordinators',      label: 'Coordinators Only' },
    { value: 'volunteers',        label: 'Volunteers Only' },
    { value: 'ward_team',         label: 'Specific Ward Team' },
  ];

  return (
    <div className="space-y-5">
      {!campaign && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <MessageSquare className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Create a campaign to start sending messages. <a href="/campaign" className="font-semibold underline hover:text-amber-900">Get started →</a></p>
        </div>
      )}
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Campaign SMS</h2>
        <p className="text-sm text-gray-500 mt-1">Send messages to your campaign team members</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Sent',     value: stats.totalSent     ?? 0, icon: Send,        color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Delivered',      value: stats.totalDelivered ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Failed',         value: stats.totalFailed    ?? 0, icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="vc-stat-card">
              <div className="flex items-start justify-between">
                <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900 mt-0.5">{value.toLocaleString()}</p></div>
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-4 h-4 ${color}`} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Internal Use Only</p>
          <p className="mt-0.5 text-amber-700">SMS is for communicating with your campaign team members — coordinators, volunteers, and agents. Only contacts who have given consent will receive messages.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['compose', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'history' ? `History (${batches.length})` : 'Compose'}
          </button>
        ))}
      </div>

      {/* Compose */}
      {tab === 'compose' && (
        <div className="space-y-4">
          {/* Templates */}
          {approvedTemplates.length > 0 && (
            <div className="vc-card">
              <p className="text-sm font-semibold text-gray-900 mb-3">Quick Templates</p>
              <div className="flex flex-wrap gap-2">
                {approvedTemplates.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setCompose({ ...compose, messageContent: t.body })}
                    className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100"
                  >
                    {t.templateName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="vc-card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name (optional)</label>
              <input
                className="vc-input"
                value={compose.batchName}
                onChange={(e) => setCompose({ ...compose, batchName: e.target.value })}
                placeholder="e.g. Mwiki Rally Reminder"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send To *</label>
              <select
                className="vc-input"
                value={compose.audienceType}
                onChange={(e) => setCompose({ ...compose, audienceType: e.target.value })}
              >
                {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {compose.audienceType === 'ward_team' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code *</label>
                <input
                  className="vc-input"
                  value={compose.wardCode}
                  onChange={(e) => setCompose({ ...compose, wardCode: e.target.value })}
                  placeholder="e.g. 0101"
                  maxLength={4}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Message *</label>
                <span className={`text-xs ${charCount > 320 ? 'text-red-500' : 'text-gray-400'}`}>
                  {charCount} chars · {smsCount} SMS
                </span>
              </div>
              <textarea
                className="vc-input"
                rows={4}
                value={compose.messageContent}
                onChange={(e) => setCompose({ ...compose, messageContent: e.target.value })}
                placeholder="Type your message here… (160 chars = 1 SMS)"
              />
              <p className="text-xs text-gray-400 mt-1">
                Cost estimate: KES {(smsCount * 0.80).toFixed(2)} per recipient
              </p>
            </div>

            {sendMut.isError && (
              <p className="text-sm text-red-600">Failed to send. Please try again.</p>
            )}
            {sendMut.isSuccess && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4" /> Message sent successfully.
              </div>
            )}

            <button
              onClick={() => {
                if (!compose.messageContent.trim()) return;
                sendMut.mutate({
                  messageContent:  compose.messageContent,
                  batchName:       compose.batchName || undefined,
                  audienceFilter:  compose.audienceType === 'ward_team'
                    ? { ward_codes: [compose.wardCode] }
                    : { audience_type: compose.audienceType },
                });
              }}
              disabled={sendMut.isPending || !compose.messageContent.trim() || !campaign}
              className={`w-full vc-btn-primary flex items-center justify-center gap-2 ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Send className="w-4 h-4" />
              {sendMut.isPending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="vc-card p-0 overflow-hidden">
          {batches.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No messages sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {batches.map((batch: any) => {
                const deliveryRate = batch.totalSent > 0
                  ? Math.round((batch.totalDelivered / batch.totalSent) * 100)
                  : 0;
                return (
                  <div key={batch.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{batch.batchName ?? 'Untitled batch'}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{batch.messageBody ?? batch.templateBody ?? '—'}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{batch.totalSent ?? 0} sent</span>
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />{batch.totalDelivered ?? 0} delivered</span>
                          {batch.totalFailed > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" />{batch.totalFailed} failed</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${batch.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : batch.status === 'sending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {batch.status}
                        </span>
                        {batch.sentAt && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(batch.sentAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {batch.totalSent > 0 && (
                          <div className="mt-1.5">
                            <div className="w-16 bg-gray-100 rounded-full h-1 ml-auto">
                              <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${deliveryRate}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{deliveryRate}% delivered</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MySMSPage() {
  return (
    <PageErrorBoundary page="My Campaign SMS">
      <MySMSContent />
    </PageErrorBoundary>
  );
}
