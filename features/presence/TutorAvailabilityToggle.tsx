'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { usePresence } from '@/features/presence';
import { usePresenceDisplay } from './usePresenceDisplay';

export default function TutorAvailabilityToggle() {
  const { presence, setIntent, isLoading } = usePresence();
  const { variant, label, subtitle, canChangeIntent } = usePresenceDisplay();

  // Only render for tutors — canChangeIntent is false when busy_session (server-locked)
  // and also false when not yet loaded. The early return below handles the visual states.
  if (!presence) return null;

  const isAvailable  = presence.intent === 'available';
  const isBusy       = presence.intent === 'busy_session';
  const isConnecting = isLoading || !presence.online || !presence.socketConnected;
  const disabled     = isConnecting || isBusy;

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

        {/* Pulse ring — only when available and connected */}
        <AnimatePresence>
          {isAvailable && !isConnecting && (
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
