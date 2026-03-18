'use client';

import { useAuth }     from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';

const DOT_STYLE: Record<string, { bg: string; glow: string; label: string }> = {
  online:  { bg: '#34d399', glow: '0 0 6px rgba(52,211,153,0.7)',  label: 'Available'   },
  busy:    { bg: '#fb923c', glow: '0 0 6px rgba(251,146,60,0.6)',  label: 'In Session'  },
  offline: { bg: 'rgba(255,255,255,0.2)', glow: 'none',            label: 'Offline'     },
};

// Lightweight badge used in TutorHeader.
// Full availability toggle lives in TutorDashboard / TutorHomeSelector.
export default function TutorStatusCard() {
  const { user }   = useAuth();
  const { status } = usePresence();
  const dot        = DOT_STYLE[status];

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
      <div style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: dot.bg,
        boxShadow: dot.glow,
        animation: status === 'online' ? 'pulse 2.5s infinite' : 'none',
      }} />
      <div className="text-sm">
        <div className="font-medium">{user?.username}</div>
        <div className="text-xs text-white/50">{dot.label}</div>
      </div>
    </div>
  );
}
