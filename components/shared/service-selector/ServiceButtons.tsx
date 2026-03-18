'use client';

import { motion } from 'framer-motion';
import { Cpu, Users, BookOpen } from 'lucide-react';

interface Props {
  disabled: boolean;
  liveTutorDisabled: boolean;
  onAI: () => void;
  onLiveTutor: () => void;
  onAssignment: () => void;
  primary?: 'ai' | 'live' | 'assignment';
}

const SERVICES = [
  {
    id:       'ai' as const,
    label:    'AI Assistant',
    sublabel: 'Instant answers',
    icon:     Cpu,
    solid:    { bg: '#0e9898',  shadow: 'rgba(14,152,152,0.45)',  hover: '#0bbfbf' },
  },
  {
    id:            'live' as const,
    label:         'Live Tutor',
    sublabel:      'Real-time help',
    icon:          Users,
    liveIndicator: true,
    solid:    { bg: '#7c3aed',  shadow: 'rgba(124,58,237,0.45)',  hover: '#8b5cf6' },
  },
  {
    id:       'assignment' as const,
    label:    'Assignment',
    sublabel: 'Submit & review',
    icon:     BookOpen,
    solid:    { bg: '#ea6000',  shadow: 'rgba(234,96,0,0.45)',    hover: '#f97316' },
  },
];

export default function ServiceButtons({
  disabled,
  liveTutorDisabled,
  onAI,
  onLiveTutor,
  onAssignment,
  primary = 'live',
}: Props) {
  const handlers = { ai: onAI, live: onLiveTutor, assignment: onAssignment };

  return (
    <div className="grid grid-cols-3 gap-3">
      {SERVICES.map(({ id, label, sublabel, icon: Icon, liveIndicator, solid }) => {
        const isBlocked = disabled || (id === 'live' && liveTutorDisabled);

        if (isBlocked) {
          return (
            <div key={id} className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl
              border border-white/8 bg-white/4 opacity-30 cursor-not-allowed select-none">
              <Icon size={18} className="text-white/30" />
              <span className="text-xs font-semibold text-white/30 text-center leading-tight">{label}</span>
            </div>
          );
        }

        return (
          <motion.button
            key={id}
            onClick={() => handlers[id]()}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl
                       cursor-pointer overflow-hidden text-center"
            style={{
              background: solid.bg,
              boxShadow: `0 4px 20px ${solid.shadow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = solid.hover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = solid.bg;
            }}
          >
            {/* Top-edge highlight */}
            <div className="absolute inset-x-0 top-0 h-px"
              style={{ background: 'rgba(255,255,255,0.28)' }}
            />

            {/* Live pulse */}
            {liveIndicator && (
              <span className="absolute top-2.5 right-2.5 flex items-center justify-center">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-white/40 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              </span>
            )}

            <Icon size={19} className="text-white" strokeWidth={1.8} />
            <div>
              <div className="text-xs font-bold text-white leading-tight">{label}</div>
              <div className="text-[10px] text-white/60 mt-0.5 leading-tight">{sublabel}</div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
