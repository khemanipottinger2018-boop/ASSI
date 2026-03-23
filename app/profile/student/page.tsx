'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useStreak } from '@/hooks/useStreak';
import {
  Mail, BookOpen, Calendar, Edit3, Flame,
  Star, Zap, Trophy, Clock, ChevronRight, Sparkles,
  TrendingUp, Award,
} from 'lucide-react';
import { userApi, browseApi } from '@/lib/api';
import type { UserMe } from '@/lib/api/user';
import type { SessionSummary } from '@/lib/api/browse';
import ProfileEditModal from '@/components/shared/ui/ProfileEditModal';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const MILESTONES = [
  { days: 7,   label: '1 Week',   icon: Zap,        reward: '+10 credits'       },
  { days: 30,  label: '1 Month',  icon: TrendingUp,  reward: '+50 credits'      },
  { days: 100, label: '100 Days', icon: Award,       reward: '+150 credits'     },
  { days: 365, label: '365 Days', icon: Star,        reward: 'ASSI+ for a year' },
];

const statusStyle: Record<string, { label: string; color: string }> = {
  active:          { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  in_progress:     { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  pending:         { label: 'Pending',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20'   },
  instant_pending: { label: 'Waiting',   color: 'text-blue-400 bg-blue-500/15 border-blue-500/20'         },
  confirmed:       { label: 'Confirmed', color: 'text-purple-400 bg-purple-500/15 border-purple-500/20'   },
  completed:       { label: 'Done',      color: 'text-white/30 bg-white/5 border-white/10'                },
  cancelled:       { label: 'Cancelled', color: 'text-red-400/60 bg-red-500/10 border-red-500/15'         },
};

function weekPips(streak: number): number {
  if (streak === 0) return 0;
  const mod = streak % 7;
  return mod === 0 ? 7 : mod;
}

function WeekPips({ streak }: { streak: number }) {
  const filled = weekPips(streak);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${i < filled ? 'w-5 bg-orange-400' : 'w-2 bg-white/10'}`} />
      ))}
    </div>
  );
}

export default function StudentProfilePage() {
  const { logout } = useAuth();
  const router     = useRouter();
  const { streak } = useStreak();

  const [profile,  setProfile]  = useState<UserMe | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);   // ← updated type
  const [loading,  setLoading]  = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  async function fetchAll() {
    try {
      const [me, sess] = await Promise.all([
        userApi.getMe(),
        browseApi.mySessions(),                                       // ← updated
      ]);
      if (me.success)   setProfile(me.user);
      if (sess.success) setSessions(sess.sessions ?? []);
    } catch {}
  }

  useEffect(() => { fetchAll().finally(() => setLoading(false)); }, []);

  if (loading) return <ProfileSkeleton />;

  const p         = profile;
  const completed = sessions.filter(s => s.status === 'completed');
  const upcoming  = sessions.filter(s =>
    ['pending', 'instant_pending', 'confirmed', 'in_progress', 'active'].includes(s.status)
  );
  const recent = sessions.slice(0, 4);

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const is365         = currentStreak >= 365;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* ── Hero ── */}
        <motion.div {...fade(0)} className="glass rounded-3xl overflow-hidden">
          <div className={`h-0.5 w-full ${
            is365             ? 'bg-gradient-to-r from-yellow-400 via-orange-300 to-yellow-400' :
            currentStreak > 0 ? 'bg-gradient-to-r from-orange-500/50 via-orange-400 to-orange-500/50' :
                                'bg-white/5'
          }`} />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center text-white/65 font-semibold text-2xl">
                    {p?.username?.[0]?.toUpperCase()}
                  </div>
                  {currentStreak >= 7 && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center">
                      <Flame size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-white font-semibold text-xl tracking-tight leading-none">{p?.username}</h1>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Mail size={11} className="text-white/28" />
                    <span className="text-white/32 text-xs">{p?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="glass-soft px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 border border-emerald-500/18 uppercase tracking-wide">
                      Student
                    </span>
                    {is365 && (
                      <span className="flex items-center gap-1 glass-soft px-2 py-0.5 rounded-full text-[10px] font-semibold text-yellow-400 border border-yellow-400/22">
                        <Star size={9} /> ASSI+
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowEdit(true)} className="glass-soft rounded-xl p-2.5 text-white/32 hover:text-white/65 transition flex-shrink-0">
                <Edit3 size={14} />
              </button>
            </div>
            {p?.createdAt && (
              <p className="mt-4 text-white/18 text-[11px] flex items-center gap-1.5 border-t border-white/5 pt-4">
                <Calendar size={10} />
                Member since {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div {...fade(0.06)} className="grid grid-cols-3 gap-3">
          <MiniStat icon={BookOpen} label="Completed" value={completed.length} accent="emerald" />
          <MiniStat icon={Calendar} label="Upcoming"  value={upcoming.length}  accent="purple"  />
          <MiniStat icon={Trophy}   label="Streak"    value={currentStreak}    accent="orange"
            suffix={currentStreak === 1 ? 'day' : 'days'} />
        </motion.div>

        {/* ── Streak ── */}
        {streak && (
          <motion.div {...fade(0.1)} className={`glass rounded-3xl p-5 border ${
            is365             ? 'border-yellow-400/18' :
            currentStreak > 0 ? 'border-orange-400/12' :
                                'border-white/5'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {is365
                  ? <Star size={14} className="text-yellow-400" />
                  : <Flame size={14} className={currentStreak > 0 ? 'text-orange-400' : 'text-white/22'} />
                }
                <span className="text-white/42 text-xs font-medium uppercase tracking-widest">Login streak</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-2xl font-bold ${is365 ? 'text-yellow-400' : currentStreak > 0 ? 'text-orange-400' : 'text-white/28'}`}>
                  {currentStreak}
                </span>
                <span className="text-white/22 text-xs">days</span>
                {longestStreak > currentStreak && longestStreak > 0 && (
                  <span className="text-white/15 text-[10px] ml-1">best {longestStreak}</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <WeekPips streak={currentStreak} />
              <p className="text-white/22 text-[10px]">{weekPips(currentStreak)} of 7 days this week</p>
            </div>

            <div className="space-y-1.5">
              {MILESTONES.map(m => {
                const reached  = currentStreak >= m.days;
                const progress = Math.min(currentStreak / m.days, 1);
                const MIcon    = m.icon;
                return (
                  <div key={m.days} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${reached ? 'bg-orange-400/6 border border-orange-400/12' : 'bg-white/2'}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${reached ? 'bg-orange-400/15' : 'bg-white/5'}`}>
                      <MIcon size={12} className={reached ? (m.days === 365 ? 'text-yellow-400' : 'text-orange-400') : 'text-white/20'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${reached ? 'text-white/65' : 'text-white/28'}`}>{m.label}</span>
                        <span className={`text-[10px] ${reached ? 'text-orange-400' : 'text-white/18'}`}>
                          {reached ? m.reward : `${m.days - currentStreak}d to go`}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${reached ? (m.days === 365 ? 'bg-gradient-to-r from-orange-400 to-yellow-400' : 'bg-orange-400') : 'bg-orange-400/35'}`}
                          style={{ width: `${progress * 100}%` }} />
                      </div>
                    </div>
                    {reached && (
                      <div className="w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Recent sessions ── */}
        <motion.div {...fade(0.14)}>
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-white/28" />
              <span className="text-white/38 text-[10px] font-medium uppercase tracking-widest">Recent sessions</span>
            </div>
            <button onClick={() => router.push('/sessions')} className="flex items-center gap-0.5 text-white/28 hover:text-white/55 text-xs transition">
              See all <ChevronRight size={11} />
            </button>
          </div>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <div className="glass-soft rounded-2xl px-4 py-6 text-center">
                <p className="text-white/22 text-sm">No sessions yet</p>
                <button onClick={() => router.push('/browse')} className="mt-2 text-xs text-white/32 hover:text-white/55 underline underline-offset-2 transition">
                  Find a tutor
                </button>
              </div>
            ) : (
              recent.map(s => {
                const style = statusStyle[s.status] ?? statusStyle.completed;
                return (
                  <div key={s.sessionId} className="glass-soft rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl glass-soft flex items-center justify-center overflow-hidden flex-shrink-0">
                      {s.partnerAvatarUrl
                        ? <img src={s.partnerAvatarUrl} alt={s.partnerUsername} className="w-full h-full object-cover" />
                        : <BookOpen size={13} className="text-white/35" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-sm font-medium truncate">{s.subjectName ?? 'Session'}</p>
                      <p className="text-white/28 text-xs mt-0.5">
                        with {s.partnerUsername}
                        {s.scheduledAt && <span> · {new Date(s.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* ── Account ── */}
        <motion.div {...fade(0.18)} className="glass rounded-3xl p-4 space-y-1">
          <p className="text-white/22 text-[10px] font-medium uppercase tracking-widest px-2 pb-2">Account</p>
          <ActionRow label="Edit profile" icon={Edit3}    onClick={() => setShowEdit(true)} />
          <ActionRow label="Settings"     icon={Sparkles} onClick={() => router.push('/settings')} />
          <ActionRow label="Sign out" onClick={async () => { await logout(); router.push('/signin'); }} destructive />
        </motion.div>
      </div>

      {showEdit && profile && (
        <ProfileEditModal
          profile={{ id: profile.id, username: profile.username, role: profile.role, tutorBio: null, hourlyRate: null, tutor: null }}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); fetchAll(); }}
        />
      )}
    </>
  );
}

function MiniStat({ icon: Icon, label, value, accent = 'white', suffix }: {
  icon: React.ElementType; label: string; value: number;
  accent?: 'white' | 'emerald' | 'orange' | 'purple'; suffix?: string;
}) {
  const colors = { white: 'text-white/55', emerald: 'text-emerald-400', orange: 'text-orange-400', purple: 'text-purple-400' };
  return (
    <div className="glass-soft rounded-2xl px-3 py-3.5 flex flex-col gap-1.5">
      <Icon size={13} className="text-white/22" />
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-semibold leading-none ${colors[accent]}`}>{value}</span>
        {suffix && <span className="text-white/22 text-[10px]">{suffix}</span>}
      </div>
      <p className="text-white/22 text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ActionRow({ label, onClick, destructive, icon: Icon }: {
  label: string; onClick: () => void; destructive?: boolean; icon?: React.ElementType;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-2 py-2.5 rounded-xl text-sm transition hover:bg-white/5 ${destructive ? 'text-red-400/65 hover:text-red-400' : 'text-white/48 hover:text-white/75'}`}>
      {Icon && <Icon size={13} className="text-white/22" />}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-white/18">›</span>
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="glass rounded-3xl h-36" />
      <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <div key={i} className="glass-soft rounded-2xl h-20" />)}</div>
      <div className="glass rounded-3xl h-64" />
      <div className="glass rounded-3xl h-36" />
    </div>
  );
}