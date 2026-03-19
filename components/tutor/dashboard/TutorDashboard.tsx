'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Clock, ArrowRight, Loader2,
  CheckCircle, XCircle, Bell, BarChart2,
  Wifi, WifiOff, MessageCircle, Calendar,
  Star, Zap,
} from 'lucide-react';
import { useAuth }    from '@/contexts/AuthContext';
import { usePresence, type PresenceStatus } from '@/hooks/usePresence';
import { getPresenceDisplay } from '@/lib/presence/getPresenceDisplay';
import PresenceBadge  from '@/components/shared/presence/PresenceBadge';
import { sessionsApi, tutorsApi } from '@/lib/api';
import type { BookedSession } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type AvailabilityStatus = PresenceStatus;

// Queue entries come via socket — not a REST endpoint
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
  status:      'active' | 'paused';
};

// Stats derived from /api/browse/my-sessions — no dedicated stats endpoint exists
type TutorStats = {
  sessionsTotal:  number;
  sessionsToday:  number;
  hoursThisWeek:  number;
  avgRating:      number | null;
  totalReviews:   number;
};

// Subject shape from /api/subjects — uses category not level
type TutorSubject = {
  id:         string;
  name:       string;
  category:   string | null;  // was level — backend returns category
  tutorCount: number;
};

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function elapsed(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function duration(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; dot: string; glow: string; bg: string; border: string }
> = {
  online:  { label: 'Available',  dot: '#34d399', glow: '0 0 8px rgba(52,211,153,0.8)',  bg: 'rgba(52,211,153,0.1)',      border: 'rgba(52,211,153,0.3)'  },
  busy:    { label: 'In Session', dot: '#fb923c', glow: '0 0 8px rgba(251,146,60,0.7)',  bg: 'rgba(251,146,60,0.1)',      border: 'rgba(251,146,60,0.3)'  },
  offline: { label: 'Offline',    dot: 'rgba(255,255,255,0.25)', glow: 'none', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)' },
};

const STAT_CARDS = [
  { label: 'Today',     suffix: 'sessions', color: '#34d399', icon: Zap,       key: 'sessionsToday' },
  { label: 'This Week', suffix: 'hours',    color: '#60a5fa', icon: Clock,     key: 'hoursThisWeek' },
  { label: 'All Time',  suffix: 'sessions', color: '#a78bfa', icon: BarChart2, key: 'sessionsTotal' },
  { label: 'Rating',    suffix: '',         color: '#fb923c', icon: Star,      key: 'avgRating'     },
] as const;

/** Derive basic stats from booked sessions list */
function deriveStats(sessions: BookedSession[]): TutorStats {
  const today     = new Date().toDateString();
  const completed = sessions.filter(s => s.status === 'completed');
  const todayDone = completed.filter(s => new Date(s.scheduledAt).toDateString() === today);

  const weekAgo   = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekDone  = completed.filter(s => new Date(s.scheduledAt).getTime() > weekAgo);
  const hoursThisWeek = weekDone.reduce((acc, s) => acc + (s.durationMinutes / 60), 0);

  return {
    sessionsTotal:  completed.length,
    sessionsToday:  todayDone.length,
    hoursThisWeek:  Math.round(hoursThisWeek * 10) / 10,
    avgRating:      null,   // not returned by any endpoint yet
    totalReviews:   0,
  };
}

export default function TutorDashboard() {
  const router   = useRouter();
  const { user } = useAuth();

  const { status, setStatus, hydrated, socketConnected, discoverable, isOnline } = usePresence();
  const presenceDisplay = getPresenceDisplay({ hydrated, status, discoverable, isOnline, socketConnected });

  const [togglingStatus, setTogglingStatus] = useState(false);

  // Queue comes via socket events — this state is populated by socket listener
  const [queue,          setQueue]          = useState<QueueEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [stats,          setStats]          = useState<TutorStats | null>(null);
  const [subjects,       setSubjects]       = useState<TutorSubject[]>([]);
  const [acceptingId,    setAcceptingId]    = useState<string | null>(null);
  const [decliningId,    setDecliningId]    = useState<string | null>(null);
  const [loadingStats,   setLoadingStats]   = useState(true);

  // Fetch sessions from /api/browse/my-sessions (real endpoint)
  // and subjects from /api/subjects (real endpoint)
  const fetchData = useCallback(async () => {
    try {
      const [sessionsData, subjectsData] = await Promise.all([
        sessionsApi.getMySessions(),
        tutorsApi.getMyAvailability().catch(() => null),  // just to warm up presence
      ]);

      if (sessionsData.success) {
        setStats(deriveStats(sessionsData.sessions));
      }
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  }, []);

  // Fetch tutor's own subjects from /api/subjects filtered by what's on their profile
  // Real route: GET /api/tutors/available returns subjects per tutor
  // For own subjects we use the public profile
  const fetchSubjects = useCallback(async () => {
    if (!user?.username) return;
    try {
      const data = await tutorsApi.getPublicProfile(user.username);
      if (data.success && data.user.subjects) {
        setSubjects(data.user.subjects.map(s => ({
          id:         s.id,
          name:       s.name,
          category:   s.category,
          tutorCount: 0,
        })));
      }
    } catch { /* silent */ }
  }, [user?.username]);

  useEffect(() => {
    fetchData();
    fetchSubjects();
  }, [fetchData, fetchSubjects]);

  const toggleStatus = useCallback(async () => {
    if (!hydrated || togglingStatus || status === 'busy') return;
    setTogglingStatus(true);
    try { await setStatus(status === 'online' ? 'offline' : 'online'); }
    finally { setTogglingStatus(false); }
  }, [hydrated, togglingStatus, status, setStatus]);

  const acceptRequest = useCallback(async (sessionId: string) => {
    if (acceptingId) return;
    setAcceptingId(sessionId);
    try {
      // POST /api/live-chat/:chatId/accept — real endpoint ✅
      const res  = await fetch(`${API_URL}/api/live-chat/${sessionId}/accept`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.success) router.push(`/live-chat/${sessionId}`);
    } catch { /* silent */ }
    finally { setAcceptingId(null); }
  }, [acceptingId, router]);

  const declineRequest = useCallback(async (sessionId: string) => {
    if (decliningId) return;
    setDecliningId(sessionId);
    // No decline REST endpoint — remove from local queue only
    // The session will expire via Redis TTL / watchdog
    setQueue(prev => prev.filter(q => q.sessionId !== sessionId));
    setDecliningId(null);
  }, [decliningId]);

  const cfg = STATUS_CONFIG[presenceDisplay.status];

  // role uses underscore: tutor_applicant (not tutor-applicant)
  const isTutorApp = user?.role === 'tutor_applicant';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-7">

      {/* ── Header ── */}
      <motion.div custom={0} variants={fade} initial="initial" animate="animate">
        <div className="panel rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white/40 text-xs tracking-widest uppercase mb-1">
                {isTutorApp ? 'Application Pending' : 'Tutor Dashboard'}
              </p>
              <h1 className="text-white font-semibold text-xl tracking-tight">
                Hey, {user?.username} 👋
              </h1>
              <p className="text-white/40 text-sm mt-1">
                {isTutorApp
                  ? "Your application is under review. You'll be notified once approved."
                  : presenceDisplay.subtitle}
              </p>

              {!isTutorApp && (
                <div className="flex items-center gap-2.5 flex-wrap mt-2.5">
                  <PresenceBadge
                    status={presenceDisplay.status}
                    label={presenceDisplay.label}
                    loading={!hydrated}
                    pulse={presenceDisplay.pulse}
                  />
                  <span className="text-[10px] text-white/35 px-2 py-1 rounded-full border border-white/10">
                    socket: {String(socketConnected)}
                  </span>
                  <span className="text-[10px] text-white/35 px-2 py-1 rounded-full border border-white/10">
                    discoverable: {String(discoverable)}
                  </span>
                </div>
              )}
            </div>

            {!isTutorApp && (
              <div className="flex-shrink-0">
                <button
                  onClick={toggleStatus}
                  disabled={!hydrated || togglingStatus || status === 'busy'}
                  className="flex items-center gap-2.5 px-[18px] py-2.5 rounded-xl transition-all duration-200 min-w-[140px]"
                  style={{
                    background: cfg.bg,
                    border:     `1px solid ${cfg.border}`,
                    opacity:    togglingStatus ? 0.6 : 1,
                    cursor:     !hydrated || status === 'busy' ? 'default' : 'pointer',
                  }}
                >
                  {togglingStatus ? (
                    <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: cfg.dot }} />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: cfg.dot,
                        boxShadow:  cfg.glow,
                        animation:  presenceDisplay.pulse ? 'pulse 2.5s infinite' : 'none',
                      }}
                    />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-semibold leading-tight" style={{ color: cfg.dot }}>
                      {cfg.label}
                    </p>
                    {status !== 'busy' && (
                      <p className="text-[10px] mt-px text-white/30">
                        {!hydrated ? 'Loading…' : status === 'online' ? 'Tap to go offline' : 'Tap to go online'}
                      </p>
                    )}
                  </div>
                </button>
              </div>
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

      {/* ── Stats grid ── */}
      {!isTutorApp && (
        <motion.div custom={1} variants={fade} initial="initial" animate="animate" className="grid grid-cols-4 gap-2.5">
          {STAT_CARDS.map(({ label, suffix, color, icon: Icon, key }) => {
            const raw   = stats?.[key as keyof TutorStats];
            const value = loadingStats
              ? null
              : key === 'avgRating'
                ? (typeof raw === 'number' ? raw.toFixed(1) : '—')
                : (raw ?? 0);
            const reviewSuffix = key === 'avgRating' && stats?.totalReviews ? `/ 5 (${stats.totalReviews})` : suffix;

            return (
              <div key={label} className="panel rounded-2xl px-4 py-4 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={11} className="text-white/25" />
                  <p className="text-white/25 text-[10px]">{label}</p>
                </div>
                {value === null ? (
                  <div className="h-6 w-12 rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <div>
                    <span className="text-[22px] font-bold leading-none" style={{ color }}>{value}</span>
                    {reviewSuffix && <span className="text-[10px] text-white/25 ml-1.5">{reviewSuffix}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── Incoming requests (populated via socket) ── */}
      {!isTutorApp && (
        <motion.div custom={2} variants={fade} initial="initial" animate="animate">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Bell size={13} className={queue.length > 0 ? 'text-orange-400' : 'text-white/30'} />
              <h2 className="text-white/70 text-sm font-medium">Incoming Requests</h2>
              {queue.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  {queue.length} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: discoverable ? '#34d399' : 'rgba(255,255,255,0.2)',
                  boxShadow:  discoverable ? '0 0 6px rgba(52,211,153,0.7)' : 'none',
                }}
              />
              <span className="text-white/25 text-[10px]">Live via socket</span>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="panel rounded-2xl px-6 py-10 text-center">
              {!hydrated ? (
                <>
                  <Loader2 size={22} className="text-white/20 mx-auto mb-3 animate-spin" />
                  <p className="text-white/30 text-sm">Checking live status…</p>
                </>
              ) : !discoverable ? (
                <>
                  <WifiOff size={22} className="text-white/15 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">{isOnline ? 'Not accepting requests right now' : "You're offline"}</p>
                  <p className="text-white/20 text-xs mt-1">Go available to start receiving student requests</p>
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
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {queue.map((req) => (
                  <motion.div
                    key={req.sessionId}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="panel rounded-2xl p-4 border border-orange-500/20 relative overflow-hidden"
                  >
                    <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-orange-400 to-amber-500" />
                    <div className="flex items-start gap-3.5 pl-2">
                      <div className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-orange-400 text-[13px] font-bold bg-gradient-to-br from-orange-500/25 to-amber-500/15 border border-orange-500/20">
                        {req.studentName?.[0]?.toUpperCase() ?? 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white/80 text-[13px] font-semibold">{req.studentName}</p>
                          <span className="px-2 py-0.5 rounded-full text-[9px] uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20">
                            {req.subjectName}
                          </span>
                        </div>
                        {req.message && (
                          <p className="text-white/40 text-xs mb-1.5 leading-relaxed truncate">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                        <p className="text-white/20 text-[10px] flex items-center gap-1">
                          <Clock size={9} />
                          {elapsed(req.requestedAt)}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => declineRequest(req.sessionId)}
                          disabled={!!acceptingId || !!decliningId}
                          className="w-9 h-9 rounded-[9px] flex items-center justify-center bg-red-500/[0.07] border border-red-500/[0.18] transition-all"
                          style={{ opacity: decliningId === req.sessionId ? 0.5 : 1 }}
                        >
                          {decliningId === req.sessionId
                            ? <Loader2 size={13} className="text-red-400 animate-spin" />
                            : <XCircle size={13} className="text-red-400/60" />}
                        </button>
                        <button
                          onClick={() => acceptRequest(req.sessionId)}
                          disabled={!!acceptingId || !!decliningId}
                          className="h-9 px-3.5 rounded-[9px] flex items-center gap-1.5 text-emerald-400 text-xs font-semibold bg-emerald-500/12 border border-emerald-500/30 transition-all"
                          style={{ opacity: acceptingId === req.sessionId ? 0.5 : 1 }}
                        >
                          {acceptingId === req.sessionId
                            ? <Loader2 size={13} className="animate-spin" />
                            : <><CheckCircle size={13} />Accept</>}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Active sessions ── */}
      {!isTutorApp && activeSessions.length > 0 && (
        <motion.div custom={3} variants={fade} initial="initial" animate="animate">
          <div className="flex items-center gap-2 mb-2.5">
            <MessageCircle size={13} className="text-emerald-400" />
            <h2 className="text-white/70 text-sm font-medium">Active Sessions</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/12 border border-emerald-500/25 text-emerald-400">
              {activeSessions.length}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {activeSessions.map((session) => (
              <motion.button
                key={session.sessionId}
                layout
                onClick={() => router.push(`/live-chat/${session.sessionId}`)}
                className="panel rounded-2xl p-4 text-left w-full border border-emerald-500/[0.18] hover:bg-white/[0.06] transition group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-emerald-400 text-[13px] font-bold bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/20">
                      {session.studentName?.[0]?.toUpperCase() ?? 'S'}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black/40" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[13px] font-semibold">{session.studentName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-blue-400 text-[10px]">{session.subjectName}</span>
                      <span className="text-white/20 text-[10px] flex items-center gap-1">
                        <Clock size={9} /> {duration(session.startedAt)}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/12 border border-emerald-500/25 text-emerald-400">
                    Rejoin →
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Subjects ── */}
      {subjects.length > 0 && (
        <motion.div custom={4} variants={fade} initial="initial" animate="animate">
          <div className="flex items-center gap-2 mb-2.5">
            <BookOpen size={13} className="text-white/40" />
            <h2 className="text-white/70 text-sm font-medium">Subjects I Teach</h2>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {subjects.map((sub) => {
              const color = sub.category === 'CAPE' ? '#a78bfa' : '#60a5fa';
              return (
                <div
                  key={sub.id}
                  className="panel rounded-xl px-4 py-3 relative overflow-hidden"
                  style={{ border: `1px solid ${color}18` }}
                >
                  <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}35, transparent)` }} />
                  <p className="text-white/65 text-xs font-medium mb-1">{sub.name}</p>
                  {sub.category && (
                    <span
                      className="text-[9px] px-1.5 py-px rounded-full"
                      style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}
                    >
                      {sub.category}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Quick links ── */}
      {!isTutorApp && (
        <motion.div custom={5} variants={fade} initial="initial" animate="animate" className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Session History', sub: 'View past sessions', icon: Calendar, path: '/sessions'      },
            { label: 'Notifications',   sub: 'Alerts and updates', icon: Bell,     path: '/notifications' },
          ].map(({ label, sub, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="panel rounded-2xl px-5 py-4 text-left hover:bg-white/[0.06] transition group"
            >
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