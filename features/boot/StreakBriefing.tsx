'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import type { UserStreak } from '@/lib/api/user';

/* =====================================================
 * STREAK BRIEFING
 * Compact top-centre toast shown after the animated
 * quote when remember-me is active.
 * Auto-dismisses after 3 s; click anywhere to dismiss.
 * ===================================================== */

interface StreakBriefingProps {
  streak:    UserStreak;
  onDismiss: () => void;
}

export default function StreakBriefing({ streak, onDismiss }: StreakBriefingProps) {
  const { currentStreak } = streak;
  const isYear  = currentStreak >= 365;
  const isMonth = currentStreak >= 30 && !isYear;

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const accentColor = isYear ? '#facc15' : '#f97316'; // yellow-400 or orange-400

  function label() {
    if (isYear)    return 'Year Complete!';
    if (isMonth)   return `${currentStreak} days`;
    return `Day ${currentStreak}`;
  }

  function sub() {
    if (currentStreak === 0) return 'Start your streak today';
    if (isYear)              return 'ASSI+ unlocked · streak champion';
    return `${currentStreak} day streak`;
  }

  return (
    <motion.div
      className="fixed top-6 left-1/2 z-[9998] pointer-events-auto"
      style={{ x: '-50%' }}
      initial={{ opacity: 0, y: -18, scale: 0.94, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y:   0, scale: 1,    filter: 'blur(0px)' }}
      exit={{    opacity: 0, y: -14, scale: 0.96, filter: 'blur(4px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Outer glow pulse */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          boxShadow: [
            `0 0  0px ${accentColor}00`,
            `0 0 28px ${accentColor}28`,
            `0 0  0px ${accentColor}00`,
          ],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Card */}
      <div
        className="panel rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
        style={{
          borderColor: `${accentColor}22`,
          minWidth: '220px',
        }}
        onClick={onDismiss}
        role="button"
        aria-label="Dismiss streak briefing"
      >
        {/* Flame icon */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}18` }}
        >
          <Flame size={16} style={{ color: accentColor }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none">
            {label()}
          </p>
          <p className="text-white/40 text-[11px] mt-1 leading-none truncate">
            {sub()}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0 ml-1"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}
