'use client';

import { useEffect, useState }  from 'react';
import { useRouter }             from 'next/navigation';
import { motion }                from 'framer-motion';
import {
  Search, Cpu, Calendar, Bell, BookOpen, Inbox,
  Flame, CheckCircle2, Circle, MessageCircle, ChevronRight,
} from 'lucide-react';
import { useAuth }          from '@/features/auth';
import { useNotifications } from '@/features/notifications';
import { useMessages }      from '@/features/live-chat';
import { useStreak }        from '@/features/platform';
import { sessionsApi, tutorsApi, notificationsApi, userApi } from '@/lib/api';
import { filterActive } from '@/features/types/notification';
import type { ChatSession }  from '@/lib/api';
import type { TutorSummary } from '@/lib/api';
import type { Notification } from '@/features/types/notification';
import type { DailyTask }    from '@/lib/api';

import DashboardSection   from '@/features/dashboard/student/DashboardSection';
import QuickActionButton  from '@/features/dashboard/student/QuickActionButton';
import RecentSessionRow   from '@/features/sessions/RecentSessionRow';
import AvailableTutorCard from '@/features/browse/AvailableTutorCard';
import StatCard           from '@/features/dashboard/student/StatCard';

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

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
  const { streak }                   = useStreak();

  const [sessions,      setSessions]      = useState<ChatSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tutors,        setTutors]        = useState<TutorSummary[]>([]);
  const [dailyTasks,    setDailyTasks]    = useState<DailyTask[]>([]);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string; tutorName: string; subjectName: string;
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
          tutorName:   active.session.tutorName,
          subjectName: active.session.subjectName,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
      <motion.div custom={0} variants={fade} initial="initial" animate="animate">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">
              {greeting()}
            </p>
            <h1 className="text-white font-semibold text-xl tracking-tight flex items-center gap-2">
              {user?.username} 👋
              {streak.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-[11px] font-semibold text-orange-400">
                  <Flame size={10} />
                  {streak.currentStreak}d
                </span>
              )}
            </h1>
            <p className="text-white/40 text-sm mt-1">
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
        <motion.div custom={0.5} variants={fade} initial="initial" animate="animate">
          <button
            onClick={() => router.push(`/live-chat/${activeSession.sessionId}`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition hover:opacity-90"
            style={{
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.22)',
            }}
          >
            <div className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
              <MessageCircle size={16} className="text-emerald-400 relative" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 text-xs font-semibold">Ongoing Session</p>
              <p className="text-white/40 text-xs truncate">
                {activeSession.subjectName} · with {activeSession.tutorName}
              </p>
            </div>
            <ChevronRight size={14} className="text-emerald-400/50 flex-shrink-0" />
          </button>
        </motion.div>
      )}

      {/* ── Stat cards ── */}
      <motion.div custom={1} variants={fade} initial="initial" animate="animate"
        className="grid grid-cols-3 gap-3">
        <StatCard title="Upcoming"  value={loading ? undefined : upcoming.length}  icon={Calendar} accent="emerald" />
        <StatCard title="Completed" value={loading ? undefined : completed.length} icon={BookOpen} />
        <StatCard title="Unread"    value={loading ? undefined : unread}            icon={Bell}     accent={unread > 0 ? 'orange' : 'white'} />
      </motion.div>

      {/* ── Quick actions ── */}
      <motion.div custom={2} variants={fade} initial="initial" animate="animate"
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

      {/* ── Daily tasks ── */}
      {(loading || dailyTasks.length > 0) && (
        <motion.div custom={3} variants={fade} initial="initial" animate="animate">
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
                    : <Circle size={14} className="text-white/20 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${task.completed ? 'line-through text-white/30' : 'text-white/75'}`}>
                      {task.title}
                    </p>
                  </div>
                  {task.reward > 0 && (
                    <span className="text-[10px] text-orange-400/70 font-semibold flex-shrink-0">
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
      <motion.div custom={4} variants={fade} initial="initial" animate="animate">
        <DashboardSection title="Upcoming Sessions" icon={Calendar} onSeeAll={() => router.push('/sessions')}>
          {loading ? (
            <>{[0, 1].map(i => <div key={i} className="glass-soft rounded-2xl h-14 animate-pulse" />)}</>
          ) : upcoming.length === 0 ? (
            <div className="glass-soft rounded-2xl px-4 py-6 text-center">
              <p className="text-white/30 text-sm">No upcoming sessions</p>
              <button onClick={() => router.push('/browse')}
                className="mt-2 text-xs text-white/40 hover:text-white/60 underline underline-offset-2 transition">
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
        <motion.div custom={5} variants={fade} initial="initial" animate="animate">
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
      <motion.div custom={6} variants={fade} initial="initial" animate="animate">
        <DashboardSection title="Notifications" icon={Bell} onSeeAll={() => router.push('/notifications')}>
          {loading ? (
            <>{[0, 1, 2].map(i => <div key={i} className="glass-soft rounded-2xl h-12 animate-pulse" />)}</>
          ) : notifications.length === 0 ? (
            <div className="glass-soft rounded-2xl px-4 py-5 text-center">
              <p className="text-white/30 text-sm">You&apos;re all caught up</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="flex items-start gap-3 glass-soft rounded-2xl px-4 py-3">
                {!n.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/75 text-sm font-medium">{n.title}</p>
                  <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{n.body}</p>
                </div>
              </div>
            ))
          )}
        </DashboardSection>
      </motion.div>
    </div>
  );
}
