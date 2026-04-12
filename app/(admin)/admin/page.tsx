'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, MessageCircle, BarChart2, ClipboardList,
  AlertTriangle, Cpu, Loader2, XCircle,
  RefreshCw, ArrowRight, Wifi, Clock, Inbox,
  ShieldCheck, GraduationCap, UserCheck,
  Activity, Database,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { LiveSession } from '@/lib/api/admin';

type Metrics = {
  totalUsers:     number;
  totalTutors:    number;
  totalStudents:  number;
  totalSessions:  number;
  activeSessions: number;
  onlineUsers:    number;
};

type RecentError = {
  id:            string;
  severity:      string;
  error_message: string;
  endpoint:      string | null;
  created_at:    string;
};

type PendingApp = {
  id:     string;
  status: string;
  user:   { username: string };
};

const fade = {
  hidden:  { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function HudLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'rgba(0,180,255,0.35)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
      {children}
    </p>
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const [metrics,     setMetrics]     = useState<Metrics | null>(null);
  const [errors,      setErrors]      = useState<RecentError[]>([]);
  const [pendingApps, setPendingApps] = useState<PendingApp[]>([]);
  const [liveSess,    setLiveSess]    = useState<LiveSession[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [lastSync,    setLastSync]    = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [metricsRes, errorsRes, appsRes, sessRes] = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getErrors(),
        adminApi.getApplications(),
        adminApi.getLiveSessions(),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value.success)
        setMetrics((metricsRes.value as any).metrics);
      else if (metricsRes.status === 'rejected')
        setLoadError('Failed to load metrics');

      if (errorsRes.status === 'fulfilled' && errorsRes.value.success)
        setErrors(((errorsRes.value as any).errors ?? []).slice(0, 4));

      if (appsRes.status === 'fulfilled' && appsRes.value.success) {
        const all = (appsRes.value as any).applications ?? [];
        setPendingApps(all.filter((a: PendingApp) => a.status === 'pending').slice(0, 5));
      }

      if (sessRes.status === 'fulfilled' && sessRes.value.success)
        setLiveSess(((sessRes.value as any).sessions ?? []).filter((s: any) => s.status !== 'ended'));

    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load data');
    } finally { setLoading(false); setLastSync(new Date()); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeSessions = liveSess.filter(s => s.status === 'active').length;
  const waitingSessions = liveSess.filter(s => s.status === 'waiting').length;

  /* ── Nav sections ── */
  const sections: {
    label: string;
    items: {
      icon: React.ElementType;
      label: string;
      desc: string;
      href: string;
      color: string;
      border: string;
      badge?: string | null;
      badgeColor?: string;
    }[];
  }[] = [
    {
      label: 'Platform',
      items: [
        {
          icon: Users, label: 'Users', desc: 'Accounts, roles & suspensions',
          href: '/admin/users', color: '#60a5fa', border: 'rgba(96,165,250,0.12)',
        },
        {
          icon: Activity, label: 'Live Sessions', desc: 'Monitor & force-end sessions',
          href: '/admin/sessions', color: '#34d399', border: 'rgba(52,211,153,0.12)',
          badge: liveSess.length > 0 ? `${activeSessions} active · ${waitingSessions} waiting` : null,
          badgeColor: 'bg-emerald-500/15 text-emerald-400',
        },
        {
          icon: ClipboardList, label: 'Tutor Applications', desc: 'Review and approve applicants',
          href: '/admin/tutor-applications', color: '#a78bfa', border: 'rgba(167,139,250,0.12)',
          badge: pendingApps.length > 0 ? `${pendingApps.length} pending` : null,
          badgeColor: 'bg-purple-500/15 text-purple-400',
        },
        {
          icon: Inbox, label: 'Messages', desc: 'Broadcast announcements or DMs',
          href: '/admin/messages', color: '#60a5fa', border: 'rgba(96,165,250,0.12)',
        },
      ],
    },
    {
      label: 'System',
      items: [
        {
          icon: BarChart2, label: 'Metrics', desc: 'Platform-wide stats & usage',
          href: '/admin/metrics', color: '#fb923c', border: 'rgba(251,146,60,0.12)',
        },
        {
          icon: AlertTriangle, label: 'Error Logs', desc: 'View and diagnose backend errors',
          href: '/admin/errors', color: errors.length > 0 ? '#f87171' : 'rgba(255,255,255,0.25)',
          border: errors.length > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
          badge: errors.length > 0 ? `${errors.length} in 24h` : null,
          badgeColor: 'bg-red-500/15 text-red-400',
        },
        {
          icon: Cpu, label: 'Sentinel AI', desc: 'AI co-pilot — platform awareness',
          href: '/admin/sentinel', color: '#00b4ff', border: 'rgba(0,180,255,0.15)',
        },
      ],
    },
  ];

  return (
    <div style={{ fontFamily: "'DM Mono', 'Fira Code', monospace", maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page header ── */}
      <motion.div custom={0} variants={fade} initial="hidden" animate="show"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(0,180,255,0.2), rgba(0,255,200,0.08))',
            border: '1px solid rgba(0,180,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={16} style={{ color: '#00b4ff' }} />
          </div>
          <div>
            <p style={{ color: 'rgba(0,180,255,0.4)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Sentinel</p>
            <p style={{ color: '#c8e8ff', fontSize: 15, fontWeight: 600, marginTop: 1 }}>Admin Overview</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9, letterSpacing: '0.12em' }}>
            {lastSync.toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <button onClick={load} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
            background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)',
            color: 'rgba(0,180,255,0.5)', fontSize: 10, letterSpacing: '0.08em',
            opacity: loading ? 0.5 : 1,
          }}>
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            SYNC
          </button>
        </div>
      </motion.div>

      {/* ── Error banner ── */}
      {loadError && (
        <motion.div custom={0} variants={fade} initial="hidden" animate="show"
          style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', color: 'rgba(255,100,90,0.85)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle size={13} style={{ flexShrink: 0 }} />
          {loadError}
        </motion.div>
      )}

      {/* ── Stat grid ── */}
      {loading && !metrics ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(0,180,255,0.3)' }} />
        </div>
      ) : metrics && (
        <motion.div custom={1} variants={fade} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[
            { label: 'Users',    value: metrics.totalUsers,    color: '#00b4ff' },
            { label: 'Tutors',   value: metrics.totalTutors,   color: '#fb923c' },
            { label: 'Students', value: metrics.totalStudents, color: '#a78bfa' },
            { label: 'Online',   value: metrics.onlineUsers,   color: '#34d399' },
            { label: 'Active',   value: activeSessions,        color: '#34d399' },
            { label: 'Sessions', value: metrics.totalSessions, color: 'rgba(255,255,255,0.4)' },
          ].map((s) => (
            <div key={s.label} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,10,22,0.75)', border: `1px solid ${s.color}20`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${s.color}50, transparent)` }} />
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{s.label}</p>
              <p style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1, textShadow: `0 0 16px ${s.color}40` }}>
                {s.value?.toLocaleString() ?? '—'}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Nav sections ── */}
      {sections.map((section, si) => (
        <motion.div key={section.label} custom={si + 2} variants={fade} initial="hidden" animate="show">
          <HudLabel>{section.label}</HudLabel>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${section.items.length <= 3 ? section.items.length : 2}, 1fr)`, gap: 8 }}>
            {section.items.map((card) => (
              <button key={card.href} onClick={() => router.push(card.href)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: 'rgba(0,10,22,0.7)',
                border: `1px solid ${card.border}`,
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,20,40,0.9)'; (e.currentTarget as HTMLElement).style.borderColor = card.color + '30'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,10,22,0.7)'; (e.currentTarget as HTMLElement).style.borderColor = card.border; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: `${card.color}10`,
                  border: `1px solid ${card.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <card.icon size={15} style={{ color: card.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{ color: 'rgba(200,230,255,0.8)', fontSize: 12, fontWeight: 600 }}>{card.label}</p>
                    {card.badge && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: `${card.color}18`, color: card.color, border: `1px solid ${card.color}25`,
                        letterSpacing: '0.05em',
                      }}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{card.desc}</p>
                </div>
                <ArrowRight size={13} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* ── Active sessions inline preview ── */}
      {!loading && liveSess.filter(s => s.status === 'active' || s.status === 'waiting').length > 0 && (
        <motion.div custom={5} variants={fade} initial="hidden" animate="show">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <HudLabel>Live Sessions Now</HudLabel>
            <button onClick={() => router.push('/admin/sessions')} style={{
              color: 'rgba(0,180,255,0.35)', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer',
              background: 'none', border: 'none', padding: 0,
            }}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {liveSess.slice(0, 5).map((s) => {
              const isActive = s.status === 'active';
              return (
                <div key={s.sessionId} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(0,10,22,0.7)',
                  border: `1px solid ${isActive ? 'rgba(52,211,153,0.12)' : 'rgba(250,204,21,0.10)'}`,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: isActive ? '#34d399' : '#facc15',
                    boxShadow: isActive ? '0 0 6px #34d399' : 'none',
                  }} />
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { l: 'Student',  v: s.studentUsername },
                      { l: 'Tutor',    v: s.tutorUsername ?? '—' },
                      { l: 'Subject',  v: s.subjectName ?? '—' },
                      { l: 'Elapsed',  v: (() => { const m = Math.floor((Date.now() - s.startedAt) / 60_000); return m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`; })() },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</p>
                        <p style={{ color: 'rgba(200,230,255,0.6)', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.08em',
                    background: isActive ? 'rgba(52,211,153,0.12)' : 'rgba(250,204,21,0.12)',
                    color: isActive ? 'rgba(52,211,153,0.8)' : 'rgba(250,204,21,0.8)',
                    border: `1px solid ${isActive ? 'rgba(52,211,153,0.2)' : 'rgba(250,204,21,0.2)'}`,
                  }}>
                    {s.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Two-column: errors + pending apps ── */}
      {!loading && (errors.length > 0 || pendingApps.length > 0) && (
        <motion.div custom={6} variants={fade} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: errors.length > 0 && pendingApps.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>

          {/* Recent errors */}
          {errors.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <HudLabel>Recent Errors (24h)</HudLabel>
                <button onClick={() => router.push('/admin/errors')} style={{ color: 'rgba(248,113,113,0.4)', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                  View all →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {errors.map((err) => (
                  <div key={err.id} style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(0,10,22,0.7)', border: '1px solid rgba(248,113,113,0.1)', display: 'flex', alignItems: 'start', gap: 8 }}>
                    <AlertTriangle size={11} style={{ color: 'rgba(248,113,113,0.5)', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{err.error_message}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        {err.endpoint && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 8 }}>{err.endpoint}</span>}
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={7} />{new Date(err.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending applications */}
          {pendingApps.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <HudLabel>Pending Applications</HudLabel>
                <button onClick={() => router.push('/admin/tutor-applications')} style={{ color: 'rgba(167,139,250,0.4)', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                  Review all →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pendingApps.map((app) => (
                  <div key={app.id} style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(0,10,22,0.7)', border: '1px solid rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'rgba(167,139,250,0.7)', fontSize: 10, fontWeight: 700 }}>
                        {app.user.username[0]?.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: 'rgba(200,200,255,0.65)', fontSize: 11, flex: 1 }}>{app.user.username}</p>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(167,139,250,0.12)', color: 'rgba(167,139,250,0.7)', border: '1px solid rgba(167,139,250,0.2)', letterSpacing: '0.08em' }}>
                      PENDING
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
