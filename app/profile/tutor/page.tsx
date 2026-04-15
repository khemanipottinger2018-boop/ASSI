'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth';
import { useRouter } from 'next/navigation';
import {
  Star, BookOpen, DollarSign, Edit3, Clock,
  Users, TrendingUp, ChevronRight, ExternalLink, Sparkles,
} from 'lucide-react';
import { userApi, tutorsApi, browseApi } from '@/lib/api';
import { useCurrency } from '@/features/platform';
import type { UserMe } from '@/lib/api/user';
import type { SubjectSummary } from '@/lib/api/tutors';
import type { SessionSummary } from '@/lib/api/browse';
import ProfileEditModal    from '@/features/ui/ProfileEditModal';
import ManageSubjectsModal from '@/features/ui/ManageSubjectsModal';
import AvailabilityModal   from '@/features/presence/AvailabilityModal';

type Modal = 'edit' | 'subjects' | 'availability' | null;

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const statusStyle: Record<string, { label: string; color: string }> = {
  active:          { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  in_progress:     { label: 'Live',      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' },
  pending:         { label: 'Pending',   color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20'   },
  instant_pending: { label: 'Waiting',  color: 'text-blue-400 bg-blue-500/15 border-blue-500/20'          },
  confirmed:       { label: 'Confirmed', color: 'text-purple-400 bg-purple-500/15 border-purple-500/20'   },
  completed:       { label: 'Done',      color: 'text-white/30 bg-white/5 border-white/10'                },
  cancelled:       { label: 'Cancelled', color: 'text-red-400/60 bg-red-500/10 border-red-500/15'         },
};

export default function TutorProfilePage() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const { format }       = useCurrency();

  const [profile,  setProfile]  = useState<UserMe | null>(null);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<Modal>(null);

  async function fetchAll() {
    if (!user?.username) return;
    try {
      const [meData, publicData, sessData] = await Promise.all([
        userApi.getMe(),
        tutorsApi.getPublicProfile(user.username),
        browseApi.mySessions(),                           // ← updated
      ]);
      if (meData.success)     setProfile(meData.user);
      if (publicData.success) setSubjects(publicData.user.subjects ?? []);
      if (sessData.success)   setSessions(sessData.sessions ?? []);
    } catch {}
  }

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [user?.username]);

  if (loading) return <ProfileSkeleton />;

  const p         = profile;
  const bio       = p?.tutor?.bio        ?? null;
  const timezone  = p?.tutor?.timezone   ?? null;
  const rate      = p?.tutor?.hourlyRate ?? null;

  const completed = sessions.filter(s => s.status === 'completed');
  const upcoming  = sessions.filter(s =>
    ['pending', 'instant_pending', 'confirmed', 'in_progress', 'active'].includes(s.status)
  );
  const recent = sessions.slice(0, 4);

  // Estimated earnings — completed × rate × duration (80% platform cut assumed)
  const estimatedEarnings = rate && completed.length
    ? completed.reduce((acc, s) => acc + ((s.durationMinutes ?? 60) / 60) * rate * 0.8, 0)
    : null;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* ── Hero card ── */}
        <motion.div {...fade(0)} className="panel rounded-3xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-teal-500/50 via-emerald-400 to-teal-500/50" />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center text-white/70 font-semibold text-2xl">
                    {p?.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black/30 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-white font-semibold text-xl tracking-tight leading-none">
                      {p?.username}
                    </h1>
                    <span className="glass-soft px-2 py-0.5 rounded-full text-[10px] font-semibold text-teal-400 border border-teal-500/20 uppercase tracking-wide">
                      Tutor
                    </span>
                  </div>
                  <p className="text-white/35 text-xs mt-1.5">{p?.email}</p>
                  {timezone && (
                    <p className="text-white/20 text-xs mt-1 flex items-center gap-1">
                      <Clock size={10} /> {timezone}
                    </p>
                  )}
                  <button
                    onClick={() => router.push(`/u/${p?.username}`)}
                    className="flex items-center gap-1 mt-2 text-white/25 hover:text-white/55 text-[11px] transition"
                  >
                    <ExternalLink size={10} /> View public profile
                  </button>
                </div>
              </div>
              <button
                onClick={() => setModal('edit')}
                className="glass-soft rounded-xl p-2.5 text-white/35 hover:text-white/70 transition flex-shrink-0"
              >
                <Edit3 size={15} />
              </button>
            </div>

            {bio ? (
              <p className="mt-4 text-white/50 text-sm leading-relaxed border-t border-white/6 pt-4">
                {bio}
              </p>
            ) : (
              <button
                onClick={() => setModal('edit')}
                className="mt-4 pt-4 border-t border-white/6 w-full text-left text-white/25 text-xs hover:text-white/45 transition"
              >
                + Add a bio to your profile
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div {...fade(0.06)} className="grid grid-cols-4 gap-2">
          <MiniStat
            icon={DollarSign} label="Rate"
            value={rate != null ? format(rate, { short: true }) : '—'}
            accent="emerald"
          />
          <MiniStat icon={BookOpen}    label="Sessions" value={String(completed.length)} accent="white"  />
          <MiniStat icon={Users}       label="Upcoming" value={String(upcoming.length)}  accent="purple" />
          <MiniStat
            icon={TrendingUp} label="Earned"
            value={estimatedEarnings != null ? format(estimatedEarnings, { short: true }) : '—'}
            accent="orange"
          />
        </motion.div>

        {/* ── Subjects ── */}
        <motion.div {...fade(0.1)} className="panel rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-white/30" />
              <span className="text-white/40 text-xs font-medium uppercase tracking-widest">Subjects</span>
            </div>
            <button onClick={() => setModal('subjects')} className="text-white/30 hover:text-white/60 text-xs transition">
              {subjects.length > 0 ? 'Edit' : '+ Add subjects'}
            </button>
          </div>
          {subjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <span key={s.id} className={`
                  px-2.5 py-1 rounded-full text-xs font-medium border
                  ${s.category === 'CAPE'
                    ? 'bg-purple-500/15 border-purple-500/25 text-purple-300'
                    : 'bg-teal-500/15 border-teal-500/25 text-teal-300'
                  }
                `}>
                  {s.name}
                  <span className="ml-1.5 opacity-40 text-[10px]">{s.category}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/20 text-xs">No subjects added yet</p>
              <button onClick={() => setModal('subjects')} className="mt-2 text-orange-400/60 hover:text-orange-400 text-xs underline underline-offset-2 transition">
                Add subjects to appear in search
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Recent sessions ── */}
        <motion.div {...fade(0.14)}>
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-white/30" />
              <span className="text-white/40 text-xs font-medium uppercase tracking-widest">Recent sessions</span>
            </div>
            <button onClick={() => router.push('/sessions')} className="flex items-center gap-0.5 text-white/30 hover:text-white/60 text-xs transition">
              See all <ChevronRight size={11} />
            </button>
          </div>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <div className="glass-soft rounded-2xl px-4 py-6 text-center">
                <p className="text-white/25 text-sm">No sessions yet</p>
              </div>
            ) : (
              recent.map(s => {
                const style = statusStyle[s.status] ?? statusStyle.completed;
                return (
                  <div key={s.sessionId} className="glass-soft rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl glass-soft flex items-center justify-center flex-shrink-0">
                      {s.partnerAvatarUrl
                        ? <img src={s.partnerAvatarUrl} alt={s.partnerUsername} className="w-full h-full object-cover rounded-xl" />
                        : <BookOpen size={13} className="text-white/40" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/75 text-sm font-medium truncate">{s.subjectName ?? 'Session'}</p>
                      <p className="text-white/30 text-xs mt-0.5">
                        with {s.partnerUsername}
                        {s.scheduledAt && <span> · {new Date(s.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        {s.durationMinutes && <span> · {s.durationMinutes}m</span>}
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

        {/* ── Account actions ── */}
        <motion.div {...fade(0.18)} className="panel rounded-3xl p-4 space-y-1">
          <p className="text-white/25 text-xs font-medium uppercase tracking-widest px-2 pb-2">Account</p>
          <ActionRow label="Edit profile"    icon={Edit3}    onClick={() => setModal('edit')} />
          <ActionRow label="Manage subjects" icon={BookOpen}  onClick={() => setModal('subjects')} />
          <ActionRow label="Availability"    icon={Clock}     onClick={() => setModal('availability')} />
          <ActionRow label="Settings"        icon={Sparkles}  onClick={() => router.push('/settings')} />
          <ActionRow label="Sign out" onClick={async () => { await logout(); router.push('/signin'); }} destructive />
        </motion.div>

      </div>

      {modal === 'edit' && profile && (
        <ProfileEditModal
          profile={{
            id: profile.id, username: profile.username, role: profile.role,
            tutorBio: profile.tutor?.bio ?? null, hourlyRate: profile.tutor?.hourlyRate ?? null,
            tutor: profile.tutor ?? null,
          }}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAll(); }}
        />
      )}
      {modal === 'subjects' && (
        <ManageSubjectsModal onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchAll(); }} />
      )}
      {modal === 'availability' && (
        <AvailabilityModal onClose={() => setModal(null)} />
      )}
    </>
  );
}

function MiniStat({ icon: Icon, label, value, accent = 'white' }: {
  icon: React.ElementType; label: string; value: string; accent?: 'white' | 'emerald' | 'orange' | 'purple';
}) {
  const colors = { white: 'text-white/60', emerald: 'text-emerald-400', orange: 'text-orange-400', purple: 'text-purple-400' };
  return (
    <div className="glass-soft rounded-2xl px-3 py-3 flex flex-col gap-1.5">
      <Icon size={13} className="text-white/25" />
      <div className={`text-base font-semibold leading-none ${colors[accent]}`}>{value}</div>
      <p className="text-white/25 text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ActionRow({ label, onClick, destructive, icon: Icon }: {
  label: string; onClick: () => void; destructive?: boolean; icon?: React.ElementType;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-2 py-2.5 rounded-xl text-sm transition hover:bg-white/6 ${destructive ? 'text-red-400/70 hover:text-red-400' : 'text-white/50 hover:text-white/80'}`}>
      {Icon && <Icon size={14} className="text-white/25" />}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-white/20">›</span>
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="surface rounded-3xl h-40" />
      <div className="grid grid-cols-4 gap-2">{[0,1,2,3].map(i => <div key={i} className="glass-soft rounded-2xl h-20" />)}</div>
      <div className="surface rounded-3xl h-32" />
      <div className="surface rounded-3xl h-40" />
      <div className="surface rounded-3xl h-40" />
    </div>
  );
}