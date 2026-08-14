import React from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

type HealthStatus = 'operational' | 'degraded' | 'down';

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
}

// In production, these would be fetched from a health check endpoint
const MOCK_SERVICES: ServiceHealth[] = [
  { name: 'Identity Service', status: 'operational', latencyMs: 12 },
  { name: 'Tenant Service', status: 'operational', latencyMs: 8 },
  { name: 'Geography Service', status: 'operational', latencyMs: 15 },
  { name: 'Trust Anchor (Hybrid)', status: 'operational', latencyMs: 45 },
  { name: 'AI Service', status: 'operational', latencyMs: 32 },
  { name: 'Workflow Engine', status: 'operational', latencyMs: 18 },
  { name: 'Evidence Service', status: 'operational', latencyMs: 22 },
  { name: 'Database (Aurora)', status: 'operational', latencyMs: 3 },
];

const statusConfig: Record<HealthStatus, { icon: React.ElementType; color: string; label: string }> = {
  operational: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Operational' },
  degraded: { icon: AlertCircle, color: 'text-amber-500', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-red-400', label: 'Unavailable' },
};

export function PlatformHealthIndicator(): React.JSX.Element {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Platform Services</h3>
        <span className="text-xs text-gray-400">Last updated: just now</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MOCK_SERVICES.map((service) => {
          const config = statusConfig[service.status];
          const Icon = config.icon;
          return (
            <div key={service.name} className="flex flex-col items-center text-center gap-1 p-2 rounded-md bg-gray-50">
              <Icon className={clsx('w-5 h-5', config.color)} aria-hidden="true" />
              <span className="text-xs font-medium text-gray-700 leading-tight">{service.name}</span>
              <span className={clsx('text-xs', config.color)}>{config.label}</span>
              {service.latencyMs && (
                <span className="text-xs text-gray-400">{service.latencyMs}ms</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
