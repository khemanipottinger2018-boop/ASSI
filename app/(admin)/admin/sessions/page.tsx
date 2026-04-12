'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Loader2, XCircle,
  Users, Clock, ChevronDown, ChevronUp,
  MessageCircle, BookOpen, Wifi, WifiOff, Pause,
  UserCircle, GraduationCap, BookMarked,
} from 'lucide-react';
import { adminApi, type LiveSession, type LiveSessionStatus } from '@/lib/api/admin';

type SessionFilter = LiveSessionStatus | 'all';

const STATUS_CONFIG: Record<LiveSessionStatus, {
  dot: string; dotGlow: string; label: string; labelColor: string; rowBorder: string;
}> = {
  waiting:         { dot: '#facc15', dotGlow: '0 0 8px rgba(250,204,21,0.8)',   label: 'WAITING',    labelColor: 'rgba(250,204,21,0.85)',  rowBorder: 'rgba(250,204,21,0.10)' },
  active:          { dot: '#34d399', dotGlow: '0 0 8px rgba(52,211,153,0.8)',   label: 'ACTIVE',     labelColor: 'rgba(52,211,153,0.85)',  rowBorder: 'rgba(52,211,153,0.12)' },
  paused:          { dot: '#fb923c', dotGlow: '0 0 8px rgba(251,146,60,0.6)',   label: 'PAUSED',     labelColor: 'rgba(251,146,60,0.85)',  rowBorder: 'rgba(251,146,60,0.10)' },
  host_left_grace: { dot: '#a78bfa', dotGlow: '0 0 8px rgba(167,139,250,0.6)', label: 'HOST GRACE', labelColor: 'rgba(167,139,250,0.85)', rowBorder: 'rgba(167,139,250,0.10)' },
};

const STATUS_ORDER: LiveSessionStatus[] = ['active', 'host_left_grace', 'paused', 'waiting'];

