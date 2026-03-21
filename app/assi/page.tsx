'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, ChevronDown, RotateCcw, Cpu, Sparkles,
  BookOpen, Calculator, FlaskConical, Globe, Code2,
  Landmark, Leaf, BarChart2, MessageSquare, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AssiMessage    from '@/components/shared/assi/AssiMessage';
import AssiTypingDots from '@/components/shared/assi/AssiTypingDots';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type SubjectConfig = {
  id:      string;
  label:   string;
  icon:    React.ElementType;
  model:   string;
  display: string;
  color:   string;
  hint:    string;
};

const SUBJECTS: SubjectConfig[] = [
  { id: 'casual',      label: 'General chat', icon: MessageSquare, model: 'gpt-4o-mini', display: 'ASSI',     color: 'text-orange-400', hint: 'Ask me anything…' },
  { id: 'mathematics', label: 'Mathematics',  icon: Calculator,    model: 'o1-mini',     display: 'Reasoner', color: 'text-blue-400',   hint: 'Walk me through a problem…' },
  { id: 'physics',     label: 'Physics',      icon: Cpu,           model: 'o1-mini',     display: 'Reasoner', color: 'text-blue-400',   hint: 'Explain a concept or solve a problem…' },
  { id: 'chemistry',   label: 'Chemistry',    icon: FlaskConical,  model: 'o1-mini',     display: 'Reasoner', color: 'text-blue-400',   hint: 'Reactions, structures, calculations…' },
  { id: 'biology',     label: 'Biology',      icon: Leaf,          model: 'gpt-4o',      display: 'Analyst',  color: 'text-teal-400',   hint: 'Cells, systems, organisms…' },
  { id: 'english',     label: 'English',      icon: BookOpen,      model: 'gpt-4o',      display: 'Writer',   color: 'text-purple-400', hint: 'Essay help, comprehension, grammar…' },
  { id: 'history',     label: 'History',      icon: Landmark,      model: 'gpt-4o',      display: 'Writer',   color: 'text-purple-400', hint: 'Events, analysis, essay structure…' },
  { id: 'geography',   label: 'Geography',    icon: Globe,         model: 'gpt-4o',      display: 'Writer',   color: 'text-purple-400', hint: 'Maps, climate, human geography…' },
  { id: 'economics',   label: 'Economics',    icon: BarChart2,     model: 'gpt-4o',      display: 'Analyst',  color: 'text-teal-400',   hint: 'Micro, macro, Caribbean economics…' },
  { id: 'computing',   label: 'Computing',    icon: Code2,         model: 'gpt-4o',      display: 'Coder',    color: 'text-emerald-400',hint: 'Code, algorithms, concepts…' },
];

function subjectFromParam(param: string | null): SubjectConfig {
  if (!param) return SUBJECTS[0];
  return SUBJECTS.find(s =>
    s.id === param.toLowerCase() || s.label.toLowerCase() === param.toLowerCase()
  ) ?? SUBJECTS[0];
}

function getGreeting(s: SubjectConfig, username?: string) {
  const name = username ? `, ${username}` : '';
  if (s.id === 'casual') return `Hey${name}. Nothing academic — just talk. What's on your mind?`;
  return `Ready for ${s.label}${name}. Ask me anything — a problem to solve, a concept to break down, or something to test your understanding.`;
}

type Message = { role: 'user' | 'assistant'; content: string; modelDisplay?: string };

