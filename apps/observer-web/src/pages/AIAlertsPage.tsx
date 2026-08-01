import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function AIAlertsPage(): React.JSX.Element {
  const { data: alerts } = useQuery({ queryKey: ['observer','ai-alerts'], queryFn: () => apiClient.get('/ai/alerts?published=true').then(r => r.data?.data ?? []) });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">AI Alerts</h2><p className="text-sm text-gray-500">Stations with high AI rejection rates and processing anomalies</p></div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><Brain className="w-4 h-4 text-violet-600" /><h3 className="font-semibold text-gray-900">AI Processing Alerts ({alerts?.length ?? 0})</h3></div>
        {!alerts || alerts.length === 0 ? (
          <div className="text-center py-12"><AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No AI alerts at this time</p></div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert: any) => (
              <div key={alert.id} className={`p-4 rounded-xl border ${alert.severity === 'HIGH' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{alert.title ?? 'AI Processing Alert'}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.description ?? `Station ${alert.pollingStationCode}`}</p>
                    <p className="text-xs text-gray-400 mt-1">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '—'}</p>
                  </div>
                  <span className={`vc-badge ${alert.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{alert.severity ?? 'MEDIUM'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
