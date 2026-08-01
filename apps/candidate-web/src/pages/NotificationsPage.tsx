import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function NotificationsPage(): React.JSX.Element {
  const { data: notifications } = useQuery({ queryKey: ['candidate','notifications'], queryFn: () => apiClient.get('/notification/notifications?scope=mine').then(r => r.data?.data ?? []) });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Notifications</h2><p className="text-sm text-gray-500">Platform notifications relevant to your account</p></div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-amber-600" /><h3 className="font-semibold text-gray-900">Recent Notifications</h3></div>
        {!notifications || notifications.length === 0 ? (
          <div className="text-center py-12"><Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No notifications yet</p></div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n: any) => (
              <div key={n.id} className={`p-4 rounded-xl border ${n.read ? 'bg-gray-50 border-gray-100' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle className={`w-4 h-4 mt-0.5 ${n.read ? 'text-gray-400' : 'text-amber-500'}`} />
                  <div><p className="text-sm font-medium text-gray-900">{n.title}</p><p className="text-xs text-gray-500 mt-0.5">{n.message}</p><p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
