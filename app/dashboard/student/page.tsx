'use client';

import { useEffect, useState }  from 'react';
import { useRouter }             from 'next/navigation';
import { motion }                from 'framer-motion';
import { listItemVariants, listTransition } from '@/lib/motion';
import {
  Search, Cpu, Calendar, Bell, BookOpen, Inbox,
  Flame, CheckCircle2, Circle, Coins,
} from 'lucide-react';
import { useAuth }          from '@/features/auth';
import { useNotifications } from '@/features/notifications';
import { useMessages }      from '@/features/live-chat';
import { useStreak }        from '@/features/platform';
import { useSocketContext }  from '@/features/socket';
import { sessionsApi, tutorsApi, notificationsApi, userApi } from '@/lib/api';
import { filterActive } from '@/features/types/notification';
import type { ChatSession }  from '@/lib/api';
import type { TutorSummary } from '@/lib/api';
import type { Notification } from '@/features/types/notification';
import type { DailyTask }    from '@/lib/api';

import DashboardSection   from '@/features/dashboard/student/DashboardSection';
import QuickActionButton  from '@/features/dashboard/student/QuickActionButton';
import RecentSessionRow   from '@/features/sessions/RecentSessionRow';
import OngoingSessionCard from '@/features/sessions/OngoingSessionCard';
import AvailableTutorCard from '@/features/browse/AvailableTutorCard';
import StatCard           from '@/features/dashboard/student/StatCard';
import StreakCard, { StreakCardSkeleton } from '@/features/dashboard/student/StreakCard';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const router   = useRouter();

  const { unreadCount: notifUnread } = useNotifications();
  const { unreadCount: msgUnread }   = useMessages();
  const { streak, isLoading: streakLoading } = useStreak();
  const { subscribe, isConnected } = useSocketContext();

  const [sessions,      setSessions]      = useState<ChatSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tutors,        setTutors]        = useState<TutorSummary[]>([]);
  const [dailyTasks,    setDailyTasks]    = useState<DailyTask[]>([]);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string; partnerName: string; subjectName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sessionsApi.getChatSessions(),
      notificationsApi.getAll(),
      tutorsApi.getAvailable(),
      userApi.getDailyTasks(),
      sessionsApi.getActiveSession(),
    ]).then(([s, n, t, tasks, active]) => {
      if (s.success)     setSessions(s.sessions ?? []);
      if (n.success)     setNotifications(filterActive(n.notifications ?? []).slice(0, 5));
      if (t.success)     setTutors((t.tutors ?? []).slice(0, 4));
      if (tasks.success) setDailyTasks(tasks.tasks ?? []);
      if (active.success && active.session) {
        setActiveSession({
          sessionId:   active.session.sessionId,
          partnerName: active.session.partnerName,
          subjectName: active.session.subjectName,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Clear the active session card immediately when the server signals it ended
  useEffect(() => {
    if (!user) return;
    return subscribe('session:ended', (payload: { sessionId?: string }) => {
      setActiveSession(prev =>
        !payload.sessionId || prev?.sessionId === payload.sessionId ? null : prev
      );
    });
  }, [user?.id, subscribe, isConnected]);

  const upcoming  = sessions.filter(s =>
    ['pending', 'confirmed', 'in_progress', 'active', 'waiting'].includes(s.status)
  ).slice(0, 3);
  const completed = sessions.filter(s => s.status === 'completed');
  const unread    = notifications.filter(n => !n.isRead).length;

  const tasksCompleted = dailyTasks.filter(t => t.completed).length;
  const tasksTotal     = dailyTasks.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-7">

      {/* ── Header ── */}
      <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(0)}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/65 text-xs font-semibold uppercase tracking-widest mb-1">
              {greeting()}
            </p>
            <h1 className="text-white font-semibold text-xl tracking-tight flex items-center gap-2">
              {user?.username}
              {streak.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-[11px] font-semibold text-orange-400">
                  <Flame size={10} />
                  {streak.currentStreak}d
                </span>
              )}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {upcoming.length > 0
                ? `You have ${upcoming.length} upcoming session${upcoming.length > 1 ? 's' : ''}`
                : 'Ready to learn something new today?'}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {notifUnread > 0 && (
              <button onClick={() => router.push('/notifications')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-soft border border-white/10 hover:border-white/20 transition">
                <Bell size={12} className="text-orange-400" />
                <span className="text-[11px] font-semibold text-orange-400">{notifUnread}</span>
              </button>
            )}
            {msgUnread > 0 && (
              <button onClick={() => router.push('/inbox')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-soft border border-white/10 hover:border-white/20 transition">
                <Inbox size={12} className="text-blue-400" />
                <span className="text-[11px] font-semibold text-blue-400">{msgUnread}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Active session rejoin ── */}
      {activeSession && (
        <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(0.5)}>
          <OngoingSessionCard
            sessionId={activeSession.sessionId}
            partnerName={activeSession.partnerName}
            subjectName={activeSession.subjectName}
            role="student"
            onCleared={() => setActiveSession(null)}
          />
        </motion.div>
      )}

      {/* ── Stat cards ── */}
      <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(1)}
        className="grid grid-cols-2 gap-3">
        <StatCard title="Upcoming"  value={loading ? undefined : upcoming.length}  icon={Calendar} accent="emerald" />
        <StatCard title="Completed" value={loading ? undefined : completed.length} icon={BookOpen} />
        <StatCard title="Unread"    value={loading ? undefined : unread}            icon={Bell}     accent={unread > 0 ? 'orange' : 'white'} />
        <StatCard title="Credits"   value={user?.creditBalance ?? undefined}        icon={Coins}    accent="orange" />
      </motion.div>

      {/* ── Quick actions ── */}
      <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(2)}
        className="grid grid-cols-2 gap-3">
        <QuickActionButton
          icon={Search} label="Find a Tutor" sub="Browse available tutors"
          onClick={() => router.push('/browse')} accent="emerald"
        />
        <QuickActionButton
          icon={Cpu} label="Ask ASSI" sub="AI study assistant"
          onClick={() => window.dispatchEvent(new Event('assi:open'))} accent="purple"
        />
      </motion.div>

      {/* ── Streak ── */}
      <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(3)}>
        {streakLoading
          ? <StreakCardSkeleton />
          : <StreakCard streak={streak} />
        }
      </motion.div>

      {/* ── Daily tasks ── */}
      {(loading || dailyTasks.length > 0) && (
        <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(4)}>
          <DashboardSection
            title={`Daily Tasks${tasksTotal > 0 ? ` (${tasksCompleted}/${tasksTotal})` : ''}`}
            icon={CheckCircle2}
          >
            {loading ? (
              <>{[0, 1, 2].map(i => <div key={i} className="glass-soft rounded-2xl h-10 animate-pulse" />)}</>
            ) : (
              dailyTasks.map((task, i) => (
                <div key={task.id || task.slug || i}
                  className={`flex items-center gap-3 glass-soft rounded-2xl px-4 py-3 transition ${
                    task.completed ? 'opacity-50' : ''
                  }`}>
                  {task.completed
                    ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    : <Circle size={14} className="text-white/45 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${task.completed ? 'line-through text-white/35' : 'text-white'}`}>
                      {task.title}
                    </p>
                  </div>
                  {task.reward > 0 && (
                    <span className="text-[10px] text-orange-400 font-semibold flex-shrink-0">
                      +{task.reward}cr
                    </span>
                  )}
                </div>
              ))
            )}
          </DashboardSection>
        </motion.div>
      )}

      {/* ── Upcoming sessions ── */}
      <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(5)}>
        <DashboardSection title="Upcoming Sessions" icon={Calendar} onSeeAll={() => router.push('/sessions')}>
          {loading ? (
            <>{[0, 1].map(i => <div key={i} className="glass-soft rounded-2xl h-14 animate-pulse" />)}</>
          ) : upcoming.length === 0 ? (
            <div className="glass-soft rounded-2xl px-4 py-6 text-center">
              <p className="text-white/60 text-sm">No upcoming sessions</p>
              <button onClick={() => router.push('/browse')}
                className="mt-2 text-xs text-white/70 hover:text-white underline underline-offset-2 transition">
                Book one now
              </button>
            </div>
          ) : (
            upcoming.map(s => (
              <RecentSessionRow
                key={s.sessionId}
                sessionId={s.sessionId}
                subject={s.subjectName}
                partnerName={s.partnerName}
                scheduledAt={s.startedAt ?? ''}
                status={s.status}
              />
            ))
          )}
        </DashboardSection>
      </motion.div>

      {/* ── Available tutors ── */}
      {(loading || tutors.length > 0) && (
        <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(6)}>
          <DashboardSection title="Available Now" icon={Search} onSeeAll={() => router.push('/browse')}>
            {loading ? (
              <>{[0, 1].map(i => <div key={i} className="glass-soft rounded-2xl h-20 animate-pulse" />)}</>
            ) : (
              tutors.map(t => (
                <AvailableTutorCard
                  key={t.userId}
                  tutorId={t.userId}
                  userId={t.userId}
                  username={t.username}
                  subjects={t.subjects}
                  hourlyRate={t.hourlyRate}
                  isStudentTutor={t.isStudentTutor}
                />
              ))
            )}
          </DashboardSection>
        </motion.div>
      )}

      {/* ── Notifications ── */}
      <motion.div variants={listItemVariants} initial="initial" animate="animate" transition={listTransition(7)}>
        <DashboardSection title="Notifications" icon={Bell} onSeeAll={() => router.push('/notifications')}>
          {loading ? (
            <>{[0, 1, 2].map(i => <div key={i} className="glass-soft rounded-2xl h-12 animate-pulse" />)}</>
          ) : notifications.length === 0 ? (
            <div className="glass-soft rounded-2xl px-4 py-5 text-center">
              <p className="text-white/60 text-sm">You&apos;re all caught up</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="flex items-start gap-3 glass-soft rounded-2xl px-4 py-3">
                {!n.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  <p className="text-white/65 text-xs mt-0.5 leading-relaxed">{n.body}</p>
                </div>
              </div>
            ))
          )}
        </DashboardSection>
      </motion.div>
    </div>
  );
}
