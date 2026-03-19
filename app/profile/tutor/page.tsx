'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Star, BookOpen, DollarSign, Edit3 } from 'lucide-react';
import { userApi } from '@/lib/api';
import type { UserProfileView } from '@/components/types/profile.view';

export default function TutorProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getMe()
      .then((d) => { if (d.success) setProfile(d.user); })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  if (loading) return <ProfileSkeleton />;

  const p = profile;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center overflow-hidden flex-shrink-0">
                {p?.avatarUrl
                  ? <img src={p.avatarUrl} alt={p.username} className="w-full h-full object-cover" />
                  : <User size={24} className="text-white/40" />
                }
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
            </div>
          </div>

          <button
            onClick={() => router.push('/profile/tutor/edit')}
            className="glass-soft rounded-xl p-2.5 text-white/40 hover:text-white/70 transition"
          >
            <Edit3 size={15} />
          </button>
        </div>

        {p?.bio && (
          <p className="mt-4 text-white/55 text-sm leading-relaxed border-t border-white/8 pt-4">
            {p.bio}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-3 gap-3"
      >
        <StatCard icon={DollarSign} label="Hourly rate" value={p?.hourlyRate ? `$${p.hourlyRate}` : '—'} />
        <StatCard icon={BookOpen}   label="Sessions"    value="—" />
        <StatCard icon={Star}       label="Rating"      value="—" />
      </motion.div>

      {p?.subjects && p.subjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl p-4"
        >
          <p className="text-white/25 text-xs font-medium uppercase tracking-widest mb-3">Subjects</p>
          <div className="flex flex-wrap gap-2">
            {p.subjects.map((s) => (
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
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-4 space-y-1"
      >
        <p className="text-white/25 text-xs font-medium uppercase tracking-widest px-2 pb-2">Account</p>
        <ActionRow label="Edit profile"    onClick={() => router.push('/profile/tutor/edit')} />
        <ActionRow label="Manage subjects" onClick={() => router.push('/profile/tutor/subjects')} />
        <ActionRow label="Availability"    onClick={() => router.push('/profile/tutor/availability')} />
        <ActionRow label="Settings"        onClick={() => router.push('/settings')} />
        <ActionRow label="Sign out"        onClick={handleLogout} destructive />
      </motion.div>
    </div>
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