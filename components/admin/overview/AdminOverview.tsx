'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, BookOpen, Wifi, AlertTriangle, Activity } from 'lucide-react';
import StatCard from './StatCard';
import SystemNotice from './SystemNotice';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type Stats = { totalUsers: number; tutors: number; students: number; onlineUsers: number };

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/dashboard/stats`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.stats); else setError(true); })
      .catch(() => setError(true));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 14, background: '#00b4ff', borderRadius: 2, boxShadow: '0 0 8px #00b4ff' }} />
        <p style={{ color: 'rgba(0,180,255,0.5)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          System Overview // Live Data
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard title="Total Users"  value={stats?.totalUsers}  icon={Users}         accent="blue"   />
        <StatCard title="Tutors"       value={stats?.tutors}       icon={GraduationCap} accent="green"  />
        <StatCard title="Students"     value={stats?.students}     icon={BookOpen}      accent="blue"   />
        <StatCard title="Online Now"   value={stats?.onlineUsers}  icon={Wifi}          accent="green"  />
      </div>

      {/* System notice */}
      <SystemNotice status={error ? 'warning' : 'ok'} />

      {/* Quick action grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
        <QuickLink href="/admin/tutor-applications" icon={BookOpen}     label="Review Applications" sub="Pending tutor approvals" />
        <QuickLink href="/admin/errors"             icon={AlertTriangle} label="Error Logs"          sub="Platform diagnostics"    accent="orange" />
        <QuickLink href="/admin/sentinel"           icon={Activity}      label="Open Sentinel"       sub="AI co-pilot interface"   accent="green"  />
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, sub, accent = 'blue' }: {
  href: string; icon: any; label: string; sub: string; accent?: 'blue' | 'green' | 'orange';
}) {
  const colors = { blue: '#00b4ff', green: '#00ff96', orange: '#ff9f0a' };
  const c = colors[accent];

  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <motion.div
        whileHover={{ borderColor: c + '40', background: `rgba(0,10,22,0.95)` }}
        style={{
          padding: '14px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s ease',
          background: 'rgba(0,10,22,0.6)',
          border: '1px solid rgba(0,180,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${c}18`, border: `1px solid ${c}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} style={{ color: c }} />
        </div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 }}>{label}</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 2 }}>{sub}</p>
        </div>
      </motion.div>
    </a>
  );
}