function elapsed(startedAt: number): string {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export default function AdminSessionsPage() {
  const [sessions,    setSessions]    = useState<LiveSession[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [endingId,    setEndingId]    = useState<string | null>(null);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [filter,      setFilter]      = useState<SessionFilter>('all');
  const [lastSync,    setLastSync]    = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminApi.getLiveSessions();
      if (data.success) {
        setSessions(
          (data.sessions as LiveSession[]).sort(
            (a, b) => STATUS_ORDER.indexOf(a.status as LiveSessionStatus) - STATUS_ORDER.indexOf(b.status as LiveSessionStatus)
          )
        );
      } else {
        setError('Failed to load live sessions');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load live sessions');
    } finally { setLoading(false); setLastSync(new Date()); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(load, 10_000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, load]);

  async function forceEnd(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (endingId) return;
    if (!confirm('Force-end this session? Both participants will be disconnected.')) return;
    setEndingId(sessionId);
    try {
      const res = await adminApi.endSession(sessionId);
      if (!res.success) { setError('Failed to end session'); return; }
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to end session');
    } finally { setEndingId(null); }
  }

  const counts = {
    all:             sessions.length,
    active:          sessions.filter(s => s.status === 'active').length,
    waiting:         sessions.filter(s => s.status === 'waiting').length,
    paused:          sessions.filter(s => s.status === 'paused').length,
    host_left_grace: sessions.filter(s => s.status === 'host_left_grace').length,
  };

  const filterOptions = [
    { id: 'all'             as SessionFilter, label: `All (${counts.all})` },
    { id: 'active'          as SessionFilter, label: `Active (${counts.active})` },
    { id: 'waiting'         as SessionFilter, label: `Waiting (${counts.waiting})` },
    { id: 'paused'          as SessionFilter, label: `Paused (${counts.paused})` },
    { id: 'host_left_grace' as SessionFilter, label: `Grace (${counts.host_left_grace})` },
  ].filter(f => f.id === 'all' || counts[f.id as keyof typeof counts] > 0);

  const visible = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'DM Mono', 'Fira Code', monospace" }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          <div>
            <p style={{ color: 'rgba(52,211,153,0.5)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Session Monitor</p>
            <p style={{ color: 'rgba(200,240,220,0.75)', fontSize: 14, marginTop: 2, fontWeight: 600 }}>Live Sessions</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
              background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${autoRefresh ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: autoRefresh ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.3)',
              fontSize: 10, letterSpacing: '0.08em', transition: 'all 0.15s ease',
            }}
          >
            {autoRefresh ? <Wifi size={11} /> : <WifiOff size={11} />}
            {autoRefresh ? 'LIVE' : 'PAUSED'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
              background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)',
              color: 'rgba(0,180,255,0.5)', fontSize: 10, letterSpacing: '0.08em',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            REFRESH
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', color: 'rgba(255,100,90,0.85)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle size={13} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Active',  count: counts.active,  color: '#34d399' },
          { label: 'Waiting', count: counts.waiting, color: '#facc15' },
          { label: 'Paused',  count: counts.paused,  color: '#fb923c' },
          { label: 'Total',   count: counts.all,     color: '#00b4ff' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,10,22,0.75)', border: `1px solid ${color}22`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 20px ${color}50` }}>
              {loading ? '—' : count}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {filterOptions.map((f) => {
          const active = filter === f.id;
          const cfg    = f.id !== 'all' ? STATUS_CONFIG[f.id as LiveSessionStatus] : null;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              background: active ? 'rgba(0,180,255,0.12)' : 'transparent',
              border: `1px solid ${active ? 'rgba(0,180,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: active ? '#00d4ff' : 'rgba(255,255,255,0.35)',
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {cfg && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />}
              {f.label}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, letterSpacing: '0.12em' }}>
            SYNC {lastSync.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </div>

      {/* ── Session list ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(52,211,153,0.4)' }} />
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
          No {filter === 'all' ? '' : filter} sessions right now
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence initial={false}>
            {visible.map((session) => {
              const cfg      = STATUS_CONFIG[session.status as LiveSessionStatus] ?? STATUS_CONFIG.waiting;
              const isOpen   = expanded === session.sessionId;
              const isEnding = endingId === session.sessionId;

              return (
                <motion.div
                  key={session.sessionId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  style={{ borderRadius: 10, overflow: 'hidden', background: 'rgba(0,10,22,0.75)', border: `1px solid ${cfg.rowBorder}` }}
                >
                  {/* ── Row ── */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : session.sessionId)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Status dot */}
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cfg.dot, boxShadow: session.status === 'active' ? cfg.dotGlow : 'none' }} />

                    {/* Data grid */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '110px 100px 130px 130px 70px 80px', gap: 8, alignItems: 'center', minWidth: 0 }}>

                      {/* Session ID */}
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Session</p>
                        <p style={{ color: 'rgba(180,220,255,0.7)', fontSize: 11 }}>{shortId(session.sessionId)}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Status</p>
                        <p style={{ fontSize: 11, color: cfg.labelColor, fontWeight: 600 }}>{cfg.label}</p>
                      </div>

                      {/* Student */}
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Student</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <GraduationCap size={10} style={{ color: 'rgba(167,139,250,0.5)', flexShrink: 0 }} />
                          <p style={{ color: 'rgba(200,200,255,0.7)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {session.studentUsername}
                          </p>
                        </div>
                      </div>

                      {/* Tutor */}
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Tutor</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCircle size={10} style={{ color: session.tutorUsername ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                          <p style={{ color: session.tutorUsername ? 'rgba(200,240,220,0.7)' : 'rgba(255,255,255,0.2)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {session.tutorUsername ?? 'Waiting…'}
                          </p>
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Subject</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {session.subjectName
                            ? <><BookMarked size={9} style={{ color: 'rgba(0,180,255,0.4)', flexShrink: 0 }} /><p style={{ color: 'rgba(200,230,255,0.65)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.subjectName}</p></>
                            : <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>—</p>
                          }
                        </div>
                      </div>

                      {/* Elapsed */}
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Elapsed</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} style={{ color: 'rgba(0,180,255,0.4)' }} />
                          <p style={{ color: 'rgba(200,230,255,0.55)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{elapsed(session.startedAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right-side actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* Type badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {session.type === 'instant'
                          ? <MessageCircle size={9} style={{ color: 'rgba(0,180,255,0.5)' }} />
                          : <BookOpen size={9} style={{ color: 'rgba(167,139,250,0.5)' }} />
                        }
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>{session.type}</span>
                      </div>

                      {/* Participants */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Users size={9} style={{ color: session.participantCount < 2 ? 'rgba(250,204,21,0.6)' : 'rgba(52,211,153,0.6)' }} />
                        <span style={{ color: session.participantCount < 2 ? 'rgba(250,204,21,0.7)' : 'rgba(52,211,153,0.7)', fontSize: 9 }}>{session.participantCount}/2</span>
                      </div>

                      {/* Force end */}
                      <button
                        onClick={(e) => forceEnd(session.sessionId, e)}
                        disabled={!!endingId}
                        title="Force end session"
                        style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)', cursor: endingId ? 'default' : 'pointer', opacity: endingId && !isEnding ? 0.3 : 1, transition: 'all 0.15s ease' }}
                      >
                        {isEnding
                          ? <Loader2 size={12} className="animate-spin" style={{ color: '#ff453a' }} />
                          : <XCircle size={12} style={{ color: 'rgba(255,69,58,0.6)' }} />
                        }
                      </button>

                      {isOpen
                        ? <ChevronUp size={13} style={{ color: 'rgba(0,180,255,0.4)' }} />
                        : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      }
                    </div>
                  </button>

                  {/* ── Expanded detail ── */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid rgba(0,180,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                          {[
                            { label: 'Session ID',    value: session.sessionId },
                            { label: 'Student',       value: `${session.studentUsername} (${session.studentId.slice(0,8)})` },
                            { label: 'Tutor',         value: session.tutorUsername ? `${session.tutorUsername} (${session.tutorId!.slice(0,8)})` : 'Not assigned' },
                            { label: 'Subject',       value: session.subjectName ?? (session.subjectId ? `ID: ${session.subjectId.slice(0,8)}` : '—') },
                            { label: 'Started',       value: new Date(session.startedAt).toLocaleString() },
                            { label: 'Status',        value: session.status },
                            { label: 'Type',          value: session.type },
                            { label: 'Participants',  value: session.participants.length > 0 ? session.participants.map(p => p.slice(0,6)).join(', ') : `${session.participantCount} total` },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
                              <p style={{ color: 'rgba(180,220,255,0.6)', fontSize: 10, wordBreak: 'break-all' }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
