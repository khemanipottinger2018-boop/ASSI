'use client';

import { useAuth }            from '@/features/auth';
import { usePresenceDisplay } from '@/features/presence/usePresenceDisplay';

// Lightweight badge used in TutorHeader.
// Full availability toggle lives in TutorDashboard / TutorHomeSelector.
export default function TutorStatusCard() {
  const { user }  = useAuth();
  const { variant, label } = usePresenceDisplay();

  const dot: Record<string, { bg: string; glow: string }> = {
    available:    { bg: '#34d399', glow: '0 0 6px rgba(52,211,153,0.7)'  },
    busy:         { bg: '#fb923c', glow: '0 0 6px rgba(251,146,60,0.6)'  },
    unavailable:  { bg: 'rgba(255,255,255,0.2)', glow: 'none'            },
    offline:      { bg: 'rgba(255,255,255,0.2)', glow: 'none'            },
    reconnecting: { bg: '#60a5fa', glow: '0 0 6px rgba(96,165,250,0.6)' },
  };

  const d = dot[variant] ?? dot.offline;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
      <div style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: d.bg,
        boxShadow: d.glow,
        animation: variant === 'available' ? 'pulse 2.5s infinite' : 'none',
      }} />
      <div className="text-sm">
        <div className="font-medium">{user?.username}</div>
        <div className="text-xs text-white/70">{label}</div>
      </div>
    </div>
  );
}