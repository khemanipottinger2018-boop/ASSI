'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Star, BookOpen, DollarSign, Edit3, Clock } from 'lucide-react';
import { userApi, tutorsApi } from '@/lib/api';
import type { UserMe } from '@/lib/api/user';
import type { SubjectSummary } from '@/lib/api/tutors';
import ProfileEditModal    from '@/components/shared/ui/ProfileEditModal';
import ManageSubjectsModal from '@/components/shared/ui/ManageSubjectsModal';
import AvailabilityModal   from '@/components/shared/ui/AvailabilityModal';

type Modal = 'edit' | 'subjects' | 'availability' | null;

export default function TutorProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [profile,  setProfile]  = useState<UserMe | null>(null);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<Modal>(null);

  async function fetchProfile() {
    if (!user?.username) return;
    try {
      const [meData, publicData] = await Promise.all([
        userApi.getMe(),
        tutorsApi.getPublicProfile(user.username),
      ]);
      if (meData.success)     setProfile(meData.user);
      if (publicData.success) setSubjects(publicData.user.subjects ?? []);
    } catch {}
  }

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, [user?.username]);

  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  if (loading) return <ProfileSkeleton />;

  const p        = profile;
  const bio      = p?.tutor?.bio      ?? null;
  const timezone = p?.tutor?.timezone ?? null;
  const rate     = p?.tutor?.hourlyRate;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* ── Header card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center flex-shrink-0 text-white/60 font-semibold text-xl">
                  {p?.username?.[0]?.toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black/30 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-semibold text-lg tracking-tight">{p?.username}</h1>
                  <span className="glass-soft px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    Tutor
                  </span>
                </div>
                <p className="text-white/40 text-xs mt-0.5">{p?.email}</p>
                {timezone && (
                  <p className="text-white/25 text-xs mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> {timezone}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setModal('edit')}
              className="glass-soft rounded-xl p-2.5 text-white/40 hover:text-white/70 transition"
            >
              <Edit3 size={15} />
            </button>
          </div>
          {bio && (
            <p className="mt-4 text-white/55 text-sm leading-relaxed border-t border-white/8 pt-4">
              {bio}
            </p>
          )}
        </motion.div>

        {/* ── Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-3 gap-3"
        >
          <StatCard icon={DollarSign} label="Hourly rate" value={rate != null ? `$${rate}` : '—'} />
          <StatCard icon={BookOpen}   label="Sessions"    value="—" />
          <StatCard icon={Star}       label="Rating"      value="—" />
        </motion.div>

        {/* ── Subjects ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/25 text-xs font-medium uppercase tracking-widest">Subjects</p>
            <button
              onClick={() => setModal('subjects')}
              className="text-white/30 hover:text-white/60 text-xs transition"
            >
              {subjects.length > 0 ? 'Edit' : '+ Add subjects'}
            </button>
          </div>
          {subjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span key={s.id} className={`
                  px-2.5 py-1 rounded-full text-xs font-medium border
                  ${s.category === 'CAPE'
                    ? 'bg-purple-500/15 border-purple-500/25 text-purple-300'
                    : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                  }
                `}>
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-white/20 text-xs">No subjects added yet</p>
          )}
        </motion.div>

        {/* ── Account actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl p-4 space-y-1"
        >
          <p className="text-white/25 text-xs font-medium uppercase tracking-widest px-2 pb-2">Account</p>
          <ActionRow label="Edit profile"    onClick={() => setModal('edit')} />
          <ActionRow label="Manage subjects" onClick={() => setModal('subjects')} />
          <ActionRow label="Availability"    onClick={() => setModal('availability')} />
          <ActionRow label="Settings"        onClick={() => router.push('/settings')} />
          <ActionRow label="Sign out"        onClick={handleLogout} destructive />
        </motion.div>
      </div>

      {/* ── Modals ── */}
      {modal === 'edit' && profile && (
        <ProfileEditModal
          profile={{
            id:         profile.id,
            username:   profile.username,
            role:       profile.role,
            tutorBio:   profile.tutor?.bio       ?? null,
            hourlyRate: profile.tutor?.hourlyRate ?? null,
            tutor:      profile.tutor ?? null,
          }}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchProfile(); }}
        />
      )}

      {modal === 'subjects' && (
        <ManageSubjectsModal
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchProfile(); }}
        />
      )}

      {modal === 'availability' && (
        <AvailabilityModal
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass-soft rounded-2xl px-3 py-3 flex flex-col gap-1.5">
      <Icon size={13} className="text-white/35" />
      <div className="text-white font-medium text-sm">{value}</div>
      <div className="text-white/30 text-[10px]">{label}</div>
    </div>
  );
}

function ActionRow({ label, onClick, destructive }: { label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-2.5 rounded-xl text-sm transition hover:bg-white/6 ${
        destructive ? 'text-red-400/70 hover:text-red-400' : 'text-white/55 hover:text-white/80'
      }`}
    >
      {label}
      <span className="text-white/20">›</span>
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="glass rounded-3xl p-6 h-32" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map(i => <div key={i} className="glass-soft rounded-2xl h-20" />)}
      </div>
      <div className="glass rounded-3xl p-4 h-24" />
      <div className="glass rounded-3xl p-4 h-40" />
    </div>
  );
}