// ── Subject picker ────────────────────────────
function SubjectPicker({ initial, onSelect }: { initial: SubjectConfig; onSelect: (s: SubjectConfig) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-2xl mx-auto px-4 py-10"
    >
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
        onClick={() => onSelect(SUBJECTS[0])}
        className="w-full glass rounded-2xl p-4 text-left mb-3 border border-white/8 hover:border-orange-400/25 hover:bg-orange-400/4 transition group flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/18 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={15} className="text-orange-400" />
        </div>
        <div className="flex-1">
          <p className="text-white/80 font-medium text-sm">General chat</p>
          <p className="text-white/35 text-xs mt-0.5">No subject — open conversation</p>
        </div>
        <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition" />
      </button>

      <p className="text-white/25 text-[10px] uppercase tracking-widest mb-3 px-1">Study subjects</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SUBJECTS.slice(1).map((s, i) => {
          const Icon = s.icon;
          const isInitial = s.id === initial.id;
          return (
            <motion.button
              key={s.id}
              onClick={() => onSelect(s)}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className={`glass-soft rounded-2xl p-4 text-left hover:bg-white/8 transition border ${
                isInitial ? 'border-white/18 bg-white/5' : 'border-white/6'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${isInitial ? 'bg-white/10' : 'bg-white/5'}`}>
                <Icon size={14} className={isInitial ? s.color : 'text-white/30'} />
              </div>
              <p className={`text-sm font-medium ${isInitial ? 'text-white/85' : 'text-white/55'}`}>{s.label}</p>
              <p className={`text-[10px] mt-0.5 font-medium ${s.color} opacity-60`}>{s.display} model</p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Subject switcher dropdown ──────────────────
function SubjectSwitcher({ current, onSwitch }: { current: SubjectConfig; onSwitch: (s: SubjectConfig) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 glass-soft rounded-xl px-3 py-1.5 border border-white/8 hover:border-white/15 transition"
      >
        <Icon size={12} className={current.color} />
        <span className="text-white/55 text-xs font-medium">{current.label}</span>
        <ChevronDown size={10} className={`text-white/25 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 top-full mt-2 w-52 rounded-2xl border border-white/10 overflow-hidden z-50 shadow-2xl"
              style={{ background: 'rgba(10,10,16,0.97)', backdropFilter: 'blur(24px)' }}
            >
              {SUBJECTS.map(s => {
                const SIcon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => { onSwitch(s); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/5 transition text-left"
                  >
                    <SIcon size={13} className={s.id === current.id ? s.color : 'text-white/25'} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${s.id === current.id ? 'text-white/80' : 'text-white/45'}`}>{s.label}</p>
                      <p className={`text-[10px] ${s.color} opacity-55`}>{s.display}</p>
                    </div>
                    {s.id === current.id && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat view ──────────────────────────────────
function ChatView({ subject, username, onReset, onSwitchSubject }: {
  subject: SubjectConfig; username?: string;
  onReset: () => void; onSwitchSubject: (s: SubjectConfig) => void;
}) {
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
        body: JSON.stringify({ message: trimmed, history, subject: subject.id, model: subject.model }),
      });

      if (res.status === 429) {
        setLocked(true);
        setMessages(prev => [...prev, { role: 'assistant', content: "Message limit reached. Upgrade to ASSI+ to continue." }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, modelDisplay: subject.display }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection dropped — try sending that again." }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }, [input, loading, locked, messages, subject]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  }

  const SubjectIcon = subject.icon;

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
              <SubjectIcon size={11} className={subject.color} />
              <span className="text-white/45 text-xs">{subject.label}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Cpu size={8} className={subject.color} />
              <span className={`text-[10px] font-medium ${subject.color}`}>{subject.display}</span>
              <span className="text-white/18 text-[10px]">model active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SubjectSwitcher current={subject} onSwitch={onSwitchSubject} />
          <button onClick={onReset} title="New chat"
            className="glass-soft rounded-xl p-1.5 text-white/30 hover:text-white/60 transition border border-white/6">
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
                  <Cpu size={8} className={`${subject.color} opacity-40`} />
                  <span className={`text-[9px] ${subject.color} opacity-35`}>{msg.modelDisplay}</span>
                </div>
              )}
            </div>
          ))}
          {isTyping && <AssiTypingDots key="typing" />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Rate limit banner */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-white/6 flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.04)' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={11} className="text-orange-400" />
              <span className="text-white/40 text-xs">Message limit reached</span>
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
            placeholder={locked ? 'Upgrade to ASSI+ to continue…' : subject.hint}
            disabled={locked || loading} rows={1}
            className="flex-1 bg-transparent text-sm text-white/85 placeholder-white/25 outline-none resize-none disabled:opacity-40 leading-relaxed pt-0.5"
            style={{ maxHeight: 140 }}
          />
          <button
            onClick={sendMessage} disabled={loading || locked || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-30 flex-shrink-0 mb-0.5"
            style={{ background: 'linear-gradient(135deg, #ff7a9c, #b84cff)' }}
          >
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Send size={13} className="text-white" />
            }
          </button>
        </div>
        <p className="text-white/15 text-[10px] text-center mt-2">Shift + Enter for new line</p>
      </div>
    </div>
  );
}

// ── Inner component reads search params ────────
function AssiInner() {
  const searchParams   = useSearchParams();
  const { user }       = useAuth();
  const initialSubject = subjectFromParam(searchParams.get('subject'));

  const [subject,    setSubject]    = useState<SubjectConfig>(initialSubject);
  const [chatActive, setChatActive] = useState(!!searchParams.get('subject'));
  const [chatKey,    setChatKey]    = useState(0);

  function startChat(s: SubjectConfig) {
    setSubject(s);
    setChatActive(true);
    setChatKey(k => k + 1);
  }

  function handleReset() {
    setChatActive(false);
    setChatKey(k => k + 1);
  }

  function handleSwitchSubject(s: SubjectConfig) {
    setSubject(s);
    setChatKey(k => k + 1);
  }

  return (
    <AnimatePresence mode="wait">
      {!chatActive ? (
        <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SubjectPicker initial={initialSubject} onSelect={startChat} />
        </motion.div>
      ) : (
        <motion.div key={`chat-${chatKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ChatView
            subject={subject} username={user?.username}
            onReset={handleReset} onSwitchSubject={handleSwitchSubject}
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
        <span className="text-white/30 text-xs tracking-widest uppercase animate-pulse">Loading…</span>
      </div>
    }>
      <AssiInner />
    </Suspense>
  );
}