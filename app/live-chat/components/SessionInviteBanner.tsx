'use client';

// app/live-chat/components/SessionInviteBanner.tsx
//
// Global notification banner for:
//   session:invited  — someone invited this user to join a session
//   session:upcoming — a booked/conference session is starting soon
//
// Mounted once in app/live-chat/layout.tsx. Reads from useSessionStore so it
// renders regardless of which live-chat route the user is on.

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Clock } from 'lucide-react';
import { useSessionStore } from '@/features/live-chat/store/useSessionStore';

export function SessionInviteBanner() {
  const router             = useRouter();
  const pendingInvite      = useSessionStore(s => s.pendingInvite);
  const upcomingSession    = useSessionStore(s => s.upcomingSession);
  const setPendingInvite   = useSessionStore(s => s.setPendingInvite);
  const setUpcomingSession = useSessionStore(s => s.setUpcomingSession);

  const handleJoinInvite = () => {
    if (!pendingInvite) return;
    router.push(`/live-chat/${pendingInvite.sessionId}`);
    setPendingInvite(null);
  };

  const handleOpenUpcoming = () => {
    if (!upcomingSession) return;
    router.push(`/live-chat/${upcomingSession.sessionId}`);
    setUpcomingSession(null);
  };

  const hasNotification = !!pendingInvite || !!upcomingSession;

  return (
    <AnimatePresence>
      {hasNotification && (
        <motion.div
          key="invite-banner"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-xs w-full"
        >
          {/* Invite notification */}
          {pendingInvite && (
            <div className="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 flex items-start gap-3 shadow-xl shadow-black/30">
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm font-medium leading-snug">
                  <span className="text-emerald-300">@{pendingInvite.fromUsername}</span>
                  {' '}invited you to join
                </p>
                {pendingInvite.subjectName && (
                  <p className="text-white/35 text-xs mt-0.5 truncate">{pendingInvite.subjectName}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                <button
                  onClick={handleJoinInvite}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium hover:bg-emerald-500/35 transition"
                >
                  Join <ArrowRight size={10} />
                </button>
                <button
                  onClick={() => setPendingInvite(null)}
                  className="p-1.5 rounded-lg glass-soft text-white/25 hover:text-white/55 transition"
                  aria-label="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Upcoming session notification */}
          {upcomingSession && (
            <div className="glass rounded-2xl border border-blue-500/20 bg-blue-500/8 px-4 py-3 flex items-start gap-3 shadow-xl shadow-black/30">
              <Clock size={14} className="text-blue-400/70 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm font-medium leading-snug">
                  {upcomingSession.type === 'booked' ? 'Your session is starting soon' : 'Conference starting soon'}
                </p>
                {upcomingSession.scheduledAt && (
                  <p className="text-white/35 text-xs mt-0.5">
                    {new Date(upcomingSession.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                <button
                  onClick={handleOpenUpcoming}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-medium hover:bg-blue-500/35 transition"
                >
                  Open <ArrowRight size={10} />
                </button>
                <button
                  onClick={() => setUpcomingSession(null)}
                  className="p-1.5 rounded-lg glass-soft text-white/25 hover:text-white/55 transition"
                  aria-label="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
