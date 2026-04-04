'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, Shield, RefreshCw,
  Wifi, WifiOff, Users, MessageCircle,
  Activity, AlertTriangle, ChevronRight,
  Cpu, Zap, Clock,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* ── Types ── */

type Message = {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
  ts:      Date;
};

type RuntimeMetrics = {
  responseTimeMs?: { avg: number };
  memoryHeapMb?:   number;
  socketConnections?: number;
};

type ContextSnap = {
  totalUsers:     number;
  onlineUsers:    number;
  activeSessions: number;
  totalSessions:  number;
  totalTutors:    number;
  totalStudents:  number;
  runtime?:       RuntimeMetrics;
};

/* ── Suggested prompts ── */

const SUGGESTIONS = [
  'Give me a full platform health summary right now.',
  'Are there any anomalies or things I should be aware of?',
  'How many users joined this week compared to last?',
  'What should I prioritise today as admin?',
  'Draft a platform maintenance announcement.',
  'Explain the current session activity.',
];

/* ── Helpers ── */

function uid() {
  return Math.random().toString(36).slice(2);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="w-1 h-1 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

/* ── Markdown-lite renderer ── */
function renderContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('### ')) return <p key={i} className="text-white/90 font-semibold text-sm mt-3 mb-1">{line.slice(4)}</p>;
    if (line.startsWith('## '))  return <p key={i} className="text-white font-semibold text-sm mt-3 mb-1">{line.slice(3)}</p>;
    if (line.startsWith('# '))   return <p key={i} className="text-white font-bold text-base mt-3 mb-1">{line.slice(2)}</p>;
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-orange-400/60 mt-1 flex-shrink-0">▸</span>
          <span className="text-white/75 text-sm leading-relaxed">{line.slice(2)}</span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    // Bold **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-white/75 text-sm leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-white/95 font-medium">{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    );
  });
}

/* ══════════════════════════════════════════════════
   SENTINEL PAGE
   ══════════════════════════════════════════════════ */

