'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, LogIn, PhoneOff, LogOut, Loader2, Check, X } from 'lucide-react';
import { useSocketContext } from '@/features/socket';
import { sessionsApi } from '@/features/sessions/sessionsApi';

interface OngoingSessionCardProps {
  sessionId:   string;
  partnerName: string;
  subjectName: string;
  startedAt?:  string | null;
  role:        'student' | 'tutor';
  onCleared?:  () => void;
}

function useElapsed(startedAt?: string | null): string {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!startedAt) { setDisplay(''); return; }

    const origin = new Date(startedAt).getTime();
    if (isNaN(origin)) { setDisplay(''); return; }

    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - origin) / 1000));
      const m    = Math.floor(secs / 60);
      const s    = secs % 60;
      setDisplay(`${m}:${String(s).padStart(2, '0')}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return display;
}

export default function OngoingSessionCard({
  sessionId,
  partnerName,
  subjectName,
  startedAt,
  role,
  onCleared,
}: OngoingSessionCardProps) {
  const router = useRouter();
  const { emit } = useSocketContext();
  const elapsed = useElapsed(startedAt);

  const [confirming, setConfirming] = useState(false);
  const [ending, setEnding] = useState(false);

  const confirmRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!confirming) return;
    confirmRef.current = setTimeout(() => setConfirming(false), 4000);
    return () => { if (confirmRef.current) clearTimeout(confirmRef.current); };
  }, [confirming]);

  const handleEndClick = () => {
    if (ending) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setEnding(true);

    if (role === 'student') {
      // REST call ensures Prisma is updated synchronously, eliminating the
      // fire-and-forget race where the backend writes Prisma async after the
      // socket event — so a page refresh immediately after ending won't re-show
      // this card. The socket emit is still sent for live peer notification.
      sessionsApi.cancelLive(sessionId, 'ended_by_student').catch(() => {
        // Fallback: if REST fails, the socket emit below still ends the session
      });
      emit('session:end', { sessionId, reason: 'ended_by_student' });
    } else {
      emit('session:host_leave', { sessionId });
    }

    // Notify parent to clear its local session reference
    onCleared?.();
  };

  const handleCancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(false);
  };

  const avatar = partnerName?.[0]?.toUpperCase() ?? '?';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="w-full rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <div className="relative flex-shrink-0">
          <span className="absolute inset-0 rounded-full opacity-50 bg-emerald-400 animate-ping" />
          <span className="relative block w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">
          {subjectName || 'Session'}
        </span>

        <div className="flex-1" />

        {elapsed && (
          <span className="text-[11px] font-mono text-emerald-400/60">
            {elapsed}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 px-4 pb-3.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold bg-emerald-400/10 text-emerald-400">
          {avatar}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white/85 text-sm font-semibold truncate">
            {partnerName}
          </p>
          <p className="text-emerald-400/60 text-[11px] flex items-center gap-1">
            <MessageCircle size={9} />
            Ongoing session
          </p>
        </div>

        <AnimatePresence mode="wait">
          {confirming ? (
            <motion.div key="confirm" className="flex items-center gap-1.5">
              <span className="text-white/40 text-[11px]">Sure?</span>

              <button onClick={handleCancelConfirm}>
                <X size={12} />
              </button>

              <button onClick={handleEndClick} disabled={ending}>
                {ending ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} />}
              </button>
            </motion.div>
          ) : (
            <motion.div key="actions" className="flex items-center gap-1.5">
              <button onClick={handleEndClick}>
                {role === 'student'
                  ? <PhoneOff size={12} />
                  : <LogOut size={12} />}
              </button>

              <button onClick={() => router.push(`/live-chat/${sessionId}`)}>
                <LogIn size={11} /> Rejoin
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}