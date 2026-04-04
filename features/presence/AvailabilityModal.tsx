'use client';

import { X, Wifi, WifiOff } from 'lucide-react';
import { usePresence }        from '@/features/presence';
import { usePresenceDisplay } from './usePresenceDisplay';

interface Props {
  onClose: () => void;
}

export default function AvailabilityModal({ onClose }: Props) {
  const { presence, setIntent } = usePresence();
  const { variant, canChangeIntent } = usePresenceDisplay();

  // Derive from variant — the source of truth — not raw presence fields.
  const isAvailable  = variant === 'available';
  const isBusy       = variant === 'busy';

  // canChangeIntent already encodes offline/reconnecting/busy_session/loading rules
  const disabled = !canChangeIntent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* Backdrop tap to close */}
      <div onClick={onClose} className="absolute inset-0" />

      <div className="relative w-full max-w-sm rounded-2xl glass p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Availability</h2>
            <p className="text-sm text-white/50 mt-1">
              Let students know if you're open for sessions
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Status card */}
        <div className={`rounded-2xl p-5 border transition-all ${
          isBusy       ? 'bg-orange-500/10 border-orange-500/20' :
          isAvailable  ? 'bg-emerald-500/10 border-emerald-500/20' :
                         'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {isAvailable
              ? <Wifi size={20} className="text-emerald-400" />
              : <WifiOff size={20} className="text-white/30" />
            }
            <div>
              <p className={`font-semibold text-sm ${
                isBusy      ? 'text-orange-400'  :
                isAvailable ? 'text-emerald-400' :
                              'text-white/50'
              }`}>
                {isBusy
                  ? 'Currently in a session'
                  : isAvailable
                    ? 'Available for sessions'
                    : 'Not available'}
              </p>
              <p className="text-xs text-white/30 mt-0.5">
                {isBusy
                  ? 'Availability will restore when your session ends.'
                  : isAvailable
                    ? 'Students can find and request you.'
                    : "You won't appear in available tutors."}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIntent('available')}
              disabled={disabled || isAvailable}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                isAvailable
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-white/8 text-white/60 hover:bg-emerald-500/15 hover:text-emerald-400 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              Go online
            </button>
            <button
              onClick={() => setIntent('do_not_disturb')}
              disabled={disabled || !isAvailable}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                !isAvailable
                  ? 'bg-white/10 text-white/40 border border-white/10 cursor-default'
                  : 'bg-white/8 text-white/60 hover:bg-red-500/15 hover:text-red-400 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              Go offline
            </button>
          </div>
        </div>

        <p className="text-xs text-white/25 text-center leading-relaxed">
          Availability is live. Changes take effect immediately for students browsing tutors.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl glass-soft text-white/60 hover:text-white text-sm transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
