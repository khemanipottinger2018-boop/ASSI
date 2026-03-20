'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, MessageCircle, BarChart2, ClipboardList,
  AlertTriangle, ShieldCheck, TrendingUp, Loader2,
  RefreshCw, ArrowRight, Wifi, Clock,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

type Metrics = {
  totalUsers:     number;
  totalTutors:    number;
  totalStudents:  number;
  totalSessions:  number;
  activeSessions: number;
  onlineUsers:    number;
};

type RecentError = {
  id:         string;
  severity:   string;
  error_message: string;
  endpoint:   string | null;
  created_at: string;
};

type PendingApp = {
  id:     string;
  status: string;
  user:   { username: string };
};

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function AdminDashboard() {
  const router = useRouter();

  const [metrics,      setMetrics]      = useState<Metrics | null>(null);
  const [errors,       setErrors]       = useState<RecentError[]>([]);
  const [pendingApps,  setPendingApps]  = useState<PendingApp[]>([]);
  const [activeSess,   setActiveSess]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [lastSync,     setLastSync]     = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, errorsRes, appsRes, sessRes] = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getErrors(),
        adminApi.getApplications(),
        adminApi.getLiveSessions(),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value.success) {
        setMetrics((metricsRes.value as any).metrics);
      }
      if (errorsRes.status === 'fulfilled' && errorsRes.value.success) {
        setErrors(((errorsRes.value as any).errors ?? []).slice(0, 5));
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.success) {
        const all = (appsRes.value as any).applications ?? [];
        setPendingApps(all.filter((a: PendingApp) => a.status === 'pending').slice(0, 5));
      }
      if (sessRes.status === 'fulfilled' && sessRes.value.success) {
        const sess = (sessRes.value as any).sessions ?? [];
        setActiveSess(sess.filter((s: any) => s.status === 'active').length);
      }
    } catch { /* silent */ }
    finally { setLoading(false); setLastSync(new Date()); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = metrics ? [
    { icon: Users,         label: 'Total Users',    value: metrics.totalUsers,      accent: 'text-white/80',      bg: 'bg-white/5'           },
    { icon: Users,         label: 'Tutors',          value: metrics.totalTutors,     accent: 'text-orange-400',    bg: 'bg-orange-500/8'      },
    { icon: Users,         label: 'Students',        value: metrics.totalStudents,   accent: 'text-purple-400',    bg: 'bg-purple-500/8'      },
    { icon: Wifi,          label: 'Online Now',      value: metrics.onlineUsers,     accent: 'text-emerald-400',   bg: 'bg-emerald-500/8'     },
    { icon: MessageCircle, label: 'Active Sessions', value: activeSess,              accent: 'text-blue-400',      bg: 'bg-blue-500/8'        },
    { icon: BarChart2,     label: 'Total Sessions',  value: metrics.totalSessions,   accent: 'text-white/60',      bg: 'bg-white/5'           },
  ] : [];

  const navCards = [
    {
      icon: Users,
      label: 'Users',
      desc: 'Manage accounts, roles & suspensions',
      href: '/admin/users',
      accent: 'border-blue-500/20 hover:border-blue-500/40',
      iconColor: 'text-blue-400',
    },
    {
      icon: MessageCircle,
      label: 'Live Sessions',
      desc: 'Monitor & force-end active sessions',
      href: '/admin/sessions',
      accent: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconColor: 'text-emerald-400',
      badge: activeSess > 0 ? `${activeSess} active` : null,
      badgeColor: 'bg-emerald-500/15 text-emerald-400',
    },
    {
      icon: ClipboardList,
      label: 'Tutor Applications',
      desc: 'Review and approve applicants',
      href: '/admin/tutor-applications',
      accent: 'border-purple-500/20 hover:border-purple-500/40',
      iconColor: 'text-purple-400',
      badge: pendingApps.length > 0 ? `${pendingApps.length} pending` : null,
      badgeColor: 'bg-purple-500/15 text-purple-400',
    },
    {
      icon: BarChart2,
      label: 'Metrics',
      desc: 'Platform-wide stats and usage data',
      href: '/admin/metrics',
      accent: 'border-orange-500/20 hover:border-orange-500/40',
      iconColor: 'text-orange-400',
    },
    {
      icon: AlertTriangle,
      label: 'Error Logs',
      desc: 'View and diagnose backend errors',
      href: '/admin/errors',
      accent: errors.length > 0 ? 'border-red-500/25 hover:border-red-500/45' : 'border-white/10 hover:border-white/20',
      iconColor: errors.length > 0 ? 'text-red-400' : 'text-white/40',
      badge: errors.length > 0 ? `${errors.length} in 24h` : null,
      badgeColor: 'bg-red-500/15 text-red-400',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
      <motion.div custom={0} variants={fade} initial="initial" animate="animate"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
            <ShieldCheck size={16} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight">Admin Dashboard</h1>
            <p className="text-white/30 text-xs">
              ASSI Platform · {lastSync.toLocaleTimeString('en-US', { hour12: false })}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="glass-soft p-2 rounded-lg text-white/30 hover:text-white/60 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* ── Stat grid ── */}
      {loading && !metrics ? (
        <div className="flex justify-center py-10">
          <Loader2 size={18} className="text-white/30 animate-spin" />
        </div>
      ) : (
        <motion.div custom={1} variants={fade} initial="initial" animate="animate"
          className="grid grid-cols-3 gap-3"
        >
          {stats.map((s) => (
            <div key={s.label} className={`panel rounded-2xl px-4 py-4 ${s.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={12} className="text-white/25" />
                <p className="text-white/30 text-[11px]">{s.label}</p>
              </div>
              <p className={`text-2xl font-semibold ${s.accent}`}>
                {s.value?.toLocaleString() ?? '—'}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Nav cards ── */}
      <motion.div custom={2} variants={fade} initial="initial" animate="animate"
        className="space-y-2"
      >
        <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest px-1 mb-3">
          Sections
        </p>
        {navCards.map((card) => (
          <button key={card.href} onClick={() => router.push(card.href)}
            className={`w-full panel rounded-2xl p-4 flex items-center gap-4 border transition-all group ${card.accent}`}
          >
            <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
              <card.icon size={15} className={card.iconColor} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white/80 text-sm font-medium">{card.label}</p>
                {card.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-white/30 text-xs mt-0.5">{card.desc}</p>
            </div>
            <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 transition flex-shrink-0" />
          </button>
        ))}
      </motion.div>

      {/* ── Recent errors preview ── */}
      {!loading && errors.length > 0 && (
        <motion.div custom={3} variants={fade} initial="initial" animate="animate"
          className="space-y-2"
        >
          <div className="flex items-center justify-between px-1">
            <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest">
              Recent Errors (24h)
            </p>
            <button onClick={() => router.push('/admin/errors')}
              className="text-white/25 text-[10px] hover:text-white/50 transition">
              View all →
            </button>
          </div>
          {errors.map((err) => (
            <div key={err.id} className="panel rounded-xl px-4 py-3 flex items-start gap-3 border border-red-500/10">
              <AlertTriangle size={12} className="text-red-400/60 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-xs font-mono truncate">{err.error_message}</p>
                <div className="flex items-center gap-3 mt-0.5 text-white/20 text-[10px]">
                  {err.endpoint && <span>{err.endpoint}</span>}
                  <span className="flex items-center gap-1">
                    <Clock size={8} />
                    {new Date(err.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Pending applications preview ── */}
      {!loading && pendingApps.length > 0 && (
        <motion.div custom={4} variants={fade} initial="initial" animate="animate"
          className="space-y-2"
        >
          <div className="flex items-center justify-between px-1">
            <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest">
              Pending Applications
            </p>
            <button onClick={() => router.push('/admin/tutor-applications')}
              className="text-white/25 text-[10px] hover:text-white/50 transition">
              Review all →
            </button>
          </div>
          {pendingApps.map((app) => (
            <div key={app.id} className="panel rounded-xl px-4 py-3 flex items-center gap-3 border border-purple-500/15">
              <div className="w-7 h-7 rounded-lg glass-soft flex items-center justify-center flex-shrink-0">
                <span className="text-white/40 text-xs font-semibold">
                  {app.user.username[0]?.toUpperCase()}
                </span>
              </div>
              <p className="text-white/60 text-sm flex-1">{app.user.username}</p>
              <span className="text-purple-400/70 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                PENDING
              </span>
            </div>
          ))}
        </motion.div>
      )}

    </div>
  );
}