export default function SentinelPage() {
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [thinking,   setThinking]   = useState(false);
  const [context,    setContext]     = useState<ContextSnap | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [online,     setOnline]     = useState(true);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  /* ── Load context snapshot ── */
  const loadContext = useCallback(async () => {
    setCtxLoading(true);
    try {
      const [metricsRes, runtimeRes] = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getRuntimeMetrics(),
      ]);

      const m = metricsRes.status === 'fulfilled' && metricsRes.value.success
        ? (metricsRes.value as any).metrics
        : null;

      const r = runtimeRes.status === 'fulfilled' && runtimeRes.value.success
        ? (runtimeRes.value as any).runtime
        : null;

      if (m) setContext({ ...m, runtime: r ?? undefined });
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setCtxLoading(false);
    }
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);

  /* ── Auto scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  /* ── Send message ── */
  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;

    setInput('');

    const userMsg: Message = { id: uid(), role: 'user', content: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);

    historyRef.current = [
      ...historyRef.current,
      { role: 'user', content: msg },
    ];

    try {
      const res  = await fetch(`${API_URL}/api/ai/sentinel`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          message: msg,
          history: historyRef.current.slice(-12),
          context,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Sentinel unavailable');

      const reply = data.reply as string;
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];

      setMessages(prev => [...prev, {
        id: uid(), role: 'assistant', content: reply, ts: new Date(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id:      uid(),
        role:    'assistant',
        content: err?.message ?? 'Sentinel is currently unavailable.',
        ts:      new Date(),
      }]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-80px)]">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3 flex items-center justify-between border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
              <Shield size={16} className="text-orange-400" />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm tracking-tight flex items-center gap-2">
              Sentinel
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/25">
                ADMIN ONLY
              </span>
            </h1>
            <p className="text-white/30 text-[10px]">
              {online ? 'Platform AI co-pilot — online' : 'Offline — check API connection'}
            </p>
          </div>
        </div>

        {/* Context strip */}
        <div className="flex items-center gap-3">
          {ctxLoading ? (
            <Loader2 size={13} className="text-white/20 animate-spin" />
          ) : context ? (
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-white/30">
                <Users size={10} /> {context.totalUsers}
              </span>
              <span className="flex items-center gap-1 text-emerald-400/70">
                <Wifi size={10} /> {context.onlineUsers} online
              </span>
              <span className="flex items-center gap-1 text-blue-400/70">
                <MessageCircle size={10} /> {context.activeSessions} sessions
              </span>
              {context.runtime?.memoryHeapMb && (
                <span className="flex items-center gap-1 text-white/25">
                  <Cpu size={10} /> {context.runtime.memoryHeapMb}MB
                </span>
              )}
            </div>
          ) : null}
          <button onClick={loadContext} disabled={ctxLoading}
            className="glass-soft p-1.5 rounded-lg text-white/25 hover:text-white/50 transition">
            <RefreshCw size={12} className={ctxLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Welcome / empty state */}
        {isEmpty && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-6"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center">
                <Shield size={28} className="text-orange-400" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl border border-orange-500/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Sentinel Online</h2>
              <p className="text-white/35 text-sm mt-1 max-w-xs">
                Your platform co-pilot. Ask about health, users, sessions, or anything ASSI-related.
              </p>
            </div>

            {/* Live stats */}
            {context && (
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                {[
                  { icon: Users,         label: 'Users',    value: context.totalUsers,     color: 'text-white/70'   },
                  { icon: Wifi,          label: 'Online',   value: context.onlineUsers,    color: 'text-emerald-400'},
                  { icon: MessageCircle, label: 'Sessions', value: context.activeSessions, color: 'text-blue-400'   },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="panel rounded-xl px-3 py-2.5 text-center">
                    <Icon size={12} className={`${color} mx-auto mb-1`} />
                    <p className={`text-lg font-semibold ${color}`}>{value}</p>
                    <p className="text-white/25 text-[10px]">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            <div className="w-full max-w-sm space-y-1.5">
              <p className="text-white/20 text-[10px] uppercase tracking-widest mb-2">Try asking</p>
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="w-full text-left px-3 py-2.5 rounded-xl glass-soft border border-white/8 hover:border-white/20 hover:bg-white/8 transition group flex items-center gap-2">
                  <ChevronRight size={11} className="text-orange-400/50 group-hover:text-orange-400 transition flex-shrink-0" />
                  <span className="text-white/50 text-xs group-hover:text-white/75 transition">{s}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message bubbles */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="glass-soft w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Shield size={13} className="text-orange-400" />
                </div>
              )}

              <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-white/12 border border-white/15 rounded-tr-sm'
                    : 'panel border border-white/8 rounded-tl-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-white/90 text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="space-y-0.5">{renderContent(msg.content)}</div>
                  )}
                </div>
                <span className="text-white/20 text-[10px] px-1">{formatTime(msg.ts)}</span>
              </div>

              {msg.role === 'user' && (
                <div className="glass-soft w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap size={12} className="text-white/40" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking indicator */}
        {thinking && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="glass-soft w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <Shield size={13} className="text-orange-400" />
            </div>
            <div className="panel border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="text-orange-400/70 text-sm">
                <TypingDots />
              </span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions row (after first message) ── */}
      {!isEmpty && !thinking && (
        <div className="flex-shrink-0 px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {SUGGESTIONS.slice(0, 3).map((s) => (
            <button key={s} onClick={() => send(s)}
              className="flex-shrink-0 text-[11px] text-white/35 px-3 py-1.5 rounded-full glass-soft border border-white/8 hover:text-white/65 hover:border-white/20 transition whitespace-nowrap">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 px-4 pb-5 pt-2">
        <div className="panel rounded-2xl border border-white/10 flex items-end gap-3 px-4 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Sentinel anything about the platform…"
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-white/25 outline-none resize-none leading-relaxed max-h-32 overflow-y-auto"
            style={{ minHeight: '22px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-white/8 disabled:text-white/20 text-white transition flex items-center justify-center"
          >
            {thinking
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </button>
        </div>
        <p className="text-center text-white/15 text-[10px] mt-2">
          Sentinel · Admin only · Enter to send · Shift+Enter for new line
        </p>
      </div>

    </div>
  );
}