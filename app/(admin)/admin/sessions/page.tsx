'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Loader2, XCircle,
  Users, Clock, ChevronDown, ChevronUp,
  MessageCircle, BookOpen, Wifi, WifiOff,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';
type SessionType   = 'instant' | 'booked';

type LiveSession = {
  sessionId:        string;
  status:           SessionStatus;
  type:             SessionType;
  studentId:        string;
  tutorId:          string | null;
  subjectId:        string | null;
  startedAt:        number;
  participantCount: number;
  messageCount?:    number;
};

const STATUS_CONFIG: Record<SessionStatus, {
  dot: string; dotGlow: string; label: string; labelColor: string; rowBorder: string;
}> = {
  waiting: { dot: '#facc15', dotGlow: '0 0 8px rgba(250,204,21,0.8)', label: 'WAITING', labelColor: 'rgba(250,204,21,0.85)', rowBorder: 'rgba(250,204,21,0.1)'    },
  active:  { dot: '#34d399', dotGlow: '0 0 8px rgba(52,211,153,0.8)', label: 'ACTIVE',  labelColor: 'rgba(52,211,153,0.85)', rowBorder: 'rgba(52,211,153,0.12)'   },
  paused:  { dot: '#fb923c', dotGlow: '0 0 8px rgba(251,146,60,0.7)', label: 'PAUSED',  labelColor: 'rgba(251,146,60,0.85)', rowBorder: 'rgba(251,146,60,0.1)'    },
  ended:   { dot: 'rgba(255,255,255,0.2)', dotGlow: 'none',           label: 'ENDED',   labelColor: 'rgba(255,255,255,0.25)', rowBorder: 'rgba(255,255,255,0.06)' },
};

const STATUS_ORDER: SessionStatus[] = ['active', 'waiting', 'paused', 'ended'];

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
  const [endingId,    setEndingId]    = useState<string | null>(null);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [filter,      setFilter]      = useState<SessionStatus | 'all'>('all');
  const [lastSync,    setLastSync]    = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.getLiveSessions();
      if (data.success) {
        setSessions(
          (data.sessions as LiveSession[]).sort(
            (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
          )
        );
      }
    } catch { /* silent */ }
    finally { setLoading(false); setLastSync(new Date()); }
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
      await adminApi.endSession(sessionId);
      await load();
    } finally { setEndingId(null); }
  }

  const visible = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);
  const counts  = {
    all:     sessions.length,
    active:  sessions.filter(s => s.status === 'active').length,
    waiting: sessions.filter(s => s.status === 'waiting').length,
    paused:  sessions.filter(s => s.status === 'paused').length,
    ended:   sessions.filter(s => s.status === 'ended').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'DM Mono', 'Fira Code', monospace" }}>

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
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            REFRESH
          </button>
        </div>
      </div>

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

      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'active', 'waiting', 'paused', 'ended'] as const).map((f) => {
          const active = filter === f;
          const cfg    = f === 'all' ? null : STATUS_CONFIG[f];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              background: active ? 'rgba(0,180,255,0.12)' : 'transparent',
              border: `1px solid ${active ? 'rgba(0,180,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: active ? '#00d4ff' : 'rgba(255,255,255,0.35)',
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {cfg && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />}
              {f === 'all' ? `All (${counts.all})` : `${f} (${counts[f]})`}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, letterSpacing: '0.12em' }}>
            SYNC {lastSync.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={18} style={{ color: 'rgba(52,211,153,0.4)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
          No {filter === 'all' ? '' : filter} sessions right now
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence initial={false}>
            {visible.map((session) => {
              const cfg      = STATUS_CONFIG[session.status];
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
                  <button
                    onClick={() => setExpanded(isOpen ? null : session.sessionId)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cfg.dot, boxShadow: cfg.dotGlow }} />
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '120px 90px 100px 80px 80px 1fr', gap: 8, alignItems: 'center', minWidth: 0 }}>
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Session</p>
                        <p style={{ color: 'rgba(180,220,255,0.7)', fontSize: 11 }}>{shortId(session.sessionId)}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Status</p>
                        <p style={{ fontSize: 11, color: cfg.labelColor, fontWeight: 600 }}>{cfg.label}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Subject</p>
                        <p style={{ color: 'rgba(200,230,255,0.55)', fontSize: 11 }}>—</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Type</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {session.type === 'instant'
                            ? <MessageCircle size={10} style={{ color: 'rgba(0,180,255,0.5)' }} />
                            : <BookOpen size={10} style={{ color: 'rgba(167,139,250,0.6)' }} />
                          }
                          <p style={{ color: 'rgba(200,230,255,0.45)', fontSize: 11, textTransform: 'capitalize' }}>{session.type}</p>
                        </div>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Users</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={10} style={{ color: 'rgba(0,180,255,0.4)' }} />
                          <p style={{ color: session.participantCount < 2 ? 'rgba(250,204,21,0.7)' : 'rgba(52,211,153,0.7)', fontSize: 11 }}>
                            {session.participantCount} / 2
                          </p>
                        </div>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Elapsed</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} style={{ color: 'rgba(0,180,255,0.4)' }} />
                          <p style={{ color: 'rgba(200,230,255,0.55)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{elapsed(session.startedAt)}</p>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {session.status !== 'ended' && (
                        <button
                          onClick={(e) => forceEnd(session.sessionId, e)}
                          disabled={!!endingId}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)', cursor: endingId ? 'default' : 'pointer', opacity: endingId && !isEnding ? 0.3 : 1, transition: 'all 0.15s ease' }}
                        >
                          {isEnding
                            ? <Loader2 size={12} style={{ color: '#ff453a', animation: 'spin 1s linear infinite' }} />
                            : <XCircle size={12} style={{ color: 'rgba(255,69,58,0.6)' }} />
                          }
                        </button>
                      )}
                      {isOpen
                        ? <ChevronUp size={13} style={{ color: 'rgba(0,180,255,0.4)' }} />
                        : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      }
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid rgba(0,180,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                          {[
                            { label: 'Session ID', value: session.sessionId },
                            { label: 'Student ID', value: session.studentId },
                            { label: 'Tutor ID',   value: session.tutorId ?? 'Not assigned' },
                            { label: 'Subject ID', value: session.subjectId ?? '—' },
                            { label: 'Started',    value: new Date(session.startedAt).toLocaleString() },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
                              <p style={{ color: 'rgba(180,220,255,0.6)', fontSize: 11, wordBreak: 'break-all' }}>{value}</p>
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