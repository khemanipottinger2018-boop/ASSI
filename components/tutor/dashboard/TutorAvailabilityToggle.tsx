'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface TutorAvailabilityToggleProps {
  available: boolean;
  toggling: boolean;
  onToggle: () => void;
}

export default function TutorAvailabilityToggle({ available, toggling, onToggle }: TutorAvailabilityToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className="relative flex items-center gap-3 disabled:opacity-60 transition group"
    >
      {/* Track */}
      <div className={`
        relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0
        ${available
          ? 'bg-emerald-500/30 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
          : 'bg-white/8 border border-white/12'
        }
      `}>
        {/* Thumb */}
        <motion.div
          animate={{ x: available ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`
            absolute top-1 w-4 h-4 rounded-full transition-colors duration-300
            ${available ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-white/30'}
          `}
        />

        {/* Pulse ring when online */}
        <AnimatePresence>
          {available && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.4, 0], scale: [1, 1.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-1 left-6 w-4 h-4 rounded-full bg-emerald-400"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="text-left">
        <p className={`text-xs font-semibold transition-colors ${available ? 'text-emerald-400' : 'text-white/40'}`}>
          {available ? 'Online' : 'Offline'}
        </p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {available ? 'Students can find you' : 'Hidden from browse'}
        </p>
      </div>
    </button>
  );
}