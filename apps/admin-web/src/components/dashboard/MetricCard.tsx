import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  stub?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-gray-600',
  iconBg = 'bg-gray-50',
  trend,
  stub = false,
}: MetricCardProps): React.JSX.Element {
  return (
    <div className={clsx('bg-white rounded-lg border border-gray-200 p-5 shadow-sm', stub && 'opacity-70')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value >= 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={clsx('text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {trend.value >= 0 ? '+' : ''}{trend.value} {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', iconBg)}>
          <Icon className={clsx('w-6 h-6', iconColor)} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
