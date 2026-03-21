'use client';

import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, ChevronDown, RotateCcw, Cpu, Sparkles,
  MessageSquare, ChevronRight, Search, Loader2,
} from 'lucide-react';
import { useAuth }     from '@/contexts/AuthContext';
import { useSubjects } from '@/hooks/useSubjects';
import { subjectToModel, subjectHint } from '@/lib/subjectToModel';
import AssiMessage    from '@/components/shared/assi/AssiMessage';
import AssiTypingDots from '@/components/shared/assi/AssiTypingDots';
import type { Subject } from '@/hooks/useSubjects';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ── Virtual "General chat" subject (not from DB) ──────────────────
const GENERAL_SUBJECT: Subject = {
  id:         'casual',
  name:       'General chat',
  category:   'general',
  tutorCount: 0,
};

// ── Helpers ───────────────────────────────────────────────────────
function getGreeting(subject: Subject, username?: string): string {
  const name = username ? `, ${username}` : '';
  if (subject.id === 'casual') {
    return `Hey${name}. Nothing academic — just talk. What's on your mind?`;
  }
  return `Ready for ${subject.name}${name}. Ask me anything — a problem to solve, a concept to break down, or something to test your understanding.`;
}

function subjectFromParam(subjects: Subject[], param: string | null): Subject | null {
  if (!param) return null;
  const lower = param.toLowerCase();
  return subjects.find(s =>
    s.name.toLowerCase() === lower || s.id === lower
  ) ?? null;
}

type Message = { role: 'user' | 'assistant'; content: string; modelDisplay?: string };

