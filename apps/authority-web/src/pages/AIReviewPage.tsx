import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, AlertTriangle, Eye } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function AIReviewPage(): React.JSX.Element {
  const { data: flagged } = useQuery({
    queryKey: ['ai', 'flagged'],
    queryFn: () => apiClient.get('/evidence/capsules?aiFlag=true').then((r) => r.data?.data ?? []),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">AI Review</h2>
        <p className="text-sm text-gray-500 mt-1">Capsules flagged by AI for human review — confidence scores and anomaly details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="vc-stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">AI Flagged Capsules</p>
            <p className="text-2xl font-bold text-gray-900">{flagged?.length ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Flagged Evidence Capsules</h3>
        </div>
        {!flagged || flagged.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No capsules currently flagged by AI</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Capsule ID</th><th>Station</th><th>AI Confidence</th><th>Anomaly Type</th><th>Actions</th></tr></thead>
            <tbody>
              {flagged.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-mono text-xs">{item.id?.substring(0, 8)}…</td>
                  <td>{item.pollingStationCode ?? '—'}</td>
                  <td>
                    <span className="vc-badge bg-red-100 text-red-700">
                      {item.aiConfidenceScore ? `${(item.aiConfidenceScore * 100).toFixed(0)}%` : 'Low'}
                    </span>
                  </td>
                  <td>{item.anomalyType ?? 'Image quality'}</td>
                  <td>
                    <button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="View capsule">
                      <Eye className="w-4 h-4" />
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
