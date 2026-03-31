'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion }              from 'framer-motion';
import { useRouter }           from 'next/navigation';
import {
  Calendar, User, BookOpen, ChevronRight,
  Loader2, LogIn, XCircle,
} from 'lucide-react';
import { sessionsApi, api } from '@/lib/api';
import type { ChatSession } from '@/lib/api';

type Tab = 'upcoming' | 'completed' | 'all';

const statusStyle: Record<string, { label: string; color: string }> = {
  active:      { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  in_progress: { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  waiting:     { label: 'Waiting',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20'   },
  pending:     { label: 'Pending',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20'   },
  confirmed:   { label: 'Confirmed', color: 'text-purple-400 bg-purple-500/15 border-purple-500/20'   },
  completed:   { label: 'Done',      color: 'text-white/30 bg-white/5 border-white/10'                },
  cancelled:   { label: 'Cancelled', color: 'text-red-400/60 bg-red-500/10 border-red-500/15'         },
  ended:       { label: 'Ended',     color: 'text-white/30 bg-white/5 border-white/10'                },
};

const UPCOMING_STATUSES  = ['pending', 'confirmed', 'waiting', 'in_progress', 'active'];
const COMPLETED_STATUSES = ['completed', 'cancelled', 'ended'];
const LIVE_STATUSES      = ['active', 'in_progress', 'waiting'];

export default function SessionsPage() {
  const router = useRouter();

  const [sessions,    setSessions]    = useState<ChatSession[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<Tab>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    sessionsApi.getChatSessions()
      .then(d => {
        if (d.success) {
          // Deduplicate by sessionId — guards against duplicate keys warning
          const seen = new Set<string>();
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

  const handleCancel = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // don't trigger the card click
    if (cancellingId) return;
    setCancellingId(sessionId);
    try {
      await api.post(`/api/live-chat/${sessionId}/cancel`);
      setSessions(prev => prev.map(s =>
        s.sessionId === sessionId ? { ...s, status: 'cancelled' as any } : s
      ));
    } catch {
      // Silent — session may have already ended
    } finally {
      setCancellingId(null);
    }
  }, [cancellingId]);

  const upcoming  = sessions.filter(s => UPCOMING_STATUSES.includes(s.status));
  const completed = sessions.filter(s => COMPLETED_STATUSES.includes(s.status));
  const raw = tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : sessions;
  const displayedMap = new Map(raw.map(s => [s.sessionId, s]));
  const displayed = Array.from(displayedMap.values());

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-white font-semibold text-xl tracking-tight">Sessions</h1>
        <p className="text-white/40 text-sm mt-1">Your tutoring history and upcoming bookings</p>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="flex items-center gap-1 glass-soft rounded-xl p-1 w-fit"
      >
        {([
          { key: 'upcoming',  label: `Upcoming (${upcoming.length})`   },
          { key: 'completed', label: `Completed (${completed.length})` },
          { key: 'all',       label: 'All'                             },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === t.key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl px-4 py-12 text-center"
        >
          <Calendar size={20} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/30 text-sm">
            {tab === 'upcoming' ? 'No upcoming sessions' : 'No sessions yet'}
          </p>
          {tab === 'upcoming' && (
            <button
              onClick={() => router.push('/browse')}
              className="mt-4 px-5 py-2 rounded-xl bg-white text-orange-600 text-xs font-semibold hover:bg-white/90 transition"
            >
              Find a tutor
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          {displayed.map((session, i) => {
            const style    = statusStyle[session.status] ?? statusStyle.pending;
            const isLive   = LIVE_STATUSES.includes(session.status);
            const startedAt = session.startedAt ? new Date(session.startedAt) : null;
            const dateStr   = startedAt
              ? startedAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : '—';
            const timeStr   = startedAt
              ? startedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : null;

            return (
              <motion.div
                key={session.sessionId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => isLive && router.push(`/live-chat/${session.sessionId}`)}
                className={`glass rounded-2xl p-4 flex items-center gap-4 transition group ${
                  isLive ? 'cursor-pointer hover:bg-white/[0.06]' : 'cursor-default'
                }`}
              >
                <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center flex-shrink-0">
                  <User size={15} className="text-white/35" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/80 text-sm font-medium">
                      {session.partnerName}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-white/30 text-xs">
                      <BookOpen size={10} />
                      {session.subjectName}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-white/50 text-xs">{dateStr}</p>
                  {timeStr && <p className="text-white/25 text-[10px] mt-0.5">{timeStr}</p>}
                </div>

                {/* Live: rejoin + cancel. Otherwise: chevron */}
                {isLive ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/live-chat/${session.sessionId}`); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/25 transition"
                    >
                      <LogIn size={11} />
                      Rejoin
                    </button>
                    <button
                      onClick={e => handleCancel(e, session.sessionId)}
                      disabled={cancellingId === session.sessionId}
                      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
                      title="Cancel session"
                    >
                      {cancellingId === session.sessionId
                        ? <Loader2 size={12} className="animate-spin" />
                        : <XCircle size={12} />
                      }
                    </button>
                  </div>
                ) : (
                  <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}