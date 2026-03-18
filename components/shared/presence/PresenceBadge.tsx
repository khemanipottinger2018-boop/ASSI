'use client';

import { PresenceStatus } from '@/contexts/PresenceProvider';

type PresenceBadgeProps = {
  status: PresenceStatus;
  label?: string;
  loading?: boolean;
  pulse?: boolean;
  className?: string;
};

const STATUS_STYLES: Record<
  PresenceStatus,
  {
    wrap: string;
    dot: string;
    defaultLabel: string;
  }
> = {
  online: {
    wrap: 'bg-green-500/15 text-green-300 border border-green-400/20',
    dot: 'bg-green-400',
    defaultLabel: 'Online',
  },
  busy: {
    wrap: 'bg-yellow-500/15 text-yellow-300 border border-yellow-400/20',
    dot: 'bg-yellow-400',
    defaultLabel: 'Busy',
  },
  offline: {
    wrap: 'bg-white/10 text-white/50 border border-white/10',
    dot: 'bg-white/30',
    defaultLabel: 'Offline',
  },
};

export default function PresenceBadge({
  status,
  label,
  loading = false,
  pulse = false,
  className = '',
}: PresenceBadgeProps) {
  const cfg = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${cfg.wrap} ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${cfg.dot} ${pulse ? 'animate-pulse' : ''}`}
      />
      {loading ? 'Checking...' : label ?? cfg.defaultLabel}
    </span>
  );
}