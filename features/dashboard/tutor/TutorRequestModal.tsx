'use client';

// components/tutor/TutorRequestModal.tsx
//
// Full-screen interrupt modal shown when a student requests a session.
// Replaces TutorLiveRequestCard as the primary accept/decline UX.
// Mount this once in TutorDashboard (or AppShell for tutors) and feed
// it the latest queue entry — it handles its own countdown and navigation.

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence }          from 'framer-motion';
import { useRouter }                        from 'next/navigation';
import { Zap, X, Clock, Loader2 }           from 'lucide-react';
import { api }                              from '@/lib/api';
import {
  modalVariants, modalTransition,
  backdropVariants, backdropTransition,
} from '@/lib/motion';

interface Props {
  sessionId:   string;
  studentName: string;
  subjectName: string;
  arrivedAt:   number;
  onAccept:    (sessionId: string) => void;
  onDecline:   (sessionId: string) => void;
}

const TTL = 60; // seconds before auto-expire

export default function TutorRequestModal({
  sessionId, studentName, subjectName, arrivedAt, onAccept, onDecline,
}: Props) {
  const router = useRouter();

  const [remaining,  setRemaining]  = useState(() =>
    Math.max(0, TTL - Math.floor((Date.now() - arrivedAt) / 1000))
  );
  const [accepting,  setAccepting]  = useState(false);
  const [error,      setError]      = useState('');

  const urgency = remaining <= 15;

  /* ── Countdown ── */
  useEffect(() => {
    if (remaining <= 0) { onDecline(sessionId); return; }

    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id);
          onDecline(sessionId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [sessionId, onDecline]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Accept ── */
  const handleAccept = useCallback(async () => {
    if (accepting || !sessionId) return;
    setAccepting(true);
    setError('');
    try {
      const data = await api.post<{ success: boolean }>(`/api/live-chat/${sessionId}/accept`);
      if (!data.success) throw new Error('Failed to accept session');
      onAccept(sessionId);
      router.push(`/live-chat/${sessionId}`);
    } catch (err: any) {
      setError(err?.message ?? 'Could not join session. Try again.');
      setAccepting(false);
    }
  }, [accepting, sessionId, onAccept, router]);

  /* ── Decline ── */
  const handleDecline = useCallback(() => {
    onDecline(sessionId);
  }, [sessionId, onDecline]);

  const pct = (remaining / TTL) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <motion.div
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={backdropTransition}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDecline}
      />

      {/* Modal */}
      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={modalTransition}
        className="relative w-full max-w-sm glass rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Countdown bar */}
        <div className="h-1 w-full bg-white/5">
          <motion.div
            className={`h-full ${urgency ? 'bg-red-400' : 'bg-emerald-400'}`}
            style={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </div>

        <div className="p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <Zap size={14} className="text-emerald-400" />
                </div>
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">
                  Instant request
                </span>
              </div>
              <h2 className="text-white font-semibold text-xl tracking-tight">
                Student needs help
              </h2>
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              urgency
                ? 'bg-red-500/15 border-red-500/20 text-red-400'
                : 'bg-white/5 border-white/10 text-white/65'
            }`}>
              <Clock size={11} />
              <span className="text-xs font-mono font-semibold tabular-nums">
                {remaining}s
              </span>
            </div>
          </div>

          {/* Student + subject info */}
          <div className="glass-soft rounded-2xl px-4 py-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/65">Student</span>
              <span className="text-white font-medium">{studentName}</span>
            </div>
            {subjectName && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/65">Subject</span>
                <span className="text-white font-medium">{subjectName}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/65">Type</span>
              <span className="text-white">Instant chat · Free · up to 60 min</span>
            </div>
          </div>

          {error && (
            <p className="text-red-400/80 text-xs text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={accepting}
              className="flex items-center justify-center w-11 h-11 rounded-2xl glass-soft border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition flex-shrink-0"
            >
              <X size={16} />
            </button>

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 active:scale-[0.98] disabled:opacity-60 transition shadow-lg shadow-black/20"
            >
              {accepting
                ? <><Loader2 size={14} className="animate-spin" /> Joining…</>
                : <><Zap size={14} /> Accept & Join</>
              }
            </button>
          </div>

          <p className="text-white/50 text-[10px] text-center">
            Request expires in {remaining}s — tap outside or × to dismiss
          </p>
        </div>
      </motion.div>
    </div>
  );
}