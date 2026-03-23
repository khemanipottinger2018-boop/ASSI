'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Clock, ArrowRight, Loader2,
  CheckCircle, XCircle, Bell, BarChart2,
  Wifi, WifiOff, Calendar, Star, Zap,
} from 'lucide-react';
import { useAuth }               from '@/contexts/AuthContext';
import { useTutorAvailability }  from '@/hooks/useTutorAvailability';
import { getPresenceDisplay }    from '@/lib/presence/usePresenceDisplay';
import { sessionsApi, tutorsApi } from '@/lib/api';
import type { BookedSession }    from '@/lib/api';

// ── Existing tutor dashboard components ──
import DashboardSection         from '@/components/tutor/dashboard/DashboardSection';
import TutorAvailabilityToggle  from '@/components/tutor/dashboard/TutorAvailabilityToggle';
import TutorStatusCard          from '@/components/tutor/dashboard/TutorStatusCard';
import TutorEarningsCard        from '@/components/tutor/dashboard/TutorEarningsCard';
import TutorLiveRequestCard     from '@/components/tutor/dashboard/TutorLiveRequestCard';
import TutorUpcomingSessionCard from '@/components/tutor/dashboard/TutorUpcomingSessionCard';
import ActiveChatCard           from '@/components/tutor/dashboard/ActiveChatCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type QueueEntry = {
  sessionId:   string;
  studentId:   string;
  studentName: string;
  subjectId:   string;
  subjectName: string;
  requestedAt: number;
  message?:    string;
};

type ActiveSession = {
  sessionId:   string;
  studentName: string;
  subjectName: string;
  startedAt:   number;
};

type TutorStats = {
  sessionsTotal:  number;
  sessionsToday:  number;
  hoursThisWeek:  number;
  avgRating:      number | null;
  totalReviews:   number;
  totalEarned:    number;
};

type TutorSubject = {
  id:       string;
  name:     string;
  category: string | null;
};

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.32, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const STAT_CARDS = [
  { label: 'Today',     color: '#34d399', icon: Zap,       key: 'sessionsToday', suffix: 'sessions' },
  { label: 'This Week', color: '#60a5fa', icon: Clock,     key: 'hoursThisWeek', suffix: 'hrs'      },
  { label: 'All Time',  color: '#a78bfa', icon: BarChart2, key: 'sessionsTotal', suffix: 'sessions' },
  { label: 'Rating',    color: '#fb923c', icon: Star,      key: 'avgRating',     suffix: '/ 5'      },
] as const;

function deriveStats(sessions: BookedSession[]): TutorStats {
  const today     = new Date().toDateString();
  const completed = sessions.filter(s => s.status === 'completed');
  const todayDone = completed.filter(s => new Date(s.scheduledAt).toDateString() === today);
  const weekAgo   = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekDone  = completed.filter(s => new Date(s.scheduledAt).getTime() > weekAgo);
  return {
    sessionsTotal:  completed.length,
    sessionsToday:  todayDone.length,
    hoursThisWeek:  Math.round(weekDone.reduce((a, s) => a + s.durationMinutes / 60, 0) * 10) / 10,
    avgRating:      null,
    totalReviews:   0,
    totalEarned:    0,
  };
}

