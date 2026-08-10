import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Globe, Lock, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function PublicationControlPageContent(): React.JSX.Element {
  const qc = useQueryClient();

  const { data: readyToPublish } = useQuery({
    queryKey: ['evidence', 'anchored'],
    queryFn: () => apiClient.get('/evidence/capsules?status=ANCHORED').then((r) => r.data?.data ?? []),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/evidence/capsules/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence', 'anchored'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Publication Control</h2>
        <p className="text-sm text-gray-500 mt-1">Publish or unpublish official election results — once published, visible to the public</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Publication is irreversible in standard flow</p>
          <p className="text-xs text-amber-700 mt-1">Once a capsule is published, it becomes publicly visible on the Public Transparency Portal. Only publish verified and integrity-confirmed capsules.</p>
        </div>
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Anchored — Ready to Publish</h3>
          <span className="vc-badge bg-emerald-100 text-emerald-700">{readyToPublish?.length ?? 0}</span>
        </div>

        {!readyToPublish || readyToPublish.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No capsules ready for publication</p>
            <p className="text-sm text-gray-400 mt-1">Capsules must be Integrity Verified before publishing</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Capsule</th><th>Station</th><th>Anchored At</th><th>Integrity</th><th>Action</th></tr></thead>
            <tbody>
              {readyToPublish.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-mono text-xs">{item.id?.substring(0, 8)}…</td>
                  <td>{item.pollingStationCode ?? '—'}</td>
                  <td>{item.anchoredAt ? new Date(item.anchoredAt).toLocaleString() : '—'}</td>
                  <td><span className="vc-badge bg-emerald-100 text-emerald-700">Integrity Verified</span></td>
                  <td>
                    <button onClick={() => publishMutation.mutate(item.id)} disabled={publishMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
                      <Globe className="w-3 h-3" />Publish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function PublicationControlPage() {
  return (
    <PageErrorBoundary page="Publication Control">
      <PublicationControlPageContent />
    </PageErrorBoundary>
  );
}