// ── Subject picker ────────────────────────────────────────────────
function SubjectPicker({
  initial, subjects, csec, cape, isLoading, onSelect,
}: {
  initial:   Subject | null;
  subjects:  Subject[];
  csec:      Subject[];
  cape:      Subject[];
  isLoading: boolean;
  onSelect:  (s: Subject) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return { csec, cape };
    return {
      csec: csec.filter(s => s.name.toLowerCase().includes(q)),
      cape: cape.filter(s => s.name.toLowerCase().includes(q)),
    };
  }, [search, csec, cape]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-2xl mx-auto px-4 py-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-xl tracking-tight">Ask ASSI</h1>
          <p className="text-white/40 text-sm">Choose what you want to work on</p>
        </div>
      </div>

      {/* General chat */}
      <button
        onClick={() => onSelect(GENERAL_SUBJECT)}
        className="w-full glass rounded-2xl p-4 text-left mb-4 border border-white/8 hover:border-orange-400/25 hover:bg-orange-400/4 transition group flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/15 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={15} className="text-orange-400" />
        </div>
        <div className="flex-1">
          <p className="text-white/80 font-medium text-sm">General chat</p>
          <p className="text-white/35 text-xs mt-0.5">No subject — open conversation</p>
        </div>
        <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition" />
      </button>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/28" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isLoading ? 'Loading subjects…' : `Search ${subjects.length} subjects…`}
          disabled={isLoading}
          className="w-full glass-soft rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/22 outline-none border border-white/8 focus:border-white/18 transition disabled:opacity-40"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 gap-2 text-white/30 text-sm">
          <Loader2 size={15} className="animate-spin" />
          Loading subjects…
        </div>
      )}

      {/* Subject groups */}
      {!isLoading && (
        <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { label: 'CSEC', items: filtered.csec, color: 'text-emerald-400/50' },
            { label: 'CAPE', items: filtered.cape, color: 'text-purple-400/50'  },
          ].map(({ label, items, color }) =>
            items.length === 0 ? null : (
              <div key={label}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${color}`}>{label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map(s => {
                    const config    = subjectToModel(s.name, s.category);
                    const SubIcon   = config.icon;
                    const isInitial = initial?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onSelect(s)}
                        className={`glass-soft rounded-2xl p-3.5 text-left hover:bg-white/8 transition border ${
                          isInitial ? 'border-white/18 bg-white/5' : 'border-white/5'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2.5 ${
                          isInitial ? 'bg-white/10' : 'bg-white/5'
                        }`}>
                          <SubIcon size={13} className={isInitial ? config.color : 'text-white/28'} />
                        </div>
                        <p className={`text-xs font-medium leading-snug ${isInitial ? 'text-white/85' : 'text-white/55'}`}>
                          {s.name}
                        </p>
                        <p className={`text-[10px] mt-1 font-medium ${config.color} opacity-55`}>
                          {config.display}
                        </p>
                        {s.tutorCount > 0 && (
                          <p className="text-white/18 text-[10px] mt-0.5">
                            {s.tutorCount} tutor{s.tutorCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {!isLoading && filtered.csec.length === 0 && filtered.cape.length === 0 && (
            <div className="py-10 text-center text-white/25 text-sm">No subjects match "{search}"</div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Subject switcher (inside chat header) ─────────────────────────
function SubjectSwitcher({
  current, subjects, csec, cape, onSwitch,
}: {
  current:  Subject;
  subjects: Subject[];
  csec:     Subject[];
  cape:     Subject[];
  onSwitch: (s: Subject) => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');

  const config  = subjectToModel(current.name, current.category);
  const CurIcon = current.id === 'casual' ? MessageSquare : config.icon;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return { csec, cape };
    return {
      csec: csec.filter(s => s.name.toLowerCase().includes(q)),
      cape: cape.filter(s => s.name.toLowerCase().includes(q)),
    };
  }, [search, csec, cape]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 glass-soft rounded-xl px-3 py-1.5 border border-white/8 hover:border-white/15 transition"
      >
        <CurIcon size={12} className={current.id === 'casual' ? 'text-orange-400' : config.color} />
        <span className="text-white/55 text-xs font-medium max-w-[100px] truncate">{current.name}</span>
        <ChevronDown size={10} className={`text-white/25 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 overflow-hidden z-50 shadow-2xl"
              style={{ background: 'rgba(10,10,16,0.97)', backdropFilter: 'blur(24px)' }}
            >
              {/* Search */}
              <div className="p-2 border-b border-white/6">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search subjects…"
                  className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/22 outline-none border border-white/8 focus:border-white/18 transition"
                  autoFocus
                />
              </div>

              {/* General chat option */}
              <button
                onClick={() => { onSwitch(GENERAL_SUBJECT); setOpen(false); setSearch(''); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition text-left"
              >
                <MessageSquare size={13} className={current.id === 'casual' ? 'text-orange-400' : 'text-white/25'} />
                <span className={`text-xs font-medium ${current.id === 'casual' ? 'text-white/80' : 'text-white/45'}`}>
                  General chat
                </span>
                {current.id === 'casual' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
              </button>

              <div className="border-t border-white/5" />

              {/* Subject list */}
              <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {[
                  { label: 'CSEC', items: filtered.csec, color: 'text-emerald-400/45' },
                  { label: 'CAPE', items: filtered.cape, color: 'text-purple-400/45'  },
                ].map(({ label, items, color }) =>
                  items.length === 0 ? null : (
                    <div key={label}>
                      <p className={`px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest ${color}`}>{label}</p>
                      {items.map(s => {
                        const sc     = subjectToModel(s.name, s.category);
                        const SIcon  = sc.icon;
                        const active = s.id === current.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => { onSwitch(s); setOpen(false); setSearch(''); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition text-left"
                          >
                            <SIcon size={12} className={active ? sc.color : 'text-white/22'} />
                            <span className={`text-xs font-medium flex-1 truncate ${active ? 'text-white/80' : 'text-white/42'}`}>
                              {s.name}
                            </span>
                            {active && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
                {filtered.csec.length === 0 && filtered.cape.length === 0 && (
                  <p className="text-center text-white/22 text-xs py-6">No match for "{search}"</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat view ──────────────────────────────────────────────────────
function ChatView({
  subject, subjects, csec, cape, username, onReset, onSwitchSubject,
}: {
  subject:         Subject;
  subjects:        Subject[];
  csec:            Subject[];
  cape:            Subject[];
  username?:       string;
  onReset:         () => void;
  onSwitchSubject: (s: Subject) => void;
}) {
  const config  = useMemo(() => subjectToModel(subject.name, subject.category), [subject]);
  const SubIcon = subject.id === 'casual' ? MessageSquare : config.icon;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getGreeting(subject, username) },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [locked,   setLocked]   = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || locked) return;

    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/assist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          message:  trimmed,
          history,
          subject:  subject.name,
          subjectId: subject.id,
          category: subject.category,
          model:    config.model,
        }),
      });

      if (res.status === 429) {
        setLocked(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Message limit reached. Upgrade to ASSI+ to continue.',
        }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error();
      setMessages(prev => [...prev, {
        role:         'assistant',
        content:      data.reply,
        modelDisplay: config.display,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Connection dropped — try sending that again.',
      }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }, [input, loading, locked, messages, subject, config]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  }

  const colorClass = subject.id === 'casual' ? 'text-orange-400' : config.color;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">ASSI</span>
              <span className="text-white/20 text-xs">/</span>
              <SubIcon size={11} className={colorClass} />
              <span className="text-white/45 text-xs truncate max-w-[140px]">{subject.name}</span>
              {subject.category && subject.category !== 'general' && (
                <span className={`text-[9px] font-bold px-1.5 py-px rounded-full ${
                  subject.category === 'CAPE'
                    ? 'bg-purple-500/18 text-purple-300/70'
                    : 'bg-emerald-500/18 text-emerald-300/70'
                }`}>
                  {subject.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Cpu size={8} className={colorClass} />
              <span className={`text-[10px] font-medium ${colorClass}`}>{config.display}</span>
              <span className="text-white/18 text-[10px]">model</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SubjectSwitcher
            current={subject} subjects={subjects} csec={csec} cape={cape}
            onSwitch={s => { onSwitchSubject(s); }}
          />
          <button onClick={onReset} title="New chat"
            className="glass-soft rounded-xl p-1.5 text-white/28 hover:text-white/60 transition border border-white/6">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <div key={i}>
              <AssiMessage role={msg.role} content={msg.content} />
              {msg.role === 'assistant' && msg.modelDisplay && i > 0 && (
                <div className="flex items-center gap-1 ml-8 mt-1">
                  <Cpu size={8} className={`${colorClass} opacity-40`} />
                  <span className={`text-[9px] ${colorClass} opacity-35`}>{msg.modelDisplay}</span>
                </div>
              )}
            </div>
          ))}
          {isTyping && <AssiTypingDots key="typing" />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Rate limit */}
      <AnimatePresence>
        {locked && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-white/6 flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.04)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={11} className="text-orange-400" />
              <span className="text-white/38 text-xs">Message limit reached</span>
            </div>
            <button className="text-orange-400 text-xs font-semibold hover:text-orange-300 transition">
              Upgrade to ASSI+
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 sm:px-6 pb-4 pt-3 border-t border-white/6 flex-shrink-0">
        <div className="flex items-end gap-3 glass rounded-2xl px-4 py-3 border border-white/8 focus-within:border-white/15 transition">
          <textarea
            ref={inputRef} value={input}
            onChange={handleInputChange} onKeyDown={handleKeyDown}
            placeholder={locked ? 'Upgrade to ASSI+ to continue…' : subjectHint(subject.name)}
            disabled={locked || loading} rows={1}
            className="flex-1 bg-transparent text-sm text-white/85 placeholder-white/22 outline-none resize-none disabled:opacity-40 leading-relaxed pt-0.5"
            style={{ maxHeight: 140 }}
          />
          <button onClick={sendMessage} disabled={loading || locked || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-28 flex-shrink-0 mb-0.5"
            style={{ background: 'linear-gradient(135deg, #ff7a9c, #b84cff)' }}>
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Send size={13} className="text-white" />
            }
          </button>
        </div>
        <p className="text-white/14 text-[10px] text-center mt-2">Shift + Enter for new line</p>
      </div>
    </div>
  );
}

// ── Inner — reads search params + manages state ───────────────────
function AssiInner() {
  const searchParams             = useSearchParams();
  const { user }                 = useAuth();
  const { subjects, csec, cape, isLoading } = useSubjects();

  // Resolve initial subject from URL param — waits until subjects are loaded
  const initialSubject = useMemo(() => {
    if (isLoading) return null;
    return subjectFromParam(subjects, searchParams.get('subject'));
  }, [subjects, isLoading, searchParams]);

  const [subject,    setSubject]    = useState<Subject | null>(null);
  const [chatActive, setChatActive] = useState(false);
  const [chatKey,    setChatKey]    = useState(0);

  // Once subjects load and we have a URL param — auto-start chat
  useEffect(() => {
    if (initialSubject && !chatActive) {
      setSubject(initialSubject);
      setChatActive(true);
    }
  }, [initialSubject]);

  function startChat(s: Subject) {
    setSubject(s);
    setChatActive(true);
    setChatKey(k => k + 1);
  }

  function handleReset() {
    setChatActive(false);
    setSubject(null);
    setChatKey(k => k + 1);
  }

  function handleSwitchSubject(s: Subject) {
    setSubject(s);
    setChatKey(k => k + 1);
  }

  return (
    <AnimatePresence mode="wait">
      {!chatActive || !subject ? (
        <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SubjectPicker
            initial={initialSubject}
            subjects={subjects} csec={csec} cape={cape}
            isLoading={isLoading}
            onSelect={startChat}
          />
        </motion.div>
      ) : (
        <motion.div key={`chat-${chatKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ChatView
            subject={subject}
            subjects={subjects} csec={csec} cape={cape}
            username={user?.username}
            onReset={handleReset}
            onSwitchSubject={handleSwitchSubject}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AssiPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-white/28 text-xs tracking-widest uppercase animate-pulse">Loading…</span>
      </div>
    }>
      <AssiInner />
    </Suspense>
  );
}