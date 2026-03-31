'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth';
import { useRouter } from 'next/navigation';
import { Shield, Users, AlertTriangle, BarChart2 } from 'lucide-react';
import { userApi } from '@/lib/api';
import type { UserMe } from '@/lib/api/user';

export default function AdminProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();

  const [profile,  setProfile]  = useState<UserMe | null>(null);
  const [loading,  setLoading]  = useState(true);

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

      {/* ── Header card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center flex-shrink-0 text-white/60 font-semibold text-xl">
            {p?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-semibold text-lg tracking-tight">{p?.username}</h1>
              <span className="bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 rounded-full text-[10px] font-semibold text-orange-400 uppercase tracking-wide">
                Admin
              </span>
            </div>
            <p className="text-white/40 text-xs mt-0.5">{p?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Admin actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-4 space-y-1"
      >
        <p className="text-white/25 text-xs font-medium uppercase tracking-widest px-2 pb-2">Admin</p>
        <AdminAction icon={Users}         label="Manage users"       onClick={() => router.push('/admin/users')} />
        <AdminAction icon={Shield}        label="Tutor applications" onClick={() => router.push('/admin/tutor-applications')} />
        <AdminAction icon={AlertTriangle} label="Support tickets"    onClick={() => router.push('/admin/support')} />
        <AdminAction icon={BarChart2}     label="System metrics"     onClick={() => router.push('/admin/metrics')} />
      </motion.div>

      {/* ── Account actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-4 space-y-1"
      >
        <p className="text-white/25 text-xs font-medium uppercase tracking-widest px-2 pb-2">Account</p>
        <ActionRow label="Settings" onClick={() => router.push('/settings')} />
        <ActionRow label="Sign out" onClick={handleLogout} destructive />
      </motion.div>
    </div>
  );
}

function AdminAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm text-white/55 hover:text-white/80 hover:bg-white/6 transition"
    >
      <div className="glass-soft w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={13} className="text-white/40" />
      </div>
      {label}
      <span className="ml-auto text-white/20">›</span>
    </button>
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
      <div className="glass rounded-3xl p-6 h-28" />
      <div className="glass rounded-3xl p-4 h-48" />
      <div className="glass rounded-3xl p-4 h-24" />
    </div>
  );
}