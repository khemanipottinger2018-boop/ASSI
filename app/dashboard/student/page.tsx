'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Cpu, Calendar, Bell, BookOpen } from 'lucide-react';

import DashboardSection   from '@/components/student/dashboard/DashboardSection';
import QuickActionButton  from '@/components/student/dashboard/QuickActionButton';
import RecentSessionRow   from '@/components/student/dashboard/RecentSessionRow';
import AvailableTutorCard from '@/components/student/dashboard/AvailableTutorCard';
import StatCard           from '@/components/student/dashboard/StatCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type Session = {
  sessionId: string; status: string; scheduledTime: string;
  durationMinutes: number; subjectName: string;
  partnerUsername: string; partnerAvatarUrl: string | null;
};
type Notification = { id: string; title: string; body: string; read: boolean };
type Tutor = {
  userId: string; username: string; avatarUrl: string | null;
  hourlyRate: number; isStudentTutor: boolean;
  subjects: { id: string; name: string; level: string }[];
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const router   = useRouter();

  const [sessions,      setSessions]      = useState<Session[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tutors,        setTutors]        = useState<Tutor[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/browse/my-sessions`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_URL}/api/notifications`,       { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_URL}/api/tutors/available`,    { credentials: 'include' }).then(r => r.json()),
    ]).then(([s, n, t]) => {
      if (s.success) setSessions(s.sessions ?? []);
      if (n.success) setNotifications((n.notifications ?? []).slice(0, 5));
      if (t.success) setTutors((t.tutors ?? []).slice(0, 4));
    }).finally(() => setLoading(false));
  }, []);

  const upcoming  = sessions.filter(s => ['scheduled', 'confirmed'].includes(s.status)).slice(0, 3);
  const completed = sessions.filter(s => s.status === 'completed');
  const unread    = notifications.filter(n => !n.read).length;

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-7">

      {/* Greeting */}
      <div>
        <h1 className="text-white font-semibold text-xl tracking-tight">
          {greeting}, {user?.username} 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">Here&apos;s what&apos;s on your plate today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Upcoming"  value={loading ? undefined : upcoming.length}  icon={Calendar} accent="emerald" />
        <StatCard title="Completed" value={loading ? undefined : completed.length} icon={BookOpen} />
        <StatCard title="Unread"    value={loading ? undefined : unread}            icon={Bell}     accent={unread > 0 ? 'orange' : 'white'} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionButton
          icon={Search} label="Find a Tutor" sub="Browse available tutors"
          onClick={() => router.push('/browse')} accent="emerald"
        />
        <QuickActionButton
          icon={Cpu} label="Ask ASSI" sub="AI study assistant"
          onClick={() => window.dispatchEvent(new Event('assi:open'))} accent="purple"
        />
      </div>

      {/* Upcoming sessions */}
      <DashboardSection title="Upcoming Sessions" icon={Calendar} onSeeAll={() => router.push('/sessions')}>
        {loading ? (
          <>{[0, 1].map(i => <div key={i} className="glass-soft rounded-2xl h-14 animate-pulse" />)}</>
        ) : upcoming.length === 0 ? (
          <div className="glass-soft rounded-2xl px-4 py-6 text-center">
            <p className="text-white/30 text-sm">No upcoming sessions</p>
            <button
              onClick={() => router.push('/browse')}
              className="mt-2 text-xs text-white/40 hover:text-white/60 underline underline-offset-2 transition"
            >
              Book one now
            </button>
          </div>
        ) : (
          upcoming.map(s => (
            <RecentSessionRow
              key={s.sessionId}
              sessionId={s.sessionId}
              subject={s.subjectName}
              partnerName={s.partnerUsername}
              scheduledTime={s.scheduledTime}
              durationMinutes={s.durationMinutes}
              status={s.status}
            />
          ))
        )}
      </DashboardSection>

      {/* Available tutors */}
      {(loading || tutors.length > 0) && (
        <DashboardSection title="Available Now" icon={Search} onSeeAll={() => router.push('/browse')}>
          {loading ? (
            <>{[0, 1].map(i => <div key={i} className="glass-soft rounded-2xl h-20 animate-pulse" />)}</>
          ) : (
            tutors.map(t => (
              <AvailableTutorCard
                key={t.userId}
                userId={t.userId}
                username={t.username}
                avatarUrl={t.avatarUrl}
                subjects={t.subjects}
                hourlyRate={t.hourlyRate}
                isStudentTutor={t.isStudentTutor}
              />
            ))
          )}
        </DashboardSection>
      )}

      {/* Notifications */}
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
              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-white/75 text-sm font-medium">{n.title}</p>
                <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{n.body}</p>
              </div>
            </div>
          ))
        )}
      </DashboardSection>
    </div>
  );
}