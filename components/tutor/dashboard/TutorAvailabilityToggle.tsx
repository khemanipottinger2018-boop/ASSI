'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';

export default function TutorAvailabilityToggle() {
  const { tutorAvailable, setTutorAvailable, tutorBusy, socketConnected, isOnline, hydrated } = usePresence();
  const toggling = !hydrated || !socketConnected || !isOnline;

  const disabled = toggling || tutorBusy;

  if (!setTutorAvailable) return null; // Only tutors

  return (
    <button
      onClick={() => setTutorAvailable(!tutorAvailable)}
      disabled={disabled}
      className="relative flex items-center gap-3 transition group disabled:cursor-not-allowed"
      style={{ opacity: tutorBusy ? 0.5 : 1 }}
    >
      <div className={`
        relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0
        ${tutorAvailable
          ? 'bg-emerald-500/30 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
          : 'bg-white/8 border border-white/12'
        }
      `}>
        {toggling ? (
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <Loader2 size={10} className="text-white/50 animate-spin" />
          </div>
        ) : (
          <motion.div
            animate={{ x: tutorAvailable ? 24 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`
              absolute top-1 w-4 h-4 rounded-full transition-colors duration-300
              ${tutorAvailable
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : 'bg-white/30'
              }
            `}
          />
        )}
        <AnimatePresence>
          {tutorAvailable && !toggling && (
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
        <p className={`text-xs font-semibold transition-colors ${
          tutorBusy      ? 'text-orange-400' :
          tutorAvailable ? 'text-emerald-400' : 'text-white/40'
        }`}>
          {tutorBusy ? 'In Session' : tutorAvailable ? 'Online' : 'Offline'}
        </p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {tutorBusy
            ? 'Currently with a student'
            : toggling
              ? 'Updating…'
              : tutorAvailable
                ? 'Students can find you'
                : 'Hidden from browse'}
        </p>
      </div>
    </button>
  );
}