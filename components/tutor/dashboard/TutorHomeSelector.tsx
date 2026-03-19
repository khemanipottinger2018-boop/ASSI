'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, Bell, LayoutDashboard,
  Calendar, ChevronRight, Loader2, BookOpen,
  Users, Clock,
} from 'lucide-react';
import { useAuth }    from '@/contexts/AuthContext';
import { usePresence, type PresenceStatus } from '@/hooks/usePresence';
import { useSocket }  from '@/hooks/useSocket';

type AvailabilityStatus = PresenceStatus;

// Queue entries arrive via socket event 'session:request'
// There is no REST polling endpoint for the tutor queue
type QueueEntry = {
  sessionId:   string;
  studentName: string;
  subjectName: string;
  requestedAt: number;
};

const STATUS_CFG: Record<AvailabilityStatus, {
  label: string; sub: string; dot: string; glow: string;
  bg: string; border: string; labelColor: string;
}> = {
  online: {
    label: "You're Live",
    sub:   'Students can request your help right now',
    dot: '#34d399', glow: 'rgba(52,211,153,0.5)',
    bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)',
    labelColor: '#34d399',
  },
  offline: {
    label: "You're Offline",
    sub:   'Go online to start receiving student requests',
    dot: 'rgba(255,255,255,0.25)', glow: 'transparent',
    bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)',
    labelColor: 'rgba(255,255,255,0.5)',
  },
  busy: {
    label: 'In a Session',
    sub:   "You're currently with a student",
    dot: '#fb923c', glow: 'rgba(251,146,60,0.5)',
    bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.25)',
    labelColor: '#fb923c',
  },
};

export default function TutorHomeSelector() {
  const router   = useRouter();
  const { user } = useAuth();

  const { status, setStatus } = usePresence();
  const { subscribe }         = useSocket();

  const [toggling, setToggling] = useState(false);
  const [queue,    setQueue]    = useState<QueueEntry[]>([]);

  // Queue is populated via socket — no REST polling endpoint exists
  useEffect(() => {
    const unsub = subscribe('session:request', (payload: any) => {
      const entry: QueueEntry = {
        sessionId:   payload.sessionId,
        studentName: payload.studentName ?? 'Student',
        subjectName: payload.subjectName ?? '',
        requestedAt: payload.requestedAt ?? Date.now(),
      };
      setQueue(prev => {
        if (prev.some(q => q.sessionId === entry.sessionId)) return prev;
        return [entry, ...prev];
      });
    });

    // Also clear queue entry when session ends or is accepted
    const unsubEnd = subscribe('session:ended', (payload: any) => {
      setQueue(prev => prev.filter(q => q.sessionId !== payload.sessionId));
    });

    return () => { unsub(); unsubEnd(); };
  }, [subscribe]);

  const toggle = async () => {
    if (toggling || status === 'busy') return;
    const next: AvailabilityStatus = status === 'online' ? 'offline' : 'online';
    setToggling(true);
    await setStatus(next);
    setToggling(false);
  };

  const cfg         = STATUS_CFG[status];
  const hasRequests = queue.length > 0;

  // role uses underscore: tutor_applicant (not tutor-applicant)
  const isTutorApp = user?.role === 'tutor_applicant';

  const elapsed = (ts: number) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    return m < 1 ? 'just now' : `${m}m ago`;
  };

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
            : 'Manage your availability and incoming requests.'
          }
        </p>
      </div>

      {/* ── Applicant state ── */}
      {isTutorApp ? (
        <div style={{
          padding: '16px', borderRadius: 14, marginBottom: 16,
          background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Bell size={14} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ color: '#a78bfa', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
              Application Under Review
            </p>
            <p style={{ color: 'rgba(200,185,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
              Our team is reviewing your submission. You'll be notified within 24–48 hours.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Availability toggle ── */}
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={toggle}
              disabled={toggling || status === 'busy'}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', borderRadius: 14, cursor: status === 'busy' ? 'default' : 'pointer',
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                transition: 'all 0.2s ease', opacity: toggling ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                  {status === 'online' && (
                    <motion.div
                      animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                      style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: cfg.dot, opacity: 0.3 }}
                    />
                  )}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${cfg.dot}, ${cfg.dot}88)`,
                    boxShadow: `0 0 16px ${cfg.glow}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {toggling
                      ? <Loader2 size={16} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                      : status === 'online'
                        ? <Wifi size={16} color="white" />
                        : status === 'busy'
                          ? <Users size={16} color="white" />
                          : <WifiOff size={16} color="rgba(255,255,255,0.6)" />
                    }
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: cfg.labelColor, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
                    {cfg.label}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }}>
                    {cfg.sub}
                  </p>
                </div>
              </div>

              {status !== 'busy' && (
                <div style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: status === 'online' ? 'rgba(255,69,58,0.1)' : 'rgba(52,211,153,0.12)',
                  border: `1px solid ${status === 'online' ? 'rgba(255,69,58,0.25)' : 'rgba(52,211,153,0.28)'}`,
                  color: status === 'online' ? '#ff6b6b' : '#34d399',
                  flexShrink: 0,
                }}>
                  {status === 'online' ? 'Go Offline' : 'Go Online'}
                </div>
              )}
            </button>
          </div>

          {/* ── Incoming requests preview ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{
              borderRadius: 14, overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)',
              border: hasRequests ? '1px solid rgba(251,146,60,0.25)' : '1px solid rgba(255,255,255,0.07)',
              transition: 'border-color 0.2s ease',
            }}>
              <button
                onClick={() => router.push('/dashboard/tutor')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={13} style={{ color: hasRequests ? '#fb923c' : 'rgba(255,255,255,0.3)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>
                    Incoming Requests
                  </span>
                  <AnimatePresence>
                    {hasRequests && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)',
                          color: '#fb923c',
                        }}
                      >
                        {queue.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
              </button>

              {hasRequests && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {queue.slice(0, 2).map((req, i) => (
                    <div key={req.sessionId} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 16px',
                      borderBottom: i < Math.min(queue.length, 2) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fb923c', fontSize: 11, fontWeight: 700,
                      }}>
                        {req.studentName?.[0]?.toUpperCase() ?? 'S'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500 }}>{req.studentName}</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{req.subjectName} · {elapsed(req.requestedAt)}</p>
                      </div>
                      <Clock size={10} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    </div>
                  ))}
                  {queue.length > 2 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, textAlign: 'center' }}>
                        +{queue.length - 2} more — open dashboard to manage
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!hasRequests && status === 'online' && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                    No requests yet — students will appear here
                  </p>
                </div>
              )}

              {!hasRequests && status === 'offline' && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                    Go online to receive requests
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Quick action buttons ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Full Dashboard', sub: 'Stats, queue, subjects', icon: LayoutDashboard, color: '#60a5fa', path: '/dashboard/tutor', show: true },
          { label: 'My Sessions',    sub: 'History and schedule',  icon: Calendar,        color: '#a78bfa', path: '/sessions',        show: true },
          { label: 'Notifications',  sub: 'Updates and alerts',    icon: Bell,            color: '#34d399', path: '/notifications',   show: !isTutorApp },
          { label: 'My Subjects',    sub: 'View coverage',         icon: BookOpen,        color: '#fb923c', path: '/dashboard/tutor', show: !isTutorApp },
        ].filter(b => b.show).map(({ label, sub, icon: Icon, color, path }) => (
          <button
            key={label}
            onClick={() => router.push(path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: `${color}15`, border: `1px solid ${color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={13} style={{ color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 }}>{label}</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 1 }}>{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}