'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Users, MessageCircle, Clock, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/api';

type Metrics = {
  totalUsers: number;
  totalTutors: number;
  totalStudents: number;
  totalSessions: number;
  activeSessions: number;
  onlineUsers: number;
};

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getMetrics();
      if (data.success) setMetrics((data as any).metrics);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const stats = metrics ? [
    { icon: Users,         label: 'Total Users',       value: metrics.totalUsers,                accent: 'white'   },
    { icon: Users,         label: 'Tutors',             value: metrics.totalTutors,               accent: 'orange'  },
    { icon: Users,         label: 'Students',           value: metrics.totalStudents,             accent: 'purple'  },
    { icon: TrendingUp,    label: 'Online Now',         value: metrics.onlineUsers,               accent: 'emerald' },
    { icon: MessageCircle, label: 'Active Sessions',    value: metrics.activeSessions,            accent: 'blue'    },
    { icon: BarChart2,     label: 'Total Sessions',     value: metrics.totalSessions,             accent: 'white'   },
  ] : [];

  const accentClass: Record<string, string> = {
    white:   'text-white/80',
    orange:  'text-orange-400',
    purple:  'text-purple-400',
    emerald: 'text-emerald-400',
    blue:    'text-blue-400',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <motion.div custom={0} variants={fade} initial="initial" animate="animate"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
            <BarChart2 size={16} className="text-white/60" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight">System Metrics</h1>
            <p className="text-white/30 text-xs">Live platform stats</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="glass-soft p-2 rounded-lg text-white/30 hover:text-white/60 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {loading && !metrics ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : (
        <motion.div custom={1} variants={fade} initial="initial" animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
        >
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={13} className="text-white/25" />
                <p className="text-white/30 text-xs">{s.label}</p>
              </div>
              <p className={`text-2xl font-semibold ${accentClass[s.accent]}`}>
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}