import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface VerificationBadgeProps {
  status: 'verified' | 'pending' | 'failed';
  size?: 'sm' | 'md' | 'lg';
}

const config = {
  verified: {
    icon: CheckCircle,
    label: 'Integrity Verified',
    bgColor: 'bg-semantic-success/10',
    textColor: 'text-semantic-success-dark',
    borderColor: 'border-semantic-success/30',
  },
  pending: {
    icon: Clock,
    label: 'Verification Pending',
    bgColor: 'bg-semantic-warning/10',
    textColor: 'text-semantic-warning-dark',
    borderColor: 'border-semantic-warning/30',
  },
  failed: {
    icon: XCircle,
    label: 'Verification Failed',
    bgColor: 'bg-semantic-error/10',
    textColor: 'text-semantic-error-dark',
    borderColor: 'border-semantic-error/30',
  },
} as const;

const sizes = {
  sm: { container: 'px-2.5 py-1 text-xs', icon: 'h-3.5 w-3.5' },
  md: { container: 'px-4 py-2 text-sm', icon: 'h-5 w-5' },
  lg: { container: 'px-6 py-3 text-base', icon: 'h-6 w-6' },
} as const;

export function VerificationBadge({ status, size = 'md' }: VerificationBadgeProps) {
  const { icon: Icon, label, bgColor, textColor, borderColor } = config[status];
  const { container, icon } = sizes[size];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${bgColor} ${textColor} ${borderColor} ${container} font-medium`}
      role="status"
      aria-label={label}
    >
      <Icon className={icon} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
