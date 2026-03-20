'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, Bell, LayoutDashboard,
  Calendar, ChevronRight, Loader2, BookOpen,
  Users, Clock, Radio,
} from 'lucide-react';
import { useAuth }    from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { useSocket }  from '@/hooks/useSocket';

type QueueEntry = {
  sessionId:   string;
  studentName: string;
  subjectName: string;
  requestedAt: number;
};

const STATUS_CFG = {
  online: {
    label:      "You're Live",
    sub:        'Students can request your help right now',
    icon:       Wifi,
    dotColor:   'bg-emerald-400',
    dotGlow:    'shadow-emerald-400/50',
    cardBg:     'bg-emerald-500/8',
    cardBorder: 'border-emerald-500/25',
    labelColor: 'text-emerald-400',
    actionLabel:'Go Offline',
    actionCls:  'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15',
  },
  offline: {
    label:      "You're Offline",
    sub:        'Go online to receive student requests',
    icon:       WifiOff,
    dotColor:   'bg-white/20',
    dotGlow:    '',
    cardBg:     'bg-white/4',
    cardBorder: 'border-white/10',
    labelColor: 'text-white/50',
    actionLabel:'Go Online',
    actionCls:  'bg-emerald-500/12 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20',
  },
  busy: {
    label:      'In a Session',
    sub:        "You're currently with a student",
    icon:       Users,
    dotColor:   'bg-orange-400',
    dotGlow:    'shadow-orange-400/50',
    cardBg:     'bg-orange-500/8',
    cardBorder: 'border-orange-500/25',
    labelColor: 'text-orange-400',
    actionLabel:'',
    actionCls:  '',
  },
} as const;

function elapsed(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000);
  return m < 1 ? 'just now' : `${m}m ago`;
}

export default function TutorHomeSelector() {
  const router   = useRouter();
  const { user } = useAuth();

  // Presence from Redis (status, hydrated, discoverable)
  const { status, setStatus, hydrated, discoverable } = usePresence();

  // Live socket connection state — reactive, no Redis roundtrip
  const { isConnected, subscribe } = useSocket();

  const [toggling,         setToggling]         = useState(false);
  const [queue,            setQueue]            = useState<QueueEntry[]>([]);
  const [showSocketStatus, setShowSocketStatus] = useState(false);

  // Wait 2s before showing socket status to avoid misleading
  // "Socket offline" flash while connection is still establishing
  useEffect(() => {
    const t = setTimeout(() => setShowSocketStatus(true), 2000);
    return () => clearTimeout(t);
  }, []);

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

  const toggle = async () => {
    if (toggling || status === 'busy' || !hydrated) return;
    setToggling(true);
    await setStatus(status === 'online' ? 'offline' : 'online');
    setToggling(false);
  };

  const isTutorApp  = user?.role === 'tutor_applicant';
  const cfg         = STATUS_CFG[status] ?? STATUS_CFG.offline;
  const StatusIcon  = cfg.icon;
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
          {/* ── Availability toggle ── */}
          <button
            onClick={toggle}
            disabled={toggling || status === 'busy' || !hydrated}
            className={`w-full panel rounded-2xl p-4 border flex items-center justify-between gap-4 mb-3 transition-all duration-200 disabled:cursor-not-allowed ${cfg.cardBg} ${cfg.cardBorder}`}
          >
            <div className="flex items-center gap-4">
              {/* Status orb */}
              <div className="relative flex-shrink-0">
                {status === 'online' && (
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full bg-emerald-400/30"
                  />
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.cardBg} border ${cfg.cardBorder}`}>
                  {toggling || !hydrated ? (
                    <Loader2 size={16} className="text-white/60 animate-spin" />
                  ) : (
                    <StatusIcon size={16} className={cfg.labelColor} />
                  )}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${cfg.dotColor} ${status !== 'offline' ? 'shadow-lg ' + cfg.dotGlow : ''}`} />
              </div>

              <div className="text-left">
                <p className={`text-sm font-semibold ${cfg.labelColor}`}>{cfg.label}</p>
                <p className="text-white/35 text-xs mt-0.5">{cfg.sub}</p>

                {/* Socket status — live from useSocket, shown after 2s delay */}
                {hydrated && showSocketStatus && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Radio size={9} className={isConnected ? 'text-emerald-400/60' : 'text-white/20'} />
                    <span className="text-[10px] text-white/25">
                      {isConnected
                        ? discoverable ? 'Discoverable' : 'Connected'
                        : 'Socket offline'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {status !== 'busy' && hydrated && (
              <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border flex-shrink-0 transition ${cfg.actionCls}`}>
                {cfg.actionLabel}
              </span>
            )}
          </button>

          {/* ── Incoming requests ── */}
          <div className={`panel rounded-2xl border overflow-hidden mb-3 transition-all ${hasRequests ? 'border-orange-500/25' : 'border-white/8'}`}>
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
                    className={`flex items-center gap-3 px-4 py-2.5 ${i < Math.min(queue.length, 2) - 1 ? 'border-b border-white/4' : ''}`}
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
                  {status === 'online'
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
          { label: 'Full Dashboard', sub: 'Stats & queue',      icon: LayoutDashboard, color: 'text-blue-400',    bg: 'bg-blue-500/8   border-blue-500/15',   path: '/dashboard/tutor', show: true        },
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