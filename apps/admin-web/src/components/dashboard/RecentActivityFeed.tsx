import React from 'react';
import { UserPlus, Building2, Shield, LogIn, Settings, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface ActivityEvent {
  id: string;
  type: 'user_created' | 'tenant_created' | 'role_assigned' | 'login' | 'settings_changed' | 'alert';
  actor: string;
  description: string;
  timestamp: Date;
  severity?: 'info' | 'warning' | 'error';
}

// Mock activity feed — in production, fetched from Audit Service
const MOCK_EVENTS: ActivityEvent[] = [
  {
    id: '1', type: 'tenant_created', actor: 'Platform Admin',
    description: 'New tenant "IEBC Kenya" created (election_authority)',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: '2', type: 'user_created', actor: 'Platform Admin',
    description: 'User invited: commissioner@iebc.or.ke',
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    id: '3', type: 'role_assigned', actor: 'System',
    description: 'Role ELECTION_COMMISSIONER assigned to commissioner@iebc.or.ke',
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    id: '4', type: 'login', actor: 'admin@votecapsule.co.ke',
    description: 'Platform Super Admin logged in',
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
  },
  {
    id: '5', type: 'settings_changed', actor: 'Platform Admin',
    description: 'Platform configuration updated: max_tenants_per_region',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
  },
];

const eventIcons: Record<string, { icon: React.ElementType; color: string }> = {
  user_created: { icon: UserPlus, color: 'text-emerald-500' },
  tenant_created: { icon: Building2, color: 'text-[#0B3C6D]' },
  role_assigned: { icon: Shield, color: 'text-violet-500' },
  login: { icon: LogIn, color: 'text-blue-500' },
  settings_changed: { icon: Settings, color: 'text-gray-500' },
  alert: { icon: AlertTriangle, color: 'text-amber-500' },
};

export function RecentActivityFeed(): React.JSX.Element {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        <span className="text-xs text-gray-400">
          {/* TODO: Audit Service integration — GET /api/audit/events?limit=20 */}
          Last 20 events
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {MOCK_EVENTS.map((event) => {
          const { icon: Icon, color } = eventIcons[event.type] ?? eventIcons.settings_changed!;
          return (
            <div key={event.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className={clsx('p-1.5 rounded-md bg-gray-50 flex-shrink-0', color)}>
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{event.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{event.actor}</span>
                  <span className="text-gray-300">·</span>
                  <time className="text-xs text-gray-400" dateTime={event.timestamp.toISOString()}>
                    {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-3 border-t border-gray-100">
        <button
          onClick={() => window.location.assign('/audit')}
          className="text-sm text-[#0B3C6D] hover:text-[#2563EB] font-medium transition-colors"
        >
          View full audit log →
        </button>
      </div>
    </div>
  );
}
