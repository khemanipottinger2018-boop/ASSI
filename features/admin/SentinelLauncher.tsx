'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Shield, X, EyeOff, Eye, LayoutDashboard, Users,
  BookOpen, Activity, AlertTriangle, BarChart2, Cpu,
  RefreshCw, Clock, Wifi, WifiOff, GraduationCap, MessageCircle,
  XCircle, Loader2, ChevronRight, Send, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useViewContext } from './ViewContextProvider';
import { adminApi } from '@/lib/api';

/* ══════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════ */

const STORAGE_KEY = 'sentinel_orb_pos';
const ORB = 52;
const PAD = 20;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Pos   = { x: number; y: number };
type TabId = 'overview' | 'users' | 'applications' | 'sessions' | 'errors' | 'metrics' | 'sentinel-ai';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',      label: 'Overview',     icon: LayoutDashboard },
  { id: 'sentinel-ai',   label: 'Sentinel AI',  icon: Cpu             },
  { id: 'users',         label: 'Users',        icon: Users           },
  { id: 'applications',  label: 'Applications', icon: BookOpen        },
  { id: 'sessions',      label: 'Sessions',     icon: Activity        },
  { id: 'errors',        label: 'Errors',       icon: AlertTriangle   },
  { id: 'metrics',       label: 'Metrics',      icon: BarChart2       },
];

/* ══════════════════════════════════════════════════════
   SENTINEL LAUNCHER
   ══════════════════════════════════════════════════════ */

