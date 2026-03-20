'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, LayoutDashboard, Calendar,
  ChevronRight, BookOpen, Clock, Radio,
} from 'lucide-react';
import { useAuth }              from '@/contexts/AuthContext';
import { useTutorAvailability } from '@/hooks/useTutorAvailability';

// ── Reuse the same toggle component ──
import TutorAvailabilityToggle from '@/components/tutor/dashboard/TutorAvailabilityToggle';

type QueueEntry = {
  sessionId:   string;
  studentName: string;
  subjectName: string;
  requestedAt: number;
};

function elapsed(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000);
  return m < 1 ? 'just now' : `${m}m ago`;
}

export default function TutorHomeSelector() {
  const router   = useRouter();
  const { user } = useAuth();

  // ── Same hook as TutorDashboard — single source of truth ──
  const {
    status, available, busy, hydrated,
    isConnected, discoverable,
    toggle, toggling,
    showSocketStatus, socketLabel,
    subscribe,
  } = useTutorAvailability();

  const [queue, setQueue] = useState<QueueEntry[]>([]);

  /* ── Socket: incoming requests ── */
  useEffect(() => {
    const unsubReq = subscribe('session:request', (payload: any) => {
      setQueue(prev => {
        if (prev.some(q => q.sessionId === payload.sessionId)) return prev;
        return [{
          sessionId:   payload.sessionId,
          studentName: payload.studentName ?? 'Student',
          subjectName: payload.subjectName ?? '',
          requestedAt: payload.requestedAt ?? Date.now(),
        }, ...prev];
      });
    });
    const unsubEnd = subscribe('session:ended', (payload: any) => {
      setQueue(prev => prev.filter(q => q.sessionId !== payload.sessionId));
    });
    return () => { unsubReq(); unsubEnd(); };
  }, [subscribe]);

  const isTutorApp  = user?.role === 'tutor_applicant';
  const hasRequests = queue.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6 w-full max-w-xl mx-auto"
    >
      {/* ── Header ── */}
      <div className="text-center mb-6">
        <h2 className="text-white font-semibold text-xl tracking-tight">
          Hey, {user?.username} 👋
        </h2>
        <p className="text-white/45 text-sm mt-1">
          {isTutorApp
            ? 'Your application is under review.'
            : 'Manage your availability and incoming requests.'}
        </p>
      </div>

      {/* ── Applicant state ── */}
      {isTutorApp ? (
        <div className="panel rounded-2xl p-4 border border-purple-500/20 bg-purple-500/8 flex items-start gap-3 mb-4">
          <Bell size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-400 text-xs font-semibold mb-1">Application Under Review</p>
            <p className="text-purple-200/50 text-xs leading-relaxed">
              Our team is reviewing your submission. You'll be notified within 24–48 hours.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Availability card — uses TutorAvailabilityToggle component ── */}
          <div className={`panel rounded-2xl p-4 border mb-3 transition-all ${
            busy      ? 'bg-orange-500/8 border-orange-500/25' :
            available ? 'bg-emerald-500/8 border-emerald-500/25' :
                        'bg-white/4 border-white/10'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                {/* Socket status indicator */}
                {hydrated && showSocketStatus && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Radio size={9} className={isConnected ? 'text-emerald-400/60' : 'text-white/20'} />
                    <span className="text-[10px] text-white/25">{socketLabel}</span>
                  </div>
                )}
                <p className={`text-xs text-white/30 mt-0.5`}>
                  {busy
                    ? "You're currently in a session"
                    : available
                      ? 'Students can find and request you right now'
                      : 'Go online to start receiving student requests'}
                </p>
              </div>

              {/* TutorAvailabilityToggle — same component as TutorDashboard */}
              <TutorAvailabilityToggle
                available={available}
                toggling={toggling || !hydrated}
                busy={busy}
                onToggle={toggle}
              />
            </div>
          </div>

          {/* ── Incoming requests preview ── */}
          <div className={`panel rounded-2xl border overflow-hidden mb-3 transition-all ${
            hasRequests ? 'border-orange-500/25' : 'border-white/8'
          }`}>
            <button
              onClick={() => router.push('/dashboard/tutor')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/4 transition"
            >
              <div className="flex items-center gap-2">
                <Bell size={13} className={hasRequests ? 'text-orange-400' : 'text-white/30'} />
                <span className="text-white/60 text-xs font-medium">Incoming Requests</span>
                <AnimatePresence>
                  {hasRequests && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400"
                    >
                      {queue.length}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <ChevronRight size={13} className="text-white/20" />
            </button>

            {hasRequests && (
              <div className="border-t border-white/6">
                {queue.slice(0, 2).map((req, i) => (
                  <div key={req.sessionId}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      i < Math.min(queue.length, 2) - 1 ? 'border-b border-white/4' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg glass-soft flex items-center justify-center flex-shrink-0 text-orange-400 text-xs font-bold">
                      {req.studentName?.[0]?.toUpperCase() ?? 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-xs font-medium truncate">{req.studentName}</p>
                      <p className="text-white/30 text-[10px]">{req.subjectName} · {elapsed(req.requestedAt)}</p>
                    </div>
                    <Clock size={10} className="text-white/20 flex-shrink-0" />
                  </div>
                ))}
                {queue.length > 2 && (
                  <div className="px-4 py-2 border-t border-white/4 text-center">
                    <p className="text-white/25 text-[10px]">+{queue.length - 2} more — open dashboard</p>
                  </div>
                )}
              </div>
            )}

            {!hasRequests && (
              <div className="px-4 py-2.5 border-t border-white/6 text-center">
                <p className="text-white/20 text-[11px]">
                  {available
                    ? 'No requests yet — students will appear here'
                    : 'Go online to receive requests'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Full Dashboard', sub: 'Stats & queue',      icon: LayoutDashboard, color: 'text-blue-400',    bg: 'bg-blue-500/8    border-blue-500/15',   path: '/dashboard/tutor', show: true        },
          { label: 'My Sessions',    sub: 'History & schedule', icon: Calendar,        color: 'text-purple-400', bg: 'bg-purple-500/8  border-purple-500/15',  path: '/sessions',        show: true        },
          { label: 'Notifications',  sub: 'Updates & alerts',   icon: Bell,            color: 'text-emerald-400',bg: 'bg-emerald-500/8 border-emerald-500/15', path: '/notifications',   show: !isTutorApp },
          { label: 'My Subjects',    sub: 'View coverage',      icon: BookOpen,        color: 'text-orange-400', bg: 'bg-orange-500/8  border-orange-500/15',  path: '/dashboard/tutor', show: !isTutorApp },
        ].filter(b => b.show).map(({ label, sub, icon: Icon, color, bg, path }) => (
          <button key={label} onClick={() => router.push(path)}
            className={`panel rounded-xl p-3 border flex items-center gap-3 hover:bg-white/8 transition text-left ${bg}`}>
            <div className="glass-soft w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon size={14} className={color} />
            </div>
            <div className="min-w-0">
              <p className="text-white/75 text-xs font-medium truncate">{label}</p>
              <p className="text-white/30 text-[10px] mt-0.5">{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}