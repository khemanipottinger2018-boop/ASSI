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
import { useAuth } from '@/contexts/AuthContext';
import { usePresence, type PresenceStatus } from '@/hooks/usePresence';
import { getPresenceDisplay } from '@/lib/presence/getPresenceDisplay';
import PresenceBadge from '@/components/shared/presence/PresenceBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type AvailabilityStatus = PresenceStatus;

type QueueEntry = {
  sessionId: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  requestedAt: number;
  message?: string;
};

type ActiveSession = {
  sessionId: string;
  studentName: string;
  subjectName: string;
  startedAt: number;
  status: 'active' | 'paused';
};

type TutorStats = {
  sessionsToday: number;
  sessionsTotal: number;
  avgRating: number | null;
  totalReviews: number;
  hoursThisWeek: number;
};

type TutorSubject = {
  subject_id: number;
  name: string;
  level: string;
  tutorCount?: number;
};

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      delay: i * 0.07,
      ease: [0.22, 1, 0.36, 1] as const,
    },
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
  online: {
    label: 'Available',
    dot: '#34d399',
    glow: '0 0 8px rgba(52,211,153,0.8)',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.3)',
  },
  busy: {
    label: 'In Session',
    dot: '#fb923c',
    glow: '0 0 8px rgba(251,146,60,0.7)',
    bg: 'rgba(251,146,60,0.1)',
    border: 'rgba(251,146,60,0.3)',
  },
  offline: {
    label: 'Offline',
    dot: 'rgba(255,255,255,0.25)',
    glow: 'none',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
  },
};

const LEVEL_COLOR: Record<string, string> = {
  CSEC: '#60a5fa',
  CAPE: '#a78bfa',
};

