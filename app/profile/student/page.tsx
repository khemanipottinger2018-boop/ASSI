'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, BookOpen, Calendar, Edit3 } from 'lucide-react';
import { userApi } from '@/lib/api';
import type { UserMe } from '@/lib/api/user';

export default function StudentProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();

  const [profile,  setProfile]  = useState<UserMe | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // /api/user/me returns: id, username, email, role, tier, createdAt, tutor (null for students)
    // Students have no bio, timezone, or subjects on this endpoint
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
              {/* No avatarUrl — backend never returns it, always use initials */}
              <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center flex-shrink-0 text-white/60 font-semibold text-xl">
                {p?.username?.[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase tracking-wide">
                Student
              </span>
            </div>

            <div>
              <h1 className="text-white font-semibold text-lg tracking-tight">{p?.username}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail size={11} className="text-white/35" />
                <span className="text-white/40 text-xs">{p?.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/profile/student/edit')}
            className="glass-soft rounded-xl p-2.5 text-white/40 hover:text-white/70 transition"
          >
            <Edit3 size={15} />
          </button>
        </div>
        {/* Note: students have no bio on /api/user/me
            Bio editing for students is not yet supported by the backend.
            Add here if/when a student bio field is added to UserProfile. */}
      </motion.div>

      {/* ── Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-2 gap-3"
      >
        <StatCard icon={BookOpen} label="Sessions" value="—" />
        <StatCard icon={Calendar} label="Member since" value={
          p?.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : '—'
        } />
      </motion.div>

      {/* ── Account actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-4 space-y-1"
      >
        <p className="text-white/25 text-xs font-medium uppercase tracking-widest px-2 pb-2">Account</p>
        <ActionRow label="Edit profile" onClick={() => router.push('/profile/student/edit')} />
        <ActionRow label="Settings"     onClick={() => router.push('/settings')} />
        <ActionRow label="Sign out"     onClick={handleLogout} destructive />
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass-soft rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <div className="glass-soft w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-white/50" />
      </div>
      <div>
        <div className="text-white font-medium text-sm">{value}</div>
        <div className="text-white/35 text-[11px]">{label}</div>
      </div>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-soft rounded-2xl h-16" />
        <div className="glass-soft rounded-2xl h-16" />
      </div>
      <div className="glass rounded-3xl p-4 h-40" />
    </div>
  );
}