export default function SentinelLauncher() {
  const { user } = useAuth();
  const { isElevated, viewContext, switchContext } = useViewContext();
  const router = useRouter();

  const [pos, setPos]             = useState<Pos | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [time, setTime]           = useState('');
  const dragging  = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  /* ── Init ── */
  useEffect(() => {
    const def: Pos = { x: PAD, y: window.innerHeight - ORB - PAD };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setPos(stored ? clamp(JSON.parse(stored)) : def);
    } catch { setPos(def); }
  }, []);

  /* ── Clock ── */
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function clamp(p: Pos): Pos {
    return {
      x: Math.max(PAD, Math.min(p.x, window.innerWidth  - ORB - PAD)),
      y: Math.max(PAD, Math.min(p.y, window.innerHeight - ORB - PAD)),
    };
  }

  /* ── Drag ── */
  function onMouseDown(e: React.MouseEvent) {
    if (modalOpen) return;
    dragging.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos!.x, oy: pos!.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragging.current = true;
      setPos(clamp({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy }));
    }
    function onUp() {
      setPos((p) => { if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); return p; });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onOrbClick() {
    if (!dragging.current) setModalOpen((o) => !o);
  }

  /* ── Undercover ── */
  async function toggleUndercover(role: 'student' | 'tutor') {
    const next = isElevated && viewContext === role ? 'admin' : role;
    await switchContext(next);
    router.push(next === 'admin' ? '/admin' : '/');
  }

  if (!pos) return null;

  return (
    <>
      {/* ══ Draggable orb ══ */}
      <motion.button
        onMouseDown={onMouseDown}
        onClick={onOrbClick}
        animate={pos}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Open Sentinel"
        style={{
          position: 'fixed',
          width: ORB, height: ORB,
          borderRadius: 999,
          background: isElevated
            ? 'radial-gradient(circle at 35% 35%, #f59e0b, #92400e)'
            : modalOpen
            ? 'radial-gradient(circle at 35% 35%, #00d4ff, #0a0f2e)'
            : 'radial-gradient(circle at 35% 35%, #1d6fa4, #050e24)',
          boxShadow: isElevated
            ? '0 0 0 2px rgba(245,158,11,0.5), 0 8px 28px rgba(245,158,11,0.35)'
            : modalOpen
            ? '0 0 0 2.5px rgba(0,180,255,0.6), 0 8px 32px rgba(0,180,255,0.4)'
            : '0 0 0 1px rgba(0,180,255,0.25), 0 8px 28px rgba(0,0,0,0.5)',
          border: 'none',
          cursor: modalOpen ? 'pointer' : 'grab',
          zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <motion.div animate={{ rotate: modalOpen ? 45 : 0 }} transition={{ duration: 0.22 }}>
          {isElevated
            ? <EyeOff size={20} color="white" />
            : modalOpen
            ? <X size={20} color="white" />
            : <Shield size={19} color="rgba(0,200,255,0.9)" />
          }
        </motion.div>

        {/* Undercover ping ring */}
        {isElevated && (
          <span className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(245,158,11,0.25)', animationDuration: '2.4s' }}
          />
        )}
      </motion.button>

      {/* ══ Full Modal ══ */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sentinel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9990,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            />

            {/* Modal panel — centering wrapper is plain div so Framer can't clobber the translate */}
            <div style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9995,
              pointerEvents: 'none',
            }}>
            <motion.div
              key="sentinel-modal"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                pointerEvents: 'all',
                width: 'min(1100px, 96vw)',
                height: 'min(720px, 92vh)',
                display: 'flex', flexDirection: 'column',
                borderRadius: 20, overflow: 'hidden',
                background: '#02060f',
                border: '1px solid rgba(0,180,255,0.18)',
                boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,180,255,0.08)',
                fontFamily: "'DM Mono', 'Fira Code', monospace",
              }}
            >
              {/* Scanline texture */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,180,255,0.006) 3px, rgba(0,180,255,0.006) 4px)',
              }} />
              {/* Grid */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: `linear-gradient(rgba(0,180,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.025) 1px, transparent 1px)`,
                backgroundSize: '48px 48px',
              }} />

              {/* Top accent bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 2,
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,180,255,0.7) 50%, transparent 100%)' }} />

              {/* ── Modal Header ── */}
              <div style={{
                position: 'relative', zIndex: 2, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'rgba(0,8,20,0.95)',
                borderBottom: '1px solid rgba(0,180,255,0.1)',
              }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(0,180,255,0.25), rgba(0,255,200,0.1))',
                    border: '1px solid rgba(0,180,255,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Shield size={15} style={{ color: '#00b4ff' }} />
                  </div>
                  <div>
                    <p style={{ color: 'rgba(0,180,255,0.45)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', lineHeight: 1 }}>SENTINEL</p>
                    <p style={{ color: '#c8e8ff', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', marginTop: 2 }}>Admin Control Layer</p>
                  </div>
                  {/* Live clock */}
                  <div style={{ marginLeft: 16, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.12)' }}>
                    <span style={{ color: '#00b4ff', fontSize: 12, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em' }}>{time}</span>
                  </div>
                </div>

                {/* Right side: user + undercover + close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* User badge */}
                  <div style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b35', boxShadow: '0 0 6px #ff6b35' }} />
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: '0.05em' }}>{user?.username ?? 'ADMIN'}</span>
                    <span style={{ color: 'rgba(255,100,50,0.55)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase' }}>ROOT</span>
                  </div>

                  {/* Undercover toggles */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['student', 'tutor'] as const).map((role) => {
                      const active = isElevated && viewContext === role;
                      return (
                        <button key={role} onClick={() => toggleUndercover(role)} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                          background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          transition: 'all 0.15s ease',
                        }}>
                          {active ? <Eye size={11} style={{ color: '#f59e0b' }} /> : <EyeOff size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                          <span style={{ fontSize: 10, textTransform: 'capitalize', letterSpacing: '0.05em',
                            color: active ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>
                            {active ? `Exit ${role}` : role}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => setModalOpen(false)} style={{
                    width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                  }}>
                    <X size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </button>
                </div>
              </div>

              {/* ── Tab Bar ── */}
              <div style={{
                position: 'relative', zIndex: 2, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 2,
                padding: '8px 12px',
                background: 'rgba(0,5,14,0.9)',
                borderBottom: '1px solid rgba(0,180,255,0.08)',
                overflowX: 'auto',
              }}>
                {TABS.map(({ id, label, icon: Icon }) => {
                  const active = activeTab === id;
                  const isSentinelAI = id === 'sentinel-ai';
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '6px 12px', borderRadius: 7, cursor: 'pointer', flexShrink: 0,
                        background: active ? 'rgba(0,180,255,0.12)' : isSentinelAI ? 'rgba(0,180,255,0.04)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(0,180,255,0.3)' : isSentinelAI ? 'rgba(0,180,255,0.12)' : 'transparent'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={12} style={{ color: active ? '#00b4ff' : isSentinelAI ? 'rgba(0,180,255,0.5)' : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                      <span style={{
                        fontSize: 11, letterSpacing: '0.06em',
                        color: active ? '#00d4ff' : isSentinelAI ? 'rgba(0,200,255,0.55)' : 'rgba(255,255,255,0.4)',
                        fontWeight: active ? 600 : 400,
                      }}>
                        {label}
                      </span>
                      {active && (
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00b4ff', boxShadow: '0 0 6px #00b4ff', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Tab Content ── */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 2 }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    style={{ height: '100%', overflow: 'hidden' }}
                  >
                    {activeTab === 'sentinel-ai' && <SentinelChatPanel />}
                    {activeTab === 'overview'     && <OverviewPanel />}
                    {activeTab === 'sessions'     && <SessionsPanel />}
                    {activeTab !== 'sentinel-ai' && activeTab !== 'overview' && activeTab !== 'sessions' && (
                      <GenericPanel tab={activeTab} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
            </div>{/* end centering wrapper */}
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   OVERVIEW PANEL
   ══════════════════════════════════════════════════════ */

type Stats = { totalUsers: number; tutors: number; students: number; onlineUsers: number };
type LiveSessionCompact = {
  sessionId:       string;
  status:          'waiting' | 'active' | 'paused' | 'host_left_grace' | 'ended';
  type:            string;
  studentId:       string;
  studentUsername: string;
  tutorId:         string | null;
  tutorUsername:   string | null;
  subjectName:     string | null;
  startedAt:       number;
  participantCount: number;
};

const statusStyle: Record<string, { dot: string; label: string; glow: boolean }> = {
  waiting:         { dot: '#facc15', label: 'rgba(250,204,21,0.85)',  glow: false },
  active:          { dot: '#34d399', label: 'rgba(52,211,153,0.85)',  glow: true  },
  paused:          { dot: '#fb923c', label: 'rgba(251,146,60,0.85)',  glow: false },
  host_left_grace: { dot: '#a78bfa', label: 'rgba(167,139,250,0.85)', glow: false },
  ended:           { dot: 'rgba(255,255,255,0.12)', label: 'rgba(255,255,255,0.2)', glow: false },
};

function elapsed(startedAt: number) {
  const mins = Math.floor((Date.now() - startedAt) / 60_000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function OverviewPanel() {
  const router = useRouter();
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<LiveSessionCompact[]>([]);
  const [metrics,  setMetrics]  = useState<{ activeSessions: number; totalSessions: number } | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [endingId, setEndingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, ssRes, mRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard/stats`, { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/sessions/live`,   { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/metrics`,         { credentials: 'include' }),
      ]);
      const [sData, ssData, mData] = await Promise.all([sRes.json(), ssRes.json(), mRes.json()]);
      if (sData.success)  setStats(sData.stats);
      if (ssData.success) setSessions(
        (ssData.sessions as LiveSessionCompact[])
          .filter(s => s.status !== 'ended')
          .sort((a, b) => (['active','host_left_grace','paused','waiting'].indexOf(a.status)) - (['active','host_left_grace','paused','waiting'].indexOf(b.status)))
      );
      if (mData.success) setMetrics({ activeSessions: mData.metrics.activeSessions, totalSessions: mData.metrics.totalSessions });
    } catch (err) {
      console.error('[Sentinel] Overview fetch failed:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function forceEnd(sessionId: string) {
    if (endingId) return;
    if (!confirm('Force-end this session?')) return;
    setEndingId(sessionId);
    try {
      await fetch(`${API_URL}/api/admin/sessions/${sessionId}/end`, { method: 'POST', credentials: 'include' });
      await refresh();
    } finally { setEndingId(null); }
  }

  const statCells = [
    { label: 'Users',    value: stats?.totalUsers,    color: '#00b4ff' },
    { label: 'Tutors',   value: stats?.tutors,        color: '#ff9f0a' },
    { label: 'Students', value: stats?.students,      color: '#a78bfa' },
    { label: 'Online',   value: stats?.onlineUsers,   color: '#00ff96' },
    { label: 'Active',   value: metrics?.activeSessions, color: '#34d399' },
    { label: 'Sessions', value: metrics?.totalSessions,  color: 'rgba(255,255,255,0.35)' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18,
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#00b4ff', boxShadow: '0 0 8px #00b4ff' }} />
          <p style={{ color: 'rgba(0,180,255,0.5)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Control Overview // Live</p>
        </div>
        <button onClick={refresh} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
          background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)', color: 'rgba(0,180,255,0.5)', fontSize: 10, opacity: loading ? 0.5 : 1 }}>
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat grid — 6 cells, 3 col */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {statCells.map(({ label, value, color }) => (
          <div key={label} style={{ padding: '11px 14px', borderRadius: 9, background: 'rgba(0,10,22,0.8)', border: `1px solid ${color}28`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</p>
            {value === undefined
              ? <div style={{ marginTop: 6, height: 20, width: 48, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }} />
              : <p style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 16px ${color}45` }}>{value.toLocaleString()}</p>
            }
          </div>
        ))}
      </div>

      {/* Quick nav strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[
          { label: 'Users',   href: '/admin/users',              color: '#60a5fa' },
          { label: 'Apps',    href: '/admin/tutor-applications', color: '#a78bfa' },
          { label: 'Errors',  href: '/admin/errors',             color: '#f87171' },
          { label: 'Metrics', href: '/admin/metrics',            color: '#fb923c' },
        ].map(({ label, href, color }) => (
          <button key={href} onClick={() => { router.push(href); }} style={{
            padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
            background: `${color}0a`, border: `1px solid ${color}20`,
            color, fontSize: 10, letterSpacing: '0.05em', fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Live sessions */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ color: 'rgba(0,180,255,0.35)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Live Sessions {sessions.length > 0 && <span style={{ color: '#34d399' }}>· {sessions.length}</span>}
          </p>
          <button onClick={() => router.push('/admin/sessions')} style={{ color: 'rgba(0,180,255,0.3)', fontSize: 9, cursor: 'pointer', background: 'none', border: 'none', letterSpacing: '0.08em', fontFamily: 'inherit' }}>
            Full view →
          </button>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Loader2 size={16} style={{ color: 'rgba(0,180,255,0.3)' }} className="animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11, textAlign: 'center', padding: '24px 0' }}>No active sessions</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sessions.map((s) => {
              const st = statusStyle[s.status] ?? statusStyle.waiting;
              return (
                <div key={s.sessionId} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
                  background: 'rgba(0,10,22,0.7)', border: `1px solid ${st.dot}18`,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, flexShrink: 0,
                    boxShadow: st.glow ? `0 0 7px ${st.dot}` : 'none' }} />
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 70px', gap: 6, minWidth: 0 }}>
                    <div>
                      <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 1 }}>Student</p>
                      <p style={{ fontSize: 10, color: 'rgba(200,200,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.studentUsername}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 1 }}>Tutor</p>
                      <p style={{ fontSize: 10, color: s.tutorUsername ? 'rgba(200,240,220,0.75)' : 'rgba(255,255,255,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.tutorUsername ?? '—'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 1 }}>Subject</p>
                      <p style={{ fontSize: 10, color: 'rgba(200,230,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subjectName ?? '—'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 1 }}>Elapsed</p>
                      <p style={{ fontSize: 10, color: st.label, fontVariantNumeric: 'tabular-nums' }}>{elapsed(s.startedAt)}</p>
                    </div>
                  </div>
                  <button onClick={() => forceEnd(s.sessionId)} disabled={endingId === s.sessionId} style={{
                    width: 26, height: 26, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)', cursor: 'pointer',
                    opacity: endingId && endingId !== s.sessionId ? 0.3 : 1,
                  }}>
                    {endingId === s.sessionId
                      ? <Loader2 size={11} className="animate-spin" style={{ color: '#ff453a' }} />
                      : <XCircle size={11} style={{ color: 'rgba(255,69,58,0.55)' }} />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SESSIONS PANEL — live session monitor inside the launcher
   ══════════════════════════════════════════════════════ */

type SessionRow = {
  sessionId:       string;
  status:          'waiting' | 'active' | 'paused' | 'host_left_grace';
  type:            string;
  studentUsername: string;
  tutorUsername:   string | null;
  subjectName:     string | null;
  startedAt:       number;
  participantCount: number;
};

const SESSION_STATUS_CFG: Record<string, { dot: string; label: string; glow: boolean }> = {
  waiting:         { dot: '#facc15', label: 'WAITING',    glow: false },
  active:          { dot: '#34d399', label: 'ACTIVE',     glow: true  },
  paused:          { dot: '#fb923c', label: 'PAUSED',     glow: false },
  host_left_grace: { dot: '#a78bfa', label: 'GRACE',      glow: false },
};

function SessionsPanel() {
  const [sessions,    setSessions]    = useState<SessionRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [endingId,    setEndingId]    = useState<string | null>(null);
  const [lastSync,    setLastSync]    = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`${API_URL}/api/admin/sessions/live`, { credentials: 'include' });
      const d   = await res.json();
      if (d.success) {
        setSessions(
          (d.sessions as SessionRow[])
            .sort((a, b) => (['active','host_left_grace','paused','waiting'].indexOf(a.status)) - (['active','host_left_grace','paused','waiting'].indexOf(b.status)))
        );
      } else { setError(true); }
    } catch { setError(true); }
    finally { setLoading(false); setLastSync(new Date()); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (autoRefresh) timerRef.current = setInterval(load, 10_000);
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, load]);

  async function forceEnd(sessionId: string) {
    if (endingId) return;
    if (!confirm('Force-end this session?')) return;
    setEndingId(sessionId);
    try {
      await fetch(`${API_URL}/api/admin/sessions/${sessionId}/end`, { method: 'POST', credentials: 'include' });
      await load();
    } finally { setEndingId(null); }
  }

  const counts = {
    active:  sessions.filter(s => s.status === 'active').length,
    waiting: sessions.filter(s => s.status === 'waiting').length,
    paused:  sessions.filter(s => s.status === 'paused').length,
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14,
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          <p style={{ color: 'rgba(52,211,153,0.5)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Session Monitor // Live</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setAutoRefresh(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${autoRefresh ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: autoRefresh ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.3)',
            fontSize: 9, letterSpacing: '0.08em', fontFamily: 'inherit',
          }}>
            {autoRefresh ? <Wifi size={10} /> : <WifiOff size={10} />}
            {autoRefresh ? 'LIVE' : 'PAUSED'}
          </button>
          <button onClick={load} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)',
            color: 'rgba(0,180,255,0.5)', fontSize: 9, opacity: loading ? 0.5 : 1, fontFamily: 'inherit',
          }}>
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            SYNC
          </button>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { l: 'Active',  n: counts.active,  c: '#34d399' },
          { l: 'Waiting', n: counts.waiting, c: '#facc15' },
          { l: 'Paused',  n: counts.paused,  c: '#fb923c' },
          { l: 'Total',   n: sessions.length, c: '#00b4ff' },
        ].map(({ l, n, c }) => (
          <div key={l} style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(0,10,22,0.75)', border: `1px solid ${c}20` }}>
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{l}</p>
            <p style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: c, lineHeight: 1, textShadow: `0 0 14px ${c}45` }}>
              {loading ? '—' : n}
            </p>
          </div>
        ))}
      </div>

      {/* Sync time */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 8, letterSpacing: '0.12em' }}>
          SYNC {lastSync.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>

      {/* Session list */}
      {error ? (
        <p style={{ color: 'rgba(255,69,58,0.5)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Failed to load sessions</p>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(52,211,153,0.35)' }} />
        </div>
      ) : sessions.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>No active sessions</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {sessions.map((s) => {
            const cfg = SESSION_STATUS_CFG[s.status] ?? SESSION_STATUS_CFG.waiting;
            return (
              <div key={s.sessionId} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8,
                background: 'rgba(0,10,22,0.7)', border: `1px solid ${cfg.dot}18`,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: cfg.dot,
                  boxShadow: cfg.glow ? `0 0 7px ${cfg.dot}` : 'none' }} />

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px 55px', gap: 6, minWidth: 0 }}>
                  <div>
                    <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Student</p>
                    <p style={{ fontSize: 10, color: 'rgba(200,200,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.studentUsername}</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Tutor</p>
                    <p style={{ fontSize: 10, color: s.tutorUsername ? 'rgba(200,240,220,0.8)' : 'rgba(255,255,255,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.tutorUsername ?? 'Waiting…'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Subject</p>
                    <p style={{ fontSize: 10, color: 'rgba(200,230,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subjectName ?? '—'}</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Status</p>
                    <p style={{ fontSize: 10, color: cfg.dot, fontWeight: 600 }}>{cfg.label}</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Time</p>
                    <p style={{ fontSize: 10, color: 'rgba(200,230,255,0.55)', fontVariantNumeric: 'tabular-nums' }}>{elapsed(s.startedAt)}</p>
                  </div>
                </div>

                <button onClick={() => forceEnd(s.sessionId)} disabled={!!endingId} style={{
                  width: 26, height: 26, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)', cursor: endingId ? 'default' : 'pointer',
                  opacity: endingId && endingId !== s.sessionId ? 0.25 : 1, transition: 'all 0.15s ease',
                }}>
                  {endingId === s.sessionId
                    ? <Loader2 size={11} className="animate-spin" style={{ color: '#ff453a' }} />
                    : <XCircle size={11} style={{ color: 'rgba(255,69,58,0.55)' }} />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GENERIC PANEL (Users / Apps / Errors / Metrics)
   — renders a live data frame for each section
   ══════════════════════════════════════════════════════ */

const PANEL_CONFIG: Record<string, { title: string; endpoint: string; color: string; icon: React.ElementType }> = {
  users:        { title: 'User Management',      endpoint: '/api/admin/users',                color: '#00b4ff', icon: Users         },
  applications: { title: 'Tutor Applications',   endpoint: '/api/admin/tutor-applications/admin/all', color: '#a78bfa', icon: BookOpen },
  sessions:     { title: 'Session Monitor',       endpoint: '/api/admin/sessions/live',        color: '#34d399', icon: Activity      },
  errors:       { title: 'Error Logs',            endpoint: '/api/admin/errors',               color: '#ff453a', icon: AlertTriangle },
  metrics:      { title: 'Platform Metrics',      endpoint: '/api/admin/metrics',              color: '#ff9f0a', icon: BarChart2     },
};

function GenericPanel({ tab }: { tab: string }) {
  const cfg = PANEL_CONFIG[tab];
  const [data, setData]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    fetch(`${API_URL}${cfg.endpoint}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        // Try to pull the first array we find in the response
        const arr = Object.values(d).find(Array.isArray) as any[] | undefined;
        setData(arr?.slice(0, 20) ?? []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tab]);

  const Icon = cfg.icon;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px',
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
        <Icon size={14} style={{ color: cfg.color }} />
        <p style={{ color: `${cfg.color}80`, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{cfg.title}</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={18} style={{ color: `${cfg.color}50`, animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,69,58,0.5)', fontSize: 12 }}>
          Failed to load {cfg.title.toLowerCase()}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>
          No data available
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.map((item, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(0,10,22,0.7)', border: `1px solid ${cfg.color}12`,
            }}>
              <pre style={{
                margin: 0, fontSize: 10, color: 'rgba(180,220,255,0.6)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'inherit',
              }}>
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SENTINEL AI CHAT PANEL
   ══════════════════════════════════════════════════════ */

type Message = { role: 'user' | 'assistant'; content: string };

const GREETING: Message = {
  role: 'assistant',
  content: 'SENTINEL ONLINE. All platform data feeds active. I have full context — user metrics, live sessions, error logs, and runtime health. How can I assist?',
};

const QUICK_PROMPTS = [
  "Show me today's platform health",
  'Any suspicious activity?',
  'Summarise pending applications',
  "What's the error rate this week?",
];

function SentinelChatPanel() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError]       = useState('');
  const [context, setContext]   = useState<Record<string, unknown> | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  useEffect(() => {
    Promise.allSettled([adminApi.getMetrics(), adminApi.getRuntimeMetrics()]).then(([mRes, rRes]) => {
      const m = mRes.status === 'fulfilled' && mRes.value.success ? (mRes.value as any).metrics : null;
      const r = rRes.status === 'fulfilled' && rRes.value.success ? (rRes.value as any).runtime : null;
      if (m) setContext({ ...m, runtime: r ?? undefined });
    });
  }, []);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    setError('');

    try {
      const res  = await fetch(`${API_URL}/api/ai/sentinel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg, history: messages.slice(-12), context }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Sentinel connection failed.'); return; }
      setMessages((p) => [...p, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Connection to Sentinel lost. Check backend status.');
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14,
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>

        {messages.length === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Quick Commands</p>
            {QUICK_PROMPTS.map((q) => (
              <button key={q} onClick={() => send(q)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 7,
                cursor: 'pointer', textAlign: 'left',
                background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.12)',
                color: 'rgba(0,200,255,0.55)', fontSize: 11, letterSpacing: '0.03em',
                transition: 'all 0.15s ease', fontFamily: 'inherit',
              }}>
                <ChevronRight size={10} style={{ color: 'rgba(0,180,255,0.35)', flexShrink: 0 }} />
                {q}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
              {msg.role === 'assistant' && (
                <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', paddingLeft: 2 }}>SENTINEL</p>
              )}
              <div style={{
                maxWidth: '80%', padding: '9px 13px', fontSize: 12, lineHeight: 1.65,
                ...(msg.role === 'assistant' ? {
                  background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.14)',
                  color: 'rgba(210,235,255,0.85)', borderRadius: '10px 10px 10px 2px',
                } : {
                  background: 'rgba(0,180,255,0.12)', border: '1px solid rgba(0,180,255,0.22)',
                  color: 'rgba(170,220,255,0.9)', borderRadius: '10px 10px 2px 10px',
                }),
              }}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', paddingRight: 2 }}>ADMIN</p>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>SENTINEL</p>
              <div style={{ padding: '9px 13px', borderRadius: '10px 10px 10px 2px',
                background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.14)',
                display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#00b4ff', display: 'block' }}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.22 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)' }}>
            <AlertCircle size={12} style={{ color: '#ff453a', flexShrink: 0 }} />
            <p style={{ color: 'rgba(255,100,90,0.8)', fontSize: 11 }}>{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(0,180,255,0.1)',
        background: 'rgba(0,6,16,0.9)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(0,180,255,0.3)', fontSize: 12, pointerEvents: 'none' }}>›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Query Sentinel…"
            style={{
              width: '100%', background: 'rgba(0,180,255,0.05)',
              border: '1px solid rgba(0,180,255,0.15)', borderRadius: 8,
              padding: '9px 12px 9px 26px', color: 'rgba(180,230,255,0.85)',
              fontSize: 12, outline: 'none', letterSpacing: '0.03em',
              boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
          background: loading ? 'rgba(0,180,255,0.06)' : 'rgba(0,180,255,0.18)',
          border: '1px solid rgba(0,180,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: loading ? 0.4 : 1, transition: 'all 0.15s ease',
        }}>
          <Send size={13} style={{ color: '#00b4ff' }} />
        </button>
      </div>
    </div>
  );
}
