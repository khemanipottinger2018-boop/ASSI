'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, RefreshCw, Users, Activity, Wifi, Clock,
  AlertTriangle, BarChart2, BookOpen, GraduationCap,
  EyeOff, Eye, ArrowRight, Loader2, Cpu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SentinelChat from '@/components/admin/SentinelChat';

const API_URL        = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const UNDERCOVER_KEY = 'sentinel:undercover';

type UndercoverRole = 'student' | 'tutor' | null;

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.28, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ══════════════════════════════════════════════════
   PRIMITIVES
   ══════════════════════════════════════════════════ */

function SectionCard({
  title, icon: Icon, accent = '#00b4ff', path, loading, children,
}: {
  title: string;
  icon: React.ElementType;
  accent?: string;
  path: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden', position: 'relative',
      background: 'rgba(0,10,22,0.75)', border: `1px solid ${accent}18`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${accent}45, transparent)` }} />

      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 14px', borderBottom: `1px solid ${accent}10`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon size={12} style={{ color: `${accent}80` }} />
          <span style={{ color: `${accent}65`, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {title}
          </span>
        </div>
        <button
          onClick={() => router.push(path)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
            background: 'transparent', border: 'none', padding: '3px 0',
            color: `${accent}45`, fontSize: 10, letterSpacing: '0.06em', transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = accent)}
          onMouseLeave={e => (e.currentTarget.style.color = `${accent}45`)}
        >
          View all <ArrowRight size={11} style={{ marginLeft: 2 }} />
        </button>
      </div>

      {/* body */}
      <div style={{ padding: '8px 14px 12px', flex: 1, minHeight: 90 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 80 }}>
            <Loader2 size={14} style={{ color: `${accent}30`, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : children}
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p style={{ color: 'rgba(255,255,255,0.14)', fontSize: 11, textAlign: 'center', padding: '18px 0' }}>{text}</p>;
}

function MiniRow({ left, right, sub }: { left: React.ReactNode; right?: React.ReactNode; sub?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: 'rgba(200,225,255,0.6)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {left}
        </div>
        {sub && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink: 0, marginLeft: 10 }}>{right}</div>}
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 20, textTransform: 'capitalize',
      color, background: `${color}15`, border: `1px solid ${color}28`,
    }}>
      {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════ */

export default function AdminDashboardPage() {
  const router   = useRouter();
  const { user } = useAuth();

  const [undercover, setUndercover] = useState<UndercoverRole>(null);
  useEffect(() => {
    setUndercover(localStorage.getItem(UNDERCOVER_KEY) as UndercoverRole ?? null);
  }, []);

  const toggleUndercover = useCallback((role: 'student' | 'tutor') => {
    const next: UndercoverRole = undercover === role ? null : role;
    next ? localStorage.setItem(UNDERCOVER_KEY, next) : localStorage.removeItem(UNDERCOVER_KEY);
    window.location.href = next ? '/' : '/admin';
  }, [undercover]);

  /* ── data ── */
  const [stats,        setStats]        = useState<any>(null);
  const [sessions,     setSessions]     = useState<any[]>([]);
  const [users,        setUsers]        = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [errors,       setErrors]       = useState<any[]>([]);
  const [metrics,      setMetrics]      = useState<any>(null);

  const [lStats,   setLStats]   = useState(true);
  const [lSess,    setLSess]    = useState(true);
  const [lUsers,   setLUsers]   = useState(true);
  const [lApps,    setLApps]    = useState(true);
  const [lErrors,  setLErrors]  = useState(true);
  const [lMetrics, setLMetrics] = useState(true);

  const load = useCallback(() => {
    const go = (url: string) =>
      fetch(`${API_URL}${url}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({}));

    setLStats(true);
    go('/api/admin/dashboard/stats').then(d => { if (d.success) setStats(d.stats); }).finally(() => setLStats(false));

    setLSess(true);
    go('/api/admin/sessions/live').then(d => {
      if (d.success) setSessions(
        (d.sessions ?? [])
          .sort((a: any, b: any) => ['active','waiting','paused','ended'].indexOf(a.status) - ['active','waiting','paused','ended'].indexOf(b.status))
          .slice(0, 4)
      );
    }).finally(() => setLSess(false));

    setLUsers(true);
    go('/api/admin/users').then(d => { if (d.success) setUsers((d.users ?? []).slice(0, 4)); }).finally(() => setLUsers(false));

    setLApps(true);
    go('/api/admin/tutor-applications').then(d => { if (d.success) setApplications((d.applications ?? []).slice(0, 4)); }).finally(() => setLApps(false));

    setLErrors(true);
    go('/api/admin/errors?range=24h').then(d => { if (d.success) setErrors((d.errors ?? []).slice(0, 4)); }).finally(() => setLErrors(false));

    setLMetrics(true);
    go('/api/admin/metrics').then(d => { if (d.success) setMetrics(d.metrics); }).finally(() => setLMetrics(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── helpers ── */
  const elapsed = (ts: number) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const sessionDot: Record<string, string> = {
    active: '#34d399', waiting: '#facc15', paused: '#fb923c', ended: 'rgba(255,255,255,0.2)',
  };
  const roleColor: Record<string, string> = {
    admin: '#fb923c', tutor: '#34d399', student: '#60a5fa', 'tutor-applicant': '#a78bfa',
  };
  const levelColor: Record<string, string> = {
    error: '#f87171', warning: '#fbbf24', warn: '#fbbf24', info: '#60a5fa',
  };
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-7">

      {/* ── Header ── */}
      <motion.div custom={0} variants={fade} initial="initial" animate="animate"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
            <Shield size={16} className="text-orange-400" />
          </div>
          <div>
            <h1 style={{ color: 'rgba(255,255,255,0.88)', fontSize: 16, fontWeight: 600 }}>Admin Dashboard</h1>
            <p style={{ color: 'rgba(0,180,255,0.38)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              {user?.username} // Sentinel Control Layer
            </p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-soft text-white/40 hover:text-white/70 text-xs transition">
          <RefreshCw size={11} /> Refresh
        </button>
      </motion.div>

      {/* ── Stat strip ── */}
      <motion.div custom={1} variants={fade} initial="initial" animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', val: stats?.totalUsers,  color: 'rgba(255,255,255,0.65)' },
          { label: 'Tutors',      val: stats?.tutors,       color: '#fb923c'                },
          { label: 'Students',    val: stats?.students,     color: '#a78bfa'                },
          { label: 'Online',      val: stats?.onlineUsers,  color: '#34d399'                },
        ].map(({ label, val, color }) => (
          <div key={label} className="glass rounded-2xl px-4 py-4" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${color}35, transparent)` }} />
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, marginBottom: 8 }}>{label}</p>
            {lStats
              ? <div className="h-6 w-10 glass-soft rounded animate-pulse" />
              : <p style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{val?.toLocaleString() ?? '—'}</p>
            }
          </div>
        ))}
      </motion.div>

      {/* ── Undercover panel ── */}
      <motion.div custom={2} variants={fade} initial="initial" animate="animate">
        <div style={{
          borderRadius: 12, overflow: 'hidden', position: 'relative',
          background: 'rgba(0,10,22,0.78)',
          border: undercover ? '1px solid rgba(245,158,11,0.32)' : '1px solid rgba(0,180,255,0.1)',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: undercover
              ? 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(0,180,255,0.28), transparent)' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 16px', borderBottom: undercover ? '1px solid rgba(245,158,11,0.1)' : '1px solid rgba(0,180,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EyeOff size={12} style={{ color: undercover ? 'rgba(245,158,11,0.65)' : 'rgba(0,180,255,0.38)' }} />
              <div>
                <p style={{ color: undercover ? 'rgba(245,158,11,0.42)' : 'rgba(0,180,255,0.35)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Undercover Mode
                </p>
                <p style={{ color: undercover ? 'rgba(251,191,36,0.72)' : 'rgba(200,230,255,0.4)', fontSize: 11, marginTop: 2 }}>
                  {undercover ? `Active — browsing as ${undercover}` : 'Browse the platform as a student or tutor'}
                </p>
              </div>
            </div>
            <AnimatePresence>
              {undercover && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20,
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 5px #f59e0b' }} />
                  <span style={{ color: '#fbbf24', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Live</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
            {(['student', 'tutor'] as const).map(role => {
              const Icon = role === 'student' ? GraduationCap : BookOpen;
              const active = undercover === role;
              return (
                <button key={role} onClick={() => toggleUndercover(role)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px',
                  borderRadius: 8, cursor: 'pointer',
                  background: active ? 'rgba(245,158,11,0.1)' : 'rgba(0,180,255,0.04)',
                  border: `1px solid ${active ? 'rgba(245,158,11,0.32)' : 'rgba(0,180,255,0.1)'}`,
                  transition: 'all 0.15s ease',
                }}>
                  <Icon size={13} style={{ color: active ? '#f59e0b' : 'rgba(0,180,255,0.4)', flexShrink: 0 }} />
                  <p style={{ color: active ? '#fbbf24' : 'rgba(200,230,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', flex: 1, textAlign: 'left' }}>
                    {active ? `Exit ${role} view` : `Go as ${role}`}
                  </p>
                  {active ? <Eye size={11} style={{ color: '#f59e0b' }} /> : <EyeOff size={11} style={{ color: 'rgba(255,255,255,0.1)' }} />}
                </button>
              );
            })}
            <AnimatePresence>
              {undercover && (
                <motion.button initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                  onClick={() => { localStorage.removeItem(UNDERCOVER_KEY); window.location.href = '/admin'; }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8,
                    cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0,
                    background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.16)',
                    color: 'rgba(255,69,58,0.6)', fontSize: 11,
                  }}>
                  <Shield size={11} /> Back to Admin
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Preview grid — 2 col ── */}
      <motion.div custom={3} variants={fade} initial="initial" animate="animate"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Sessions */}
        <SectionCard title="Live Sessions" icon={Activity} accent="#34d399" path="/admin/sessions" loading={lSess}>
          {sessions.length === 0
            ? <EmptyRow text="No active sessions" />
            : sessions.map(s => (
                <MiniRow key={s.sessionId}
                  left={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: sessionDot[s.status] ?? '#fff',
                        boxShadow: s.status === 'active' ? `0 0 6px ${sessionDot.active}` : 'none' }} />
                      {s.sessionId.slice(0, 8).toUpperCase()}
                      {s.subjectName && <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>· {s.subjectName}</span>}
                    </span>
                  }
                  right={
                    <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={9} /> {elapsed(s.startedAt)}
                    </span>
                  }
                />
              ))
          }
        </SectionCard>

        {/* Users */}
        <SectionCard title="Users" icon={Users} accent="#60a5fa" path="/admin/users" loading={lUsers}>
          {users.length === 0
            ? <EmptyRow text="No users found" />
            : users.map(u => (
                <MiniRow key={u.id}
                  left={u.username}
                  sub={u.email}
                  right={<Pill label={u.role} color={roleColor[u.role] ?? 'rgba(255,255,255,0.4)'} />}
                />
              ))
          }
        </SectionCard>

        {/* Applications */}
        <SectionCard title="Tutor Applications" icon={BookOpen} accent="#a78bfa" path="/admin/tutor-applications" loading={lApps}>
          {applications.length === 0
            ? <EmptyRow text="No applications" />
            : <>
                {pendingCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 2,
                    padding: '5px 9px', borderRadius: 7, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                    <span style={{ color: '#a78bfa', fontSize: 10 }}>{pendingCount} pending review</span>
                  </div>
                )}
                {applications.map(a => (
                  <MiniRow key={a.id}
                    left={a.username}
                    sub={a.email}
                    right={<Pill
                      label={a.status}
                      color={a.status === 'pending' ? '#a78bfa' : a.status === 'approved' ? '#34d399' : '#f87171'}
                    />}
                  />
                ))}
              </>
          }
        </SectionCard>

        {/* Errors */}
        <SectionCard title="Recent Errors (24h)" icon={AlertTriangle} accent="#f87171" path="/admin/errors" loading={lErrors}>
          {errors.length === 0
            ? <EmptyRow text="No errors in the last 24h 🎉" />
            : errors.map(e => (
                <MiniRow key={e.id}
                  left={e.error_message ?? e.message ?? 'Unknown error'}
                  sub={e.endpoint ?? e.route ?? undefined}
                  right={<Pill
                    label={e.severity ?? e.level ?? 'error'}
                    color={levelColor[e.severity ?? e.level ?? 'error'] ?? '#f87171'}
                  />}
                />
              ))
          }
        </SectionCard>

        {/* Metrics — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <SectionCard title="Platform Metrics" icon={BarChart2} accent="#ff9f0a" path="/admin/metrics" loading={lMetrics}>
            {!metrics
              ? <EmptyRow text="No metrics available" />
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, paddingTop: 4 }}>
                  {[
                    { label: 'Total Sessions',    value: metrics.totalSessions,   color: '#00b4ff' },
                    { label: 'Active Sessions',   value: metrics.activeSessions,  color: '#34d399' },
                    { label: 'Avg Duration (min)',value: metrics.avgSessionDuration ?? '—', color: '#ff9f0a' },
                    { label: 'Online Now',         value: metrics.onlineUsers,    color: '#a78bfa' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.025)', border: `1px solid ${color}15` }}>
                      <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
                      <p style={{ color, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
            }
          </SectionCard>
        </div>
      </motion.div>

      {/* ── Sentinel AI — full width, embedded ── */}
      <motion.div custom={4} variants={fade} initial="initial" animate="animate">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#00b4ff', boxShadow: '0 0 8px #00b4ff' }} />
          <Cpu size={11} style={{ color: 'rgba(0,180,255,0.45)' }} />
          <p style={{ color: 'rgba(0,180,255,0.45)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            Sentinel AI // Co-Pilot
          </p>
        </div>
        <div style={{ height: 480 }}>
          <SentinelChat />
        </div>
      </motion.div>

    </div>
  );
}