export default function TutorDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const {
    status,
    setStatus,
    hydrated,
    socketConnected,
    discoverable,
    isOnline,
  } = usePresence();

  const presenceDisplay = getPresenceDisplay({
    hydrated,
    status,
    discoverable,
    isOnline,
    socketConnected,
  });

  const [togglingStatus, setTogglingStatus] = useState(false);

  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [subjects, setSubjects] = useState<TutorSubject[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const [qRes, sRes] = await Promise.all([
        fetch(`${API_URL}/api/tutor/queue`, { credentials: 'include' }),
        fetch(`${API_URL}/api/tutor/sessions/active`, { credentials: 'include' }),
      ]);

      const [qData, sData] = await Promise.all([qRes.json(), sRes.json()]);

      if (qData.success) setQueue(qData.queue ?? []);
      if (sData.success) setActiveSessions(sData.sessions ?? []);
    } catch {
      // silent
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tutor/stats`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {
      // silent
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tutor/subjects`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setSubjects(data.subjects ?? []);
    } catch {
      // silent
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchStats();
    fetchSubjects();

    pollRef.current = setInterval(fetchQueue, 8_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchQueue, fetchStats, fetchSubjects]);

  const toggleStatus = useCallback(async () => {
    if (!hydrated || togglingStatus || status === 'busy') return;

    const next: AvailabilityStatus = status === 'online' ? 'offline' : 'online';

    setTogglingStatus(true);
    try {
      await setStatus(next);
    } finally {
      setTogglingStatus(false);
    }
  }, [hydrated, togglingStatus, status, setStatus]);

  const acceptRequest = useCallback(async (sessionId: string) => {
    if (acceptingId) return;

    setAcceptingId(sessionId);
    try {
      const res = await fetch(`${API_URL}/api/live-chat/${sessionId}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/live-chat/${sessionId}`);
      }
    } catch {
      // silent
    } finally {
      setAcceptingId(null);
    }
  }, [acceptingId, router]);

  const declineRequest = useCallback(async (sessionId: string) => {
    if (decliningId) return;

    setDecliningId(sessionId);
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}/decline`, {
        method: 'POST',
        credentials: 'include',
      });
      await fetchQueue();
    } catch {
      // silent
    } finally {
      setDecliningId(null);
    }
  }, [decliningId, fetchQueue]);

  const joinSession = useCallback((sessionId: string) => {
    router.push(`/live-chat/${sessionId}`);
  }, [router]);

  const cfg = STATUS_CONFIG[presenceDisplay.status];
  const isTutorApp = user?.role === 'tutor-applicant';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-7">
      <motion.div custom={0} variants={fade} initial="initial" animate="animate">
        <div className="panel rounded-2xl p-5">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
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
                <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
              <div style={{ flexShrink: 0 }}>
                <button
                  onClick={toggleStatus}
                  disabled={!hydrated || togglingStatus || status === 'busy'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 18px',
                    borderRadius: 12,
                    cursor: !hydrated || status === 'busy' ? 'default' : 'pointer',
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    transition: 'all 0.2s ease',
                    minWidth: 140,
                    opacity: togglingStatus ? 0.6 : 1,
                  }}
                >
                  {togglingStatus ? (
                    <Loader2
                      size={14}
                      style={{
                        color: cfg.dot,
                        animation: 'spin 1s linear infinite',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: cfg.dot,
                        boxShadow: cfg.glow,
                        animation: presenceDisplay.pulse ? 'pulse 2.5s infinite' : 'none',
                      }}
                    />
                  )}

                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: cfg.dot, fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                      {cfg.label}
                    </p>

                    {status !== 'busy' && (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>
                        {!hydrated
                          ? 'Checking Redis presence...'
                          : status === 'online'
                            ? 'Tap to go offline'
                            : 'Tap to go online'}
                      </p>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {isTutorApp && (
        <motion.div custom={1} variants={fade} initial="initial" animate="animate">
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 14,
              background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Bell size={14} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ color: '#a78bfa', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Application Under Review
              </p>
              <p style={{ color: 'rgba(200,185,255,0.55)', fontSize: 12, lineHeight: 1.6 }}>
                Our team is reviewing your application. This typically takes 24–48 hours.
                You&apos;ll receive a notification once a decision is made.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {!isTutorApp && (
        <motion.div
          custom={1}
          variants={fade}
          initial="initial"
          animate="animate"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}
        >
          {[
            { label: 'Today', value: loadingStats ? null : (stats?.sessionsToday ?? 0), suffix: 'sessions', icon: Zap, color: '#34d399' },
            { label: 'This Week', value: loadingStats ? null : (stats?.hoursThisWeek ?? 0), suffix: 'hours', icon: Clock, color: '#60a5fa' },
            { label: 'All Time', value: loadingStats ? null : (stats?.sessionsTotal ?? 0), suffix: 'sessions', icon: BarChart2, color: '#a78bfa' },
            { label: 'Rating', value: loadingStats ? null : (stats?.avgRating ? stats.avgRating.toFixed(1) : '—'), suffix: stats?.totalReviews ? `/ 5 (${stats.totalReviews})` : '', icon: Star, color: '#fb923c' },
          ].map(({ label, value, suffix, icon: Icon, color }) => (
            <div key={label} className="panel rounded-2xl px-4 py-4" style={{ position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <Icon size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{label}</p>
              </div>

              {value === null ? (
                <div
                  style={{
                    height: 24,
                    width: 48,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ) : (
                <div>
                  <span style={{ color, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                    {value}
                  </span>
                  {suffix && (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginLeft: 5 }}>
                      {suffix}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {!isTutorApp && (
        <motion.div custom={2} variants={fade} initial="initial" animate="animate">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell
                size={13}
                style={{ color: queue.length > 0 ? '#fb923c' : 'rgba(255,255,255,0.3)' }}
              />
              <h2 className="text-white/70 text-sm font-medium">Incoming Requests</h2>

              {queue.length > 0 && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    background: 'rgba(251,146,60,0.15)',
                    border: '1px solid rgba(251,146,60,0.3)',
                    color: '#fb923c',
                  }}
                >
                  {queue.length} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: discoverable ? '#34d399' : 'rgba(255,255,255,0.2)',
                  boxShadow: discoverable ? '0 0 6px rgba(52,211,153,0.7)' : 'none',
                  animation: discoverable ? 'pulse 2.5s infinite' : 'none',
                }}
              />
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                Polling every 8s
              </span>
            </div>
          </div>

          {loadingQueue ? (
            <div className="panel rounded-2xl px-4 py-8 flex items-center justify-center">
              <Loader2 size={16} className="text-white/20 animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <div className="panel rounded-2xl px-6 py-10 text-center">
              {!hydrated ? (
                <>
                  <Loader2 size={22} className="text-white/20 mx-auto mb-3 animate-spin" />
                  <p className="text-white/30 text-sm">Checking live status</p>
                  <p className="text-white/20 text-xs mt-1">
                    Loading your Redis presence and tutor availability...
                  </p>
                </>
              ) : !discoverable ? (
                <>
                  <WifiOff size={22} className="text-white/15 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">
                    {isOnline ? 'Not accepting requests right now' : "You're offline"}
                  </p>
                  <p className="text-white/20 text-xs mt-1">
                    {isOnline
                      ? 'Go available to start receiving student requests'
                      : 'Go online to start receiving student requests'}
                  </p>
                </>
              ) : (
                <>
                  <Wifi size={22} className="text-emerald-400/40 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No requests right now</p>
                  <p className="text-white/20 text-xs mt-1">
                    You&apos;re live — students will appear here when they request help
                  </p>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence initial={false}>
                {queue.map((req) => (
                  <motion.div
                    key={req.sessionId}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="panel rounded-2xl p-4"
                    style={{
                      border: '1px solid rgba(251,146,60,0.2)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: 'linear-gradient(180deg, #fb923c, #f59e0b)',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                        paddingLeft: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          flexShrink: 0,
                          background: 'linear-gradient(135deg, rgba(251,146,60,0.25), rgba(245,158,11,0.15))',
                          border: '1px solid rgba(251,146,60,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fb923c',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {req.studentName?.[0]?.toUpperCase() ?? 'S'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>
                            {req.studentName}
                          </p>

                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 20,
                              fontSize: 9,
                              textTransform: 'uppercase',
                              color: LEVEL_COLOR[req.subjectName?.includes('CAPE') ? 'CAPE' : 'CSEC'] ?? '#60a5fa',
                              background: 'rgba(96,165,250,0.1)',
                              border: '1px solid rgba(96,165,250,0.2)',
                            }}
                          >
                            {req.subjectName}
                          </span>
                        </div>

                        {req.message && (
                          <p
                            style={{
                              color: 'rgba(255,255,255,0.4)',
                              fontSize: 12,
                              marginBottom: 6,
                              lineHeight: 1.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            "{req.message}"
                          </p>
                        )}

                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
                          <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                          {elapsed(req.requestedAt)}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => declineRequest(req.sessionId)}
                          disabled={!!acceptingId || !!decliningId}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: 'rgba(255,69,58,0.07)',
                            border: '1px solid rgba(255,69,58,0.18)',
                            opacity: decliningId === req.sessionId ? 0.5 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          {decliningId === req.sessionId ? (
                            <Loader2
                              size={13}
                              style={{
                                color: '#ff453a',
                                animation: 'spin 1s linear infinite',
                              }}
                            />
                          ) : (
                            <XCircle size={13} style={{ color: 'rgba(255,69,58,0.6)' }} />
                          )}
                        </button>

                        <button
                          onClick={() => acceptRequest(req.sessionId)}
                          disabled={!!acceptingId || !!decliningId}
                          style={{
                            height: 36,
                            padding: '0 14px',
                            borderRadius: 9,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            background: 'rgba(52,211,153,0.12)',
                            border: '1px solid rgba(52,211,153,0.3)',
                            color: '#34d399',
                            fontSize: 12,
                            fontWeight: 600,
                            opacity: acceptingId === req.sessionId ? 0.5 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          {acceptingId === req.sessionId ? (
                            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <>
                              <CheckCircle size={13} />
                              Accept
                            </>
                          )}
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

      {!isTutorApp && activeSessions.length > 0 && (
        <motion.div custom={3} variants={fade} initial="initial" animate="animate">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MessageCircle size={13} className="text-emerald-400" />
            <h2 className="text-white/70 text-sm font-medium">Active Sessions</h2>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 600,
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.25)',
                color: '#34d399',
              }}
            >
              {activeSessions.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeSessions.map((session) => (
              <motion.button
                key={session.sessionId}
                layout
                onClick={() => joinSession(session.sessionId)}
                className="panel rounded-2xl p-4 text-left w-full hover:bg-white/[0.06] transition group"
                style={{ border: '1px solid rgba(52,211,153,0.18)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))',
                        border: '1px solid rgba(52,211,153,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {session.studentName?.[0]?.toUpperCase() ?? 'S'}
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#34d399',
                        boxShadow: '0 0 6px rgba(52,211,153,0.8)',
                        border: '1.5px solid rgba(0,0,0,0.4)',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>
                      {session.studentName}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{ color: '#60a5fa', fontSize: 10 }}>{session.subjectName}</span>
                      <span
                        style={{
                          color: 'rgba(255,255,255,0.2)',
                          fontSize: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Clock size={9} /> {duration(session.startedAt)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        background: 'rgba(52,211,153,0.12)',
                        border: '1px solid rgba(52,211,153,0.25)',
                        color: '#34d399',
                      }}
                    >
                      Rejoin →
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {subjects.length > 0 && (
        <motion.div custom={4} variants={fade} initial="initial" animate="animate">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <BookOpen size={13} className="text-white/40" />
            <h2 className="text-white/70 text-sm font-medium">Subjects I Teach</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 8,
            }}
          >
            {subjects.map((sub) => {
              const color = LEVEL_COLOR[sub.level] ?? '#60a5fa';

              return (
                <div
                  key={sub.subject_id}
                  className="panel rounded-xl px-4 py-3"
                  style={{
                    border: `1px solid ${color}18`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: `linear-gradient(90deg, transparent, ${color}35, transparent)`,
                    }}
                  />
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    {sub.name}
                  </p>
                  <span
                    style={{
                      color,
                      fontSize: 9,
                      padding: '1px 6px',
                      borderRadius: 20,
                      background: `${color}15`,
                      border: `1px solid ${color}25`,
                    }}
                  >
                    {sub.level}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {!isTutorApp && (
        <motion.div
          custom={5}
          variants={fade}
          initial="initial"
          animate="animate"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          {[
            { label: 'Session History', sub: 'View past sessions', icon: Calendar, path: '/sessions' },
            { label: 'Notifications', sub: 'Alerts and updates', icon: Bell, path: '/notifications' },
          ].map(({ label, sub, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="panel rounded-2xl px-5 py-4 text-left hover:bg-white/[0.06] transition group"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Icon size={14} className="text-white/30" />
                <ArrowRight size={12} className="text-white/15 group-hover:text-white/40 transition" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, marginTop: 10 }}>
                {label}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 2 }}>
                {sub}
              </p>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}