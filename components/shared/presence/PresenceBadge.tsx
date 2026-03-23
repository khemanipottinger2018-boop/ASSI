'use client';

import type { PresenceDisplayOutput } from '@/lib/presence/usePresenceDisplay';

type PresenceBadgeProps = {
  display: PresenceDisplayOutput;
  size?: 'sm' | 'md';
  className?: string;
};

const VARIANT_STYLES: Record<
  PresenceDisplayOutput['variant'],
  {
    wrap: string;
    dot: string;
    defaultLabel: string;
  }
> = {
  available: {
    wrap: 'bg-green-500/15 text-green-300 border border-green-400/20',
    dot: 'bg-green-400',
    defaultLabel: 'Available',
  },
  busy: {
    wrap: 'bg-yellow-500/15 text-yellow-300 border border-yellow-400/20',
    dot: 'bg-yellow-400',
    defaultLabel: 'In Session',
  },
  unavailable: {
    wrap: 'bg-white/10 text-white/50 border border-white/10',
    dot: 'bg-white/30',
    defaultLabel: 'Unavailable',
  },
  offline: {
    wrap: 'bg-white/10 text-white/50 border border-white/10',
    dot: 'bg-white/30',
    defaultLabel: 'Offline',
  },
  reconnecting: {
    wrap: 'bg-blue-500/10 text-blue-300 border border-blue-400/20',
    dot: 'bg-blue-400',
    defaultLabel: 'Reconnecting',
  },
};

export default function PresenceBadge({
  display,
  size = 'md',
  className = '',
}: PresenceBadgeProps) {
  const { variant, label, pulse } = display;
  const cfg = VARIANT_STYLES[variant];

  const dotSize = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${cfg.wrap} ${className}`}
    >
      <span
        className={`${dotSize} rounded-full ${cfg.dot} ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      {label ?? cfg.defaultLabel}
    </span>
  );
}