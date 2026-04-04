'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import { useRouter }                         from 'next/navigation';
import {
  Calendar, User, BookOpen, ChevronRight,
  Loader2, LogIn, XCircle, CheckCircle,
  X, AlertTriangle, MessageCircle,
} from 'lucide-react';
import { sessionsApi, api }  from '@/lib/api';
import { browseApi }         from '@/features/booking/browseApi';
import { useAuth }           from '@/features/auth';
import { useSocket }         from '@/features/socket';
import type { ChatSession }  from '@/lib/api';

type Tab = 'upcoming' | 'completed' | 'all';

const statusStyle: Record<string, { label: string; color: string }> = {
  active:          { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  in_progress:     { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  waiting:         { label: 'Waiting',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20'   },
  pending:         { label: 'Pending',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20'   },
  instant_pending: { label: 'Pending',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20'   },
  matched:         { label: 'Matched',   color: 'text-blue-400 bg-blue-500/15 border-blue-500/20'         },
  confirmed:       { label: 'Confirmed', color: 'text-purple-400 bg-purple-500/15 border-purple-500/20'   },
  completed:       { label: 'Done',      color: 'text-white/30 bg-white/5 border-white/10'                },
  cancelled:       { label: 'Cancelled', color: 'text-red-400/60 bg-red-500/10 border-red-500/15'         },
  ended:           { label: 'Ended',     color: 'text-white/30 bg-white/5 border-white/10'                },
};

const UPCOMING_STATUSES   = ['pending', 'confirmed', 'waiting', 'in_progress', 'active', 'matched', 'instant_pending'];
const COMPLETED_STATUSES  = ['completed', 'cancelled', 'ended'];
const LIVE_STATUSES       = ['active', 'in_progress', 'waiting', 'instant_pending', 'matched'];
const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'active', 'in_progress', 'waiting', 'matched', 'instant_pending'];
const INSTANT_STATUSES    = ['waiting', 'instant_pending'];

export default function SessionsPage() {
  const router = useRouter();
  const { isTutor, user } = useAuth();
  const { subscribe } = useSocket();

  const [sessions,    setSessions]    = useState<ChatSession[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<Tab>('upcoming');

  // Modal
  const [selected,      setSelected]      = useState<ChatSession | null>(null);
  const [cancelMode,    setCancelMode]    = useState(false);
  const [cancelReason,  setCancelReason]  = useState('');
  const [actioning,     setActioning]     = useState(false);
  const [actionError,   setActionError]   = useState('');

  // Student alert when tutor joins
  const [readyAlert, setReadyAlert] = useState<string | null>(null);

  const fetchSessions = useCallback(() => {
    sessionsApi.getChatSessions()
      .then(d => {
        if (d.success) {
          const seen   = new Set<string>();
          const unique = (d.sessions ?? []).filter(s => {
            if (seen.has(s.sessionId)) return false;
            seen.add(s.sessionId);
            return true;
          });
          setSessions(unique);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchSessions(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSessions]);

  useEffect(() => {
    const id = setInterval(fetchSessions, 30_000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  // Real-time status updates
  useEffect(() => {
    return subscribe(
      'session:status_changed',
      ({ sessionId, newStatus }: { sessionId: string; oldStatus: string; newStatus: string }) => {
        setSessions(prev => prev.map(s =>
          s.sessionId === sessionId ? { ...s, status: newStatus as any } : s
        ));
      },
    );
  }, [subscribe]);

  // Tutor accepted → alert the student
  useEffect(() => {
    return subscribe('session:ready', ({ sessionId }: { sessionId: string }) => {
      setSessions(prev => prev.map(s =>
        s.sessionId === sessionId ? { ...s, status: 'active' as any, live: true } : s
      ));
      if (!isTutor) setReadyAlert(sessionId);
    });
  }, [subscribe, isTutor]);

  // ── Modal helpers ──────────────────────────────────────────────

  function openModal(session: ChatSession) {
    setSelected(session);
    setCancelMode(false);
    setCancelReason('');
    setActionError('');
  }

  function closeModal() {
    setSelected(null);
    setCancelMode(false);
    setCancelReason('');
    setActionError('');
    setActioning(false);
  }

  // Tutor: join (instant sessions → accept; booked → confirm then navigate)
  const handleJoin = useCallback(async () => {
    if (!selected || actioning) return;
    setActioning(true);
    setActionError('');
    try {
      const isInstant = INSTANT_STATUSES.includes(selected.status);
      if (isInstant) {
        await api.post<{ success: boolean }>(`/api/live-chat/${selected.sessionId}/accept`);
      } else {
        await browseApi.confirm(selected.sessionId);
      }
      closeModal();
      router.push(`/live-chat/${selected.sessionId}`);
    } catch (err: any) {
      setActionError(err?.message ?? 'Failed to join session');
      setActioning(false);
    }
  }, [selected, actioning, router]);

  // Either party: cancel with optional reason
  // Always use PATCH /api/browse/sessions/:id/cancel — it handles all statuses and both parties.
  // POST /api/live-chat/:id/cancel is student-only from the waiting room (live-chat UI only).
  const handleCancel = useCallback(async () => {
    if (!selected || actioning) return;
    setActioning(true);
    setActionError('');
    try {
      const res = await browseApi.cancel(selected.sessionId, cancelReason || undefined);
      if (!res.success) {
        setActionError('Failed to cancel session');
        setActioning(false);
        return;
      }
      setSessions(prev => prev.map(s =>
        s.sessionId === selected.sessionId ? { ...s, status: 'cancelled' as any } : s
      ));
      closeModal();
    } catch (err: any) {
      setActionError(err?.message ?? 'Failed to cancel session');
      setActioning(false);
    }
  }, [selected, actioning, cancelReason]);

  // ── Derived lists ──────────────────────────────────────────────

  const upcoming  = sessions.filter(s => UPCOMING_STATUSES.includes(s.status));
  const completed = sessions.filter(s => COMPLETED_STATUSES.includes(s.status));
  const raw       = tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : sessions;
  const displayed = Array.from(new Map(raw.map(s => [s.sessionId, s])).values());

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <h1 className="text-white font-semibold text-xl tracking-tight">Sessions</h1>
        <p className="text-white/40 text-sm mt-1">Your tutoring history and upcoming bookings</p>
      </motion.div>

      {/* ── Student alert: tutor joined ── */}
      <AnimatePresence>
        {readyAlert && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="glass rounded-2xl px-4 py-3 border border-emerald-500/25 bg-emerald-500/8 flex items-center gap-3"
          >
            <div className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
              <MessageCircle size={14} className="text-emerald-400 relative" />
            </div>
            <p className="text-emerald-300 text-sm flex-1">Your tutor joined — session is ready!</p>
            <button
              onClick={() => { router.push(`/live-chat/${readyAlert}`); setReadyAlert(null); }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition"
            >
              Join now
            </button>
            <button onClick={() => setReadyAlert(null)} className="text-white/20 hover:text-white/50 transition">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="flex items-center gap-1 glass-soft rounded-xl p-1 w-fit"
      >
        {([
          { key: 'upcoming',  label: `Upcoming (${upcoming.length})`   },
          { key: 'completed', label: `Completed (${completed.length})` },
          { key: 'all',       label: 'All'                             },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === t.key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* ── Session list ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass rounded-2xl px-4 py-12 text-center">
          <Calendar size={20} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/30 text-sm">
            {tab === 'upcoming' ? 'No upcoming sessions' : 'No sessions yet'}
          </p>
          {tab === 'upcoming' && (
            <button onClick={() => router.push('/browse')}
              className="mt-4 px-5 py-2 rounded-xl bg-white text-orange-600 text-xs font-semibold hover:bg-white/90 transition">
              Find a tutor
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          {displayed.map((session, i) => {
            const style     = statusStyle[session.status] ?? statusStyle.pending;
            const isLive    = LIVE_STATUSES.includes(session.status);
            const startedAt = session.startedAt ? new Date(session.startedAt) : null;
            const dateStr   = startedAt
              ? startedAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : '—';
            const timeStr   = startedAt
              ? startedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : null;

            return (
              <motion.div key={session.sessionId}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => openModal(session)}
                className="glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.06] transition group"
              >
                <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center flex-shrink-0">
                  {isLive
                    ? <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                      </span>
                    : <User size={15} className="text-white/35" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/80 text-sm font-medium">{session.partnerName}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-white/30 text-xs">
                    <BookOpen size={10} />
                    <span>{session.subjectName}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-white/50 text-xs">{dateStr}</p>
                  {timeStr && <p className="text-white/25 text-[10px] mt-0.5">{timeStr}</p>}
                </div>

                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition flex-shrink-0" />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Session action modal ── */}
      <AnimatePresence>
        {selected && (
          <SessionModal
            session={selected}
            isTutor={isTutor}
            cancelMode={cancelMode}
            cancelReason={cancelReason}
            actioning={actioning}
            actionError={actionError}
            onClose={closeModal}
            onJoin={handleJoin}
            onStartCancel={() => { setCancelMode(true); setActionError(''); }}
            onCancelReasonChange={setCancelReason}
            onConfirmCancel={handleCancel}
            onBackFromCancel={() => { setCancelMode(false); setCancelReason(''); setActionError(''); }}
            onRejoin={() => { closeModal(); router.push(`/live-chat/${selected.sessionId}`); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Session action modal ─────────────────────────────────────── */

function SessionModal({
  session, isTutor, cancelMode, cancelReason, actioning, actionError,
  onClose, onJoin, onStartCancel, onCancelReasonChange,
  onConfirmCancel, onBackFromCancel, onRejoin,
}: {
  session:              ChatSession;
  isTutor:              boolean;
  cancelMode:           boolean;
  cancelReason:         string;
  actioning:            boolean;
  actionError:          string;
  onClose:              () => void;
  onJoin:               () => void;
  onStartCancel:        () => void;
  onCancelReasonChange: (v: string) => void;
  onConfirmCancel:      () => void;
  onBackFromCancel:     () => void;
  onRejoin:             () => void;
}) {
  const style        = statusStyle[session.status] ?? statusStyle.pending;
  const isLive       = LIVE_STATUSES.includes(session.status);
  const isCancellable = CANCELLABLE_STATUSES.includes(session.status);
  const canJoin      = isTutor && isCancellable;
  const startedAt    = session.startedAt ? new Date(session.startedAt) : null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
      >
        <div className="glass rounded-3xl p-6 w-full max-w-sm space-y-5 pointer-events-auto">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl glass-soft flex items-center justify-center flex-shrink-0">
                <span className="text-white/60 text-base font-semibold">
                  {session.partnerName?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <p className="text-white/85 text-sm font-semibold leading-tight">{session.partnerName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border ${style.color}`}>
                    {style.label}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/25 hover:text-white/60 transition mt-0.5">
              <X size={16} />
            </button>
          </div>

          {/* Details */}
          <div className="glass-soft rounded-2xl px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <BookOpen size={11} />
              <span>{session.subjectName || '—'}</span>
            </div>
            {startedAt && (
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Calendar size={11} />
                <span>
                  {startedAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {startedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {actionError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400/80 text-xs">{actionError}</p>
            </div>
          )}

          {/* Actions */}
          <AnimatePresence mode="wait">
            {cancelMode ? (
              /* ── Cancel reason form ── */
              <motion.div key="cancel-form"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                <p className="text-white/50 text-xs">Reason for cancelling <span className="text-white/25">(optional)</span></p>
                <textarea
                  rows={3}
                  placeholder="Let the other party know why…"
                  value={cancelReason}
                  onChange={e => onCancelReasonChange(e.target.value)}
                  disabled={actioning}
                  className="w-full glass-soft rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none resize-none transition disabled:opacity-40"
                />
                <div className="flex gap-2">
                  <button onClick={onBackFromCancel} disabled={actioning}
                    className="flex-1 py-2.5 rounded-xl glass-soft text-white/40 hover:text-white/70 text-sm transition disabled:opacity-40">
                    Back
                  </button>
                  <button onClick={onConfirmCancel} disabled={actioning}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 text-sm font-medium transition disabled:opacity-40 flex items-center justify-center gap-2">
                    {actioning ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                    Cancel Session
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── Main actions ── */
              <motion.div key="actions"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                className="space-y-2"
              >
                {/* Rejoin (student or tutor on live sessions) */}
                {isLive && (
                  <button onClick={onRejoin}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 text-sm font-medium transition flex items-center justify-center gap-2">
                    <LogIn size={14} />
                    {isTutor ? 'Join Session' : 'Rejoin Session'}
                  </button>
                )}

                {/* Tutor: join/confirm non-live sessions */}
                {canJoin && !isLive && (
                  <button onClick={onJoin} disabled={actioning}
                    className="w-full py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 hover:bg-purple-500/25 text-sm font-medium transition disabled:opacity-40 flex items-center justify-center gap-2">
                    {actioning ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Confirm & Join
                  </button>
                )}

                {/* Cancel */}
                {isCancellable && (
                  <button onClick={onStartCancel}
                    className="w-full py-2.5 rounded-xl glass-soft text-white/40 hover:text-red-400 hover:bg-red-500/8 text-sm transition flex items-center justify-center gap-2">
                    <XCircle size={13} />
                    Cancel Session
                  </button>
                )}

                {/* No actions available */}
                {!isLive && !canJoin && !isCancellable && (
                  <p className="text-center text-white/25 text-sm py-2">No actions available</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
