'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type Session = {
  sessionId: string;
  status: string;
  scheduledTime: string;
  durationMinutes: number;
  subjectName: string;
  partnerUsername: string;
  partnerAvatarUrl: string | null;
  price?: number;
};

type Tab = 'upcoming' | 'completed' | 'all';

const statusStyle: Record<string, { label: string; color: string }> = {
  active:    { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400 bg-blue-500/15 border-blue-500/20' },
  confirmed: { label: 'Confirmed', color: 'text-purple-400 bg-purple-500/15 border-purple-500/20' },
  pending:   { label: 'Pending',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20' },
  completed: { label: 'Done',      color: 'text-white/30 bg-white/5 border-white/10' },
  cancelled: { label: 'Cancelled', color: 'text-red-400/60 bg-red-500/10 border-red-500/15' },
};

export default function SessionsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>('upcoming');

  useEffect(() => {
    fetch(`${API_URL}/api/browse/my-sessions`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setSessions(d.sessions ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const upcoming  = sessions.filter((s) => ['scheduled', 'confirmed', 'pending', 'active'].includes(s.status));
  const completed = sessions.filter((s) => ['completed', 'cancelled'].includes(s.status));
  const displayed = tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : sessions;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
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
          { key: 'upcoming',  label: `Upcoming (${upcoming.length})` },
          { key: 'completed', label: `Completed (${completed.length})` },
          { key: 'all',       label: 'All' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`
              px-4 py-1.5 rounded-lg text-xs font-medium transition
              ${tab === t.key
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:text-white/70'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* ── List ── */}
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
            const style   = statusStyle[session.status] ?? statusStyle.pending;
            const dateStr = new Date(session.scheduledTime).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            });
            const timeStr = new Date(session.scheduledTime).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
            });

            return (
              <motion.div
                key={session.sessionId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => router.push(`/sessions/${session.sessionId}`)}
                className="glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.06] transition group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {session.partnerAvatarUrl
                    ? <img src={session.partnerAvatarUrl} alt={session.partnerUsername} className="w-full h-full object-cover" />
                    : <User size={15} className="text-white/35" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/80 text-sm font-medium">{session.partnerUsername}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-white/30 text-xs">
                      <BookOpen size={10} />
                      {session.subjectName}
                    </span>
                    <span className="flex items-center gap-1 text-white/30 text-xs">
                      <Clock size={10} />
                      {session.durationMinutes}m
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="text-right flex-shrink-0">
                  <p className="text-white/50 text-xs">{dateStr}</p>
                  <p className="text-white/25 text-[10px] mt-0.5">{timeStr}</p>
                </div>

                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
