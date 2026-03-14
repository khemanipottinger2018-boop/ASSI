'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Clock, AlertTriangle, ArrowLeft, RefreshCw, XCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Message {
  messageId: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

interface SessionState {
  status: 'waiting' | 'active' | 'paused' | 'ended';
  type: 'instant' | 'booked';
  studentId: string;
  tutorId: string | null;
  subjectId: string | null;
  startedAt: number;
}

interface Props {
  sessionId: string;
}

export function AdminMonitorView({ sessionId }: Props) {
  const router = useRouter();

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [session,     setSession]     = useState<SessionState | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [ending,      setEnding]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const bottomRef    = useRef<HTMLDivElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Fetch session + messages ─────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/sessions/${sessionId}/messages`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to load session');
      }

      const data = await res.json();

      setSession(data.session);
      setMessages(data.messages ?? []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load session data');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial load + poll every 8 seconds
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 8_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ─── Force end session ────────────────────────────── */

  const handleForceEnd = async () => {
    if (ending) return;

    const confirmed = window.confirm(
      'Force-end this session? Both participants will be disconnected immediately.'
    );
    if (!confirmed) return;

    setEnding(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/sessions/${sessionId}/end`,
        { method: 'POST', credentials: 'include' }
      );

      if (!res.ok) throw new Error('Failed to end session');

      // Refresh to reflect ended state
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Could not end session');
    } finally {
      setEnding(false);
    }
  };

  /* ─── Helpers ───────────────────────────────────────── */

  const statusColor = {
    waiting: 'text-yellow-400',
    active:  'text-emerald-400',
    paused:  'text-orange-400',
    ended:   'text-white/30',
  };

  const statusDot = {
    waiting: 'bg-yellow-400 animate-pulse',
    active:  'bg-emerald-400',
    paused:  'bg-orange-400',
    ended:   'bg-white/20',
  };

  const elapsedMinutes = session
    ? Math.floor((Date.now() - session.startedAt) / 60_000)
    : 0;

  /* ─── Loading / error states ─────────────────────────── */

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw size={16} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="glass rounded-2xl px-8 py-10 text-center max-w-sm">
          <AlertTriangle size={20} className="text-red-400 mx-auto mb-3" />
          <p className="text-white/70 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-xs text-white/40 hover:text-white/70 transition"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Admin header bar ──────────────────────────── */}
      <div className="shrink-0 border-b border-white/10 bg-white/[0.02]">

        {/* Top row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push('/admin')}
            className="p-1.5 rounded-lg glass-soft text-white/40 hover:text-white/70 transition"
          >
            <ArrowLeft size={14} />
          </button>

          {/* Admin badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/20">
            <Shield size={11} className="text-orange-400" />
            <span className="text-orange-400 text-[10px] font-semibold tracking-wide uppercase">
              Admin Monitor
            </span>
          </div>

          {/* Session status */}
          {session && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusDot[session.status]}`} />
              <span className={`text-xs font-medium capitalize ${statusColor[session.status]}`}>
                {session.status}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Last refresh */}
            <span className="text-white/20 text-[10px]">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>

            {/* Manual refresh */}
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg glass-soft text-white/30 hover:text-white/60 transition"
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>

            {/* Force end */}
            {session && session.status !== 'ended' && (
              <button
                onClick={handleForceEnd}
                disabled={ending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/25 disabled:opacity-50 transition"
              >
                <XCircle size={12} />
                {ending ? 'Ending…' : 'Force end'}
              </button>
            )}
          </div>
        </div>

        {/* Session metadata row */}
        {session && (
          <div className="flex items-center gap-5 px-4 pb-3 text-[11px] text-white/30">
            <span className="font-mono truncate max-w-[160px]" title={sessionId}>
              {sessionId.slice(0, 8)}…
            </span>

            <span className="flex items-center gap-1">
              <Users size={10} />
              {session.tutorId ? '2 participants' : '1 participant (waiting)'}
            </span>

            <span className="flex items-center gap-1">
              <Clock size={10} />
              {elapsedMinutes}m elapsed
            </span>

            <span className="capitalize">{session.type} session</span>

            {session.subjectId && (
              <span>Subject: {session.subjectId}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Message feed ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">

        {/* Read-only notice */}
        <div className="flex justify-center mb-4">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/25 text-[10px]">
            Read-only — messages auto-refresh every 8s
          </span>
        </div>

        {messages.length === 0 && (
          <div className="flex justify-center pt-8">
            <p className="text-white/20 text-sm">No messages yet</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isStudent = msg.senderId === session?.studentId;

            return (
              <motion.div
                key={msg.messageId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex flex-col ${isStudent ? 'items-start' : 'items-end'}`}
              >
                {/* Sender label */}
                <span className="text-[9px] text-white/20 mb-1 px-1">
                  {isStudent ? 'Student' : 'Tutor'} · {new Date(msg.timestamp).toLocaleTimeString()}
                </span>

                <div className={`
                  max-w-sm lg:max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                  ${isStudent
                    ? 'bg-white/8 text-white/80 rounded-bl-sm'
                    : 'bg-orange-500/20 text-white/80 rounded-br-sm border border-orange-500/15'
                  }
                `}>
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Read-only input placeholder ───────────────── */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/8">
          <Shield size={12} className="text-white/20" />
          <span className="text-white/20 text-sm">Admins cannot send messages</span>
        </div>
      </div>
    </div>
  );
}
