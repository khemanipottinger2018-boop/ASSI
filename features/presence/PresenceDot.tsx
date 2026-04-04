'use client';

import type { PresenceDisplayOutput } from './usePresenceDisplay';

// Canonical presence colours — single source of truth for all presence indicators.
// Keep in sync with PresenceBadge variant styles.
const DOT_COLOR: Record<PresenceDisplayOutput['variant'], string> = {
  available:    'bg-emerald-400',
  busy:         'bg-orange-400',
  unavailable:  'bg-red-400',
  offline:      'bg-white/25',
  reconnecting: 'bg-blue-400',
};

export const PRESENCE_LABEL_COLOR: Record<PresenceDisplayOutput['variant'], string> = {
  available:    'text-emerald-400',
  busy:         'text-orange-400',
  unavailable:  'text-red-400',
  offline:      'text-white/35',
  reconnecting: 'text-blue-400',
};

type PresenceDotProps = {
  display: PresenceDisplayOutput;
  /** Extra Tailwind classes for size, position, border, etc. */
  className?: string;
};

export default function PresenceDot({ display, className = '' }: PresenceDotProps) {
  const { variant, pulse } = display;
  return (
    <span
      className={`
        rounded-full ${DOT_COLOR[variant]}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `.trim()}
    />
  );
}
