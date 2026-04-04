'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter }           from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, LayoutDashboard, Calendar,
  ChevronRight, Clock, MessageCircle,
  Loader2, CheckCircle, XCircle, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth }             from '@/features/auth';
import { usePresenceDisplay }  from '@/features/presence';
import { usePresence }         from '@/features/presence';
import { useSocketContext }    from '@/features/socket';
import TutorAvailabilityToggle from '@/features/presence/TutorAvailabilityToggle';
import { sessionsApi, api }    from '@/lib/api';
import { browseApi }           from '@/features/booking/browseApi';
import type { SessionSummary } from '@/features/booking/browseApi';

type QueueEntry = {
  sessionId:   string;
  studentName: string;
  subjectName: string;
  requestedAt: number;
  message?:    string;
};

type ActiveSession = {
  sessionId:   string;
  partnerName: string;
  subjectName: string;
  startedAt:   string;
};

function elapsed(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000);
  return m < 1 ? 'just now' : `${m}m ago`;
}

export default function TutorHomeSelector() {
  const router   = useRouter();
  const { user } = useAuth();

  const { variant, subtitle } = usePresenceDisplay();
  const { eligibility }       = usePresence();
  const { subscribe }         = useSocketContext();

  const available    = variant === 'available';
  const busy         = variant === 'busy';
  const discoverable = eligibility?.eligible ?? false;

  const [queue,            setQueue]            = useState<QueueEntry[]>([]);
  const [activeSession,    setActiveSession]    = useState<ActiveSession | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<SessionSummary[]>([]);
  const [acceptingId,      setAcceptingId]      = useState<string | null>(null);
  const [decliningId,      setDecliningId]      = useState<string | null>(null);
  const [confirmingId,     setConfirmingId]     = useState<string | null>(null);
  const [loading,          setLoading]          = useState(true);

  // ── Backend fetch on mount ──
  const fetchData = useCallback(async () => {
    try {
      const [activeData, sessionsData] = await Promise.allSettled([
        sessionsApi.getActiveSession(),
        browseApi.mySessions(),
      ]);

      if (activeData.status === 'fulfilled' && activeData.value.success && activeData.value.session) {
        const s = activeData.value.session;
        setActiveSession({
          sessionId:   s.sessionId,
          partnerName: s.tutorName,
          subjectName: s.subjectName,
          startedAt:   s.startedAt,
        });
      }

      if (sessionsData.status === 'fulfilled' && sessionsData.value.success) {
        const upcoming = (sessionsData.value.sessions ?? []).filter(
          s => s.status === 'pending' || s.status === 'confirmed'
        );
        setUpcomingSessions(upcoming);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Socket: incoming requests + session lifecycle ──
  useEffect(() => {
    const unsubReq = subscribe('session:request', (payload: any) => {
      setQueue(prev => {
        if (prev.some(q => q.sessionId === payload.sessionId)) return prev;
        return [{
          sessionId:   payload.sessionId,
          studentName: payload.studentName ?? 'Student',
          subjectName: payload.subjectName ?? '',
          requestedAt: payload.requestedAt ?? Date.now(),
          message:     payload.message,
        }, ...prev];
      });
    });

    const unsubEnd = subscribe('session:ended', (payload: any) => {
      setQueue(prev => prev.filter(q => q.sessionId !== payload.sessionId));
      setActiveSession(prev => prev?.sessionId === payload.sessionId ? null : prev);
    });

    const unsubStarted = subscribe('session:started', (payload: any) => {
      setQueue(prev => {
        const entry = prev.find(q => q.sessionId === payload.sessionId);
        if (entry) {
          setActiveSession({
            sessionId:   entry.sessionId,
            partnerName: entry.studentName,
            subjectName: entry.subjectName,
            startedAt:   new Date().toISOString(),
          });
        }
        return prev.filter(q => q.sessionId !== payload.sessionId);
      });
    });

    return () => { unsubReq(); unsubEnd(); unsubStarted(); };
  }, [subscribe]);

  const acceptRequest = useCallback(async (sessionId: string) => {
    if (acceptingId) return;
    setAcceptingId(sessionId);
    try {
      const data = await api.post<{ success: boolean }>(`/api/live-chat/${sessionId}/accept`);
      if (data.success) router.push(`/live-chat/${sessionId}`);
    } catch { /* silent */ }
    finally { setAcceptingId(null); }
  }, [acceptingId, router]);

  const declineRequest = useCallback((sessionId: string) => {
    if (decliningId) return;
    setDecliningId(sessionId);
    setQueue(prev => prev.filter(q => q.sessionId !== sessionId));
    setDecliningId(null);
  }, [decliningId]);

  const confirmBooking = useCallback(async (sessionId: string) => {
    if (confirmingId) return;
    setConfirmingId(sessionId);
    try {
      await browseApi.confirm(sessionId);
      router.push(`/live-chat/${sessionId}`);
    } catch { /* silent */ }
    finally { setConfirmingId(null); }
  }, [confirmingId, router]);

  const cancelBooking = useCallback(async (sessionId: string) => {
    try {
      await browseApi.cancel(sessionId);
      setUpcomingSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    } catch { /* silent */ }
  }, []);

  const isTutorApp  = user?.role === 'tutor_applicant';
  const hasRequests = queue.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6 w-full max-w-xl mx-auto space-y-3"
    >
      {/* ── Header ── */}
      <div className="text-center mb-2">
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
        <div className="panel rounded-2xl p-4 border border-purple-500/20 bg-purple-500/8 flex items-start gap-3">
          <Bell size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-400 text-xs font-semibold mb-1">Application Under Review</p>
            <p className="text-purple-200/50 text-xs leading-relaxed">
              Our team is reviewing your submission. You&apos;ll be notified within 24–48 hours.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Availability toggle ── */}
          <div className={`panel rounded-2xl p-4 border transition-all ${
            busy      ? 'bg-orange-500/8 border-orange-500/25' :
            available ? 'bg-emerald-500/8 border-emerald-500/25' :
                        'bg-white/4 border-white/10'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: discoverable ? '#34d399' : available ? '#fb923c' : 'rgba(255,255,255,0.2)',
                    boxShadow:  discoverable ? '0 0 6px rgba(52,211,153,0.7)' : 'none',
                  }}
                />
                <p className="text-xs text-white/40 truncate">{subtitle}</p>
              </div>
              <TutorAvailabilityToggle />
            </div>
          </div>

          {/* ── Active session ── */}
          {!loading && activeSession && (
            <button
              onClick={() => router.push(`/live-chat/${activeSession.sessionId}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition hover:opacity-90"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.22)' }}
            >
              <div className="relative flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
                <MessageCircle size={15} className="text-emerald-400 relative" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-emerald-400 text-xs font-semibold">Ongoing Session</p>
                <p className="text-white/40 text-xs truncate">
                  {activeSession.subjectName} · with {activeSession.partnerName}
                </p>
              </div>
              <ChevronRight size={13} className="text-emerald-400/50 flex-shrink-0" />
            </button>
          )}

          {/* ── Incoming requests ── */}
          <div className={`panel rounded-2xl border overflow-hidden transition-all ${
            hasRequests ? 'border-orange-500/25' : 'border-white/8'
          }`}>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {discoverable ? (
                  <Wifi size={12} className="text-emerald-400" />
                ) : (
                  <WifiOff size={12} className="text-white/25" />
                )}
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
              <button
                onClick={() => router.push('/dashboard/tutor')}
                className="flex items-center gap-0.5 text-white/30 hover:text-white/60 text-[10px] transition"
              >
                Full view <ChevronRight size={10} />
              </button>
            </div>

            {hasRequests ? (
              <div className="border-t border-white/6">
                <AnimatePresence initial={false}>
                  {queue.slice(0, 3).map((req, i) => (
                    <motion.div
                      key={req.sessionId}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-center gap-3 px-4 py-2.5 ${
                        i < Math.min(queue.length, 3) - 1 ? 'border-b border-white/4' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg glass-soft flex items-center justify-center flex-shrink-0 text-orange-400 text-xs font-bold">
                        {req.studentName?.[0]?.toUpperCase() ?? 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs font-medium truncate">{req.studentName}</p>
                        <p className="text-white/30 text-[10px]">{req.subjectName} · {elapsed(req.requestedAt)}</p>
                        {req.message && (
                          <p className="text-white/25 text-[10px] truncate italic">&ldquo;{req.message}&rdquo;</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => declineRequest(req.sessionId)}
                          disabled={!!acceptingId || !!decliningId}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/8 border border-red-500/18 transition"
                        >
                          {decliningId === req.sessionId
                            ? <Loader2 size={11} className="text-red-400 animate-spin" />
                            : <XCircle size={11} className="text-red-400/60" />}
                        </button>
                        <button
                          onClick={() => acceptRequest(req.sessionId)}
                          disabled={!!acceptingId || !!decliningId}
                          className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-emerald-400 text-[10px] font-semibold bg-emerald-500/12 border border-emerald-500/30 transition"
                        >
                          {acceptingId === req.sessionId
                            ? <Loader2 size={11} className="animate-spin" />
                            : <><CheckCircle size={11} /> Accept</>}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {queue.length > 3 && (
                  <div className="px-4 py-2 border-t border-white/4 text-center">
                    <p className="text-white/25 text-[10px]">+{queue.length - 3} more — open full dashboard</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-2.5 border-t border-white/6 text-center">
                <p className="text-white/20 text-[11px]">
                  {discoverable
                    ? 'No requests yet — students will appear here'
                    : 'Go online to receive requests'}
                </p>
              </div>
            )}
          </div>

          {/* ── Upcoming booked sessions ── */}
          {!loading && upcomingSessions.length > 0 && (
            <div className="panel rounded-2xl border border-purple-500/15 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-purple-400" />
                  <span className="text-white/60 text-xs font-medium">Upcoming Bookings</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-400">
                    {upcomingSessions.length}
                  </span>
                </div>
                <button onClick={() => router.push('/sessions')}
                  className="flex items-center gap-0.5 text-white/30 hover:text-white/60 text-[10px] transition">
                  View all <ChevronRight size={10} />
                </button>
              </div>
              <div className="border-t border-white/6">
                {upcomingSessions.slice(0, 3).map((session, i) => {
                  const scheduledAt = session.scheduledAt ? new Date(session.scheduledAt) : null;
                  return (
                    <div key={session.sessionId}
                      className={`flex items-center gap-3 px-4 py-2.5 ${
                        i < Math.min(upcomingSessions.length, 3) - 1 ? 'border-b border-white/4' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg glass-soft flex items-center justify-center flex-shrink-0 text-purple-400 text-xs font-bold">
                        {session.partnerUsername?.[0]?.toUpperCase() ?? 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs font-medium truncate">{session.partnerUsername}</p>
                        <p className="text-white/30 text-[10px]">
                          {session.subjectName}
                          {scheduledAt && ` · ${scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => cancelBooking(session.sessionId)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/8 border border-red-500/18 transition"
                          title="Cancel booking"
                        >
                          <XCircle size={11} className="text-red-400/60" />
                        </button>
                        <button
                          onClick={() => confirmBooking(session.sessionId)}
                          disabled={confirmingId === session.sessionId}
                          className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-purple-400 text-[10px] font-semibold bg-purple-500/12 border border-purple-500/30 transition disabled:opacity-40"
                        >
                          {confirmingId === session.sessionId
                            ? <Loader2 size={11} className="animate-spin" />
                            : <><CheckCircle size={11} /> Confirm</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {upcomingSessions.length > 3 && (
                  <div className="px-4 py-2 border-t border-white/4 text-center">
                    <p className="text-white/25 text-[10px]">+{upcomingSessions.length - 3} more — view all sessions</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Full Dashboard', sub: 'Stats & queue',      icon: LayoutDashboard, color: 'text-blue-400',    bg: 'bg-blue-500/8    border-blue-500/15',   path: '/dashboard/tutor', show: true        },
          { label: 'My Sessions',    sub: 'History & schedule', icon: Calendar,        color: 'text-purple-400', bg: 'bg-purple-500/8  border-purple-500/15',  path: '/sessions',        show: true        },
          { label: 'Notifications',  sub: 'Updates & alerts',   icon: Bell,            color: 'text-emerald-400',bg: 'bg-emerald-500/8 border-emerald-500/15', path: '/notifications',   show: !isTutorApp },
          { label: 'Live Lobby',     sub: 'Manage sessions',    icon: MessageCircle,   color: 'text-orange-400', bg: 'bg-orange-500/8  border-orange-500/15',  path: '/live-chat',       show: !isTutorApp },
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
