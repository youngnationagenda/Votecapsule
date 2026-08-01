import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  description?: string;
}

export function StatsCard({ icon: Icon, value, label, description }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
          <Icon className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-sm font-medium text-neutral-600">{label}</p>
          {description && (
            <p className="mt-1 text-xs text-neutral-400">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