export default function TutorDashboard() {
  const router   = useRouter();
  const { user } = useAuth();

  // ── Single source of truth for availability ──
  const {
    status, available, busy, hydrated, discoverable,
    isConnected, toggle, toggling, subscribe,
  } = useTutorAvailability();

  const presenceDisplay = getPresenceDisplay({
    hydrated, status, discoverable, isOnline: status !== 'offline', socketConnected: isConnected,
  });

  const [sessions,       setSessions]       = useState<BookedSession[]>([]);
  const [queue,          setQueue]          = useState<QueueEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [stats,          setStats]          = useState<TutorStats | null>(null);
  const [subjects,       setSubjects]       = useState<TutorSubject[]>([]);
  const [acceptingId,    setAcceptingId]    = useState<string | null>(null);
  const [loadingStats,   setLoadingStats]   = useState(true);

  /* ── Socket: incoming requests ── */
  useEffect(() => {
    const unsubReq = subscribe('session:request', (payload: any) => {
      setQueue(prev => {
        if (prev.some(q => q.sessionId === payload.sessionId)) return prev;
        return [{
          sessionId:   payload.sessionId,
          studentId:   payload.studentId   ?? '',
          studentName: payload.studentName ?? 'Student',
          subjectId:   payload.subjectId   ?? '',
          subjectName: payload.subjectName ?? '',
          requestedAt: payload.requestedAt ?? Date.now(),
          message:     payload.message,
        }, ...prev];
      });
    });
    const unsubEnd = subscribe('session:ended', (payload: any) => {
      setQueue(prev => prev.filter(q => q.sessionId !== payload.sessionId));
      setActiveSessions(prev => prev.filter(s => s.sessionId !== payload.sessionId));
    });
    return () => { unsubReq(); unsubEnd(); };
  }, [subscribe]);

  /* ── Data fetching ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await sessionsApi.getMySessions();
        if (data.success) {
          setSessions(data.sessions ?? []);
          setStats(deriveStats(data.sessions ?? []));
        }
      } catch { /* silent */ }
      finally { setLoadingStats(false); }
    })();
  }, []);

  useEffect(() => {
    if (!user?.username) return;
    (async () => {
      try {
        const data = await tutorsApi.getPublicProfile(user.username);
        if (data.success && data.user.subjects) {
          setSubjects(data.user.subjects.map(s => ({
            id: s.id, name: s.name, category: s.category,
          })));
        }
      } catch { /* silent */ }
    })();
  }, [user?.username]);

  /* ── Accept request ── */
  const acceptRequest = useCallback(async (sessionId: string) => {
    if (acceptingId) return;
    setAcceptingId(sessionId);
    try {
      const res  = await fetch(`${API_URL}/api/live-chat/${sessionId}/accept`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.success) router.push(`/live-chat/${sessionId}`);
    } catch { /* silent */ }
    finally { setAcceptingId(null); }
  }, [acceptingId, router]);

  const isTutorApp = user?.role === 'tutor_applicant';
  const upcoming   = sessions
    .filter(s => ['pending', 'confirmed'].includes(s.status))
    .slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-7">

      {/* ── Header ── */}
      <motion.div custom={0} variants={fade} initial="initial" animate="animate">
        <div className="panel rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <TutorStatusCard />
              <div>
                <p className="text-white/40 text-xs tracking-widest uppercase mb-0.5">
                  {isTutorApp ? 'Application Pending' : 'Tutor Dashboard'}
                </p>
                <p className="text-white/40 text-sm">
                  {isTutorApp
                    ? "Under review — you'll be notified once approved."
                    : presenceDisplay.subtitle}
                </p>
              </div>
            </div>

            {/* ── Availability toggle — driven by useTutorAvailability ── */}
            {!isTutorApp && (
              <TutorAvailabilityToggle
                available={available}
                toggling={toggling || !hydrated}
                busy={busy}
                onToggle={toggle}
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Applicant banner ── */}
      {isTutorApp && (
        <motion.div custom={1} variants={fade} initial="initial" animate="animate">
          <div className="flex items-start gap-3 px-[18px] py-3.5 rounded-[14px] bg-purple-500/[0.08] border border-purple-500/20">
            <Bell size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-purple-400 text-xs font-semibold mb-1">Application Under Review</p>
              <p className="text-purple-200/55 text-xs leading-relaxed">
                Our team is reviewing your application. This typically takes 24–48 hours.
                You&apos;ll receive a notification once a decision is made.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Earnings + stats ── */}
      {!isTutorApp && (
        <motion.div custom={1} variants={fade} initial="initial" animate="animate" className="space-y-3">
          <TutorEarningsCard
            totalEarned={stats?.totalEarned ?? 0}
            sessionCount={stats?.sessionsTotal ?? 0}
            loading={loadingStats}
          />
          <div className="grid grid-cols-4 gap-2.5">
            {STAT_CARDS.map(({ label, color, icon: Icon, key, suffix }) => {
              const raw   = stats?.[key as keyof TutorStats];
              const value = loadingStats ? null
                : key === 'avgRating' ? (typeof raw === 'number' ? raw.toFixed(1) : '—')
                : (raw ?? 0);
              return (
                <div key={label} className="panel rounded-2xl px-4 py-4 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={11} className="text-white/25" />
                    <p className="text-white/25 text-[10px]">{label}</p>
                  </div>
                  {value === null
                    ? <div className="h-6 w-12 rounded bg-white/[0.06] animate-pulse" />
                    : <div>
                        <span className="text-[22px] font-bold leading-none" style={{ color }}>{value}</span>
                        {suffix && <span className="text-[10px] text-white/25 ml-1.5">{suffix}</span>}
                      </div>
                  }
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Incoming requests — TutorLiveRequestCard has countdown ── */}
      {!isTutorApp && (
        <motion.div custom={2} variants={fade} initial="initial" animate="animate">
          <DashboardSection title="Incoming Requests" icon={Bell}>
            {queue.length === 0 ? (
              <div className="panel rounded-2xl px-6 py-10 text-center">
                {!hydrated ? (
                  <>
                    <Loader2 size={22} className="text-white/20 mx-auto mb-3 animate-spin" />
                    <p className="text-white/30 text-sm">Checking live status…</p>
                  </>
                ) : !available ? (
                  <>
                    <WifiOff size={22} className="text-white/15 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">
                      {busy ? 'Currently in a session' : "You're offline"}
                    </p>
                    <p className="text-white/20 text-xs mt-1">
                      {busy ? 'Finish your session to receive new requests'
                            : 'Go available to start receiving student requests'}
                    </p>
                  </>
                ) : (
                  <>
                    <Wifi size={22} className="text-emerald-400/40 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">No requests right now</p>
                    <p className="text-white/20 text-xs mt-1">You&apos;re live — students will appear here</p>
                  </>
                )}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {queue.map((req) => (
                  <motion.div key={req.sessionId} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                  >
                    <TutorLiveRequestCard
                      sessionId={req.sessionId}
                      subjectId={req.subjectId}
                      arrivedAt={req.requestedAt}
                      onExpire={(id) => setQueue(prev => prev.filter(q => q.sessionId !== id))}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </DashboardSection>
        </motion.div>
      )}

      {/* ── Active sessions ── */}
      {!isTutorApp && activeSessions.length > 0 && (
        <motion.div custom={3} variants={fade} initial="initial" animate="animate">
          <DashboardSection title="Active Sessions">
            {activeSessions.map(session => (
              <ActiveChatCard
                key={session.sessionId}
                chatId={session.sessionId}
                tutorName={session.studentName}
                subject={session.subjectName}
              />
            ))}
          </DashboardSection>
        </motion.div>
      )}

      {/* ── Upcoming sessions ── */}
      {!isTutorApp && (
        <motion.div custom={4} variants={fade} initial="initial" animate="animate">
          <DashboardSection
            title="Upcoming Sessions"
            icon={Calendar}
            onSeeAll={() => router.push('/sessions')}
          >
            {loadingStats ? (
              <>{[0, 1].map(i => <div key={i} className="glass-soft rounded-2xl h-16 animate-pulse" />)}</>
            ) : upcoming.length === 0 ? (
              <div className="panel rounded-2xl px-4 py-6 text-center">
                <p className="text-white/25 text-sm">No upcoming sessions</p>
              </div>
            ) : (
              upcoming.map(s => (
                <TutorUpcomingSessionCard
                  key={s.sessionId}
                  sessionId={s.sessionId}
                  studentName={s.partnerUsername ?? 'Student'}
                  subject={s.subjectName ?? 'Session'}
                  scheduledAt={s.scheduledAt}
                  durationMinutes={s.durationMinutes}
                  status={s.status as 'scheduled' | 'confirmed'}
                />
              ))
            )}
          </DashboardSection>
        </motion.div>
      )}

      {/* ── Subjects I teach ── */}
      {subjects.length > 0 && (
        <motion.div custom={5} variants={fade} initial="initial" animate="animate">
          <DashboardSection title="Subjects I Teach" icon={BookOpen}>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {subjects.map((sub) => {
                const color = sub.category === 'CAPE' ? '#a78bfa' : '#60a5fa';
                return (
                  <div key={sub.id} className="panel rounded-xl px-4 py-3 relative overflow-hidden"
                    style={{ border: `1px solid ${color}18` }}>
                    <div className="absolute top-0 inset-x-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${color}35, transparent)` }} />
                    <p className="text-white/65 text-xs font-medium mb-1">{sub.name}</p>
                    {sub.category && (
                      <span className="text-[9px] px-1.5 py-px rounded-full"
                        style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
                        {sub.category}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </DashboardSection>
        </motion.div>
      )}

      {/* ── Quick links ── */}
      {!isTutorApp && (
        <motion.div custom={6} variants={fade} initial="initial" animate="animate"
          className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Session History', sub: 'View past sessions', icon: Calendar, path: '/sessions'      },
            { label: 'Notifications',   sub: 'Alerts and updates', icon: Bell,     path: '/notifications' },
          ].map(({ label, sub, icon: Icon, path }) => (
            <button key={path} onClick={() => router.push(path)}
              className="panel rounded-2xl px-5 py-4 text-left hover:bg-white/[0.06] transition group">
              <div className="flex items-center justify-between">
                <Icon size={14} className="text-white/30" />
                <ArrowRight size={12} className="text-white/15 group-hover:text-white/40 transition" />
              </div>
              <p className="text-white/70 text-[13px] font-medium mt-2.5">{label}</p>
              <p className="text-white/25 text-[11px] mt-0.5">{sub}</p>
            </button>
          ))}
        </motion.div>
      )}

    </div>
  );
}