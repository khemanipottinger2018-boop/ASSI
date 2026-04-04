'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { usePresence } from '@/features/presence';
import { usePresenceDisplay } from './usePresenceDisplay';

export default function TutorAvailabilityToggle() {
  const { presence, setIntent, isLoading } = usePresence();
  const { variant, label, subtitle, pulse, canChangeIntent } = usePresenceDisplay();

  // Show spinner skeleton while initial presence hasn't loaded yet
  if (isLoading || !presence) {
    return (
      <div className="relative flex items-center gap-3">
        <div className="relative w-12 h-6 rounded-full bg-white/8 border border-white/12 flex-shrink-0">
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <Loader2 size={10} className="text-white/50 animate-spin" />
          </div>
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold text-white/40">Checking…</p>
          <p className="text-[10px] text-white/20 mt-0.5">Loading presence</p>
        </div>
      </div>
    );
  }

  // Derive visual state from the display variant — the source of truth.
  // Using presence.intent directly would show green even when offline/reconnecting.
  const isAvailable  = variant === 'available';
  const isBusy       = variant === 'busy';
  const isConnecting = variant === 'reconnecting' || variant === 'offline';
  const disabled     = !canChangeIntent;

  const handleToggle = () => {
    if (disabled) return;
    // Toggle between available and do_not_disturb — matches the handover intent picker options.
    // We use do_not_disturb (not busy_other) as the "offline" intent for tutors.
    setIntent(isAvailable ? 'do_not_disturb' : 'available');
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className="relative flex items-center gap-3 transition group disabled:cursor-not-allowed"
      style={{ opacity: isBusy ? 0.5 : 1 }}
    >
      {/* Track */}
      <div
        className={`
          relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0
          ${isAvailable
            ? 'bg-emerald-500/30 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
            : 'bg-white/8 border border-white/12'
          }
        `}
      >
        {/* Thumb — spinner while connecting, animated knob otherwise */}
        {isConnecting ? (
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <Loader2 size={10} className="text-white/50 animate-spin" />
          </div>
        ) : (
          <motion.div
            animate={{ x: isAvailable ? 24 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`
              absolute top-1 w-4 h-4 rounded-full transition-colors duration-300
              ${isAvailable
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : 'bg-white/30'
              }
            `}
          />
        )}

        {/* Pulse ring — only when available and eligible (pulse from display) */}
        <AnimatePresence>
          {pulse && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.4, 0], scale: [1, 1.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-1 left-6 w-4 h-4 rounded-full bg-emerald-400"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Label */}
      <div className="text-left">
        <p
          className={`text-xs font-semibold transition-colors ${
            isBusy       ? 'text-orange-400'  :
            isAvailable  ? 'text-emerald-400' :
                           'text-white/40'
          }`}
        >
          {label}
        </p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {subtitle}
        </p>
      </div>
    </button>
  );
}
