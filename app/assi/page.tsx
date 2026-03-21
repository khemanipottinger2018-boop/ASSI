'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronDown, Sparkles, BookOpen, MessageCircle, RotateCcw, Cpu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStreak } from '@/hooks/useStreak';
import AssiMessage from '@/components/shared/assi/AssiMessage';
import AssiTypingDots from '@/components/shared/assi/AssiTypingDots';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ─────────────────────────────────────────────
// Model routing config
// Each subject maps to the strongest model for it.
// Model names shown to student — actual model strings sent to backend.
// ─────────────────────────────────────────────
const SUBJECT_MODELS: Record<string, { display: string; model: string; color: string }> = {
  mathematics:  { display: 'Reasoner',  model: 'o1-mini',           color: 'text-blue-400'   },
  physics:      { display: 'Reasoner',  model: 'o1-mini',           color: 'text-blue-400'   },
  chemistry:    { display: 'Reasoner',  model: 'o1-mini',           color: 'text-blue-400'   },
  english:      { display: 'Writer',    model: 'gpt-4o',            color: 'text-purple-400' },
  history:      { display: 'Writer',    model: 'gpt-4o',            color: 'text-purple-400' },
  geography:    { display: 'Writer',    model: 'gpt-4o',            color: 'text-purple-400' },
  biology:      { display: 'Analyst',   model: 'gpt-4o',            color: 'text-teal-400'   },
  economics:    { display: 'Analyst',   model: 'gpt-4o',            color: 'text-teal-400'   },
  computing:    { display: 'Coder',     model: 'gpt-4o',            color: 'text-emerald-400'},
  casual:       { display: 'ASSI',      model: 'gpt-4o-mini',       color: 'text-orange-400' },
};

const SUBJECTS = [
  { id: 'casual',      label: 'Just talk',   icon: '💬', group: null },
  { id: 'mathematics', label: 'Mathematics', icon: '📐', group: 'CSEC/CAPE' },
  { id: 'english',     label: 'English',     icon: '📝', group: 'CSEC/CAPE' },
  { id: 'biology',     label: 'Biology',     icon: '🧬', group: 'CSEC/CAPE' },
  { id: 'chemistry',   label: 'Chemistry',   icon: '⚗️',  group: 'CSEC/CAPE' },
  { id: 'physics',     label: 'Physics',     icon: '⚡', group: 'CSEC/CAPE' },
  { id: 'history',     label: 'History',     icon: '📜', group: 'CSEC/CAPE' },
  { id: 'geography',   label: 'Geography',   icon: '🌍', group: 'CSEC/CAPE' },
  { id: 'economics',   label: 'Economics',   icon: '📊', group: 'CSEC/CAPE' },
  { id: 'computing',   label: 'Computing',   icon: '💻', group: 'CSEC/CAPE' },
];

type Message = { role: 'user' | 'assistant'; content: string; model?: string };

function getGreeting(subject: string, username?: string): string {
  const name = username ? `, ${username}` : '';
  if (subject === 'casual') return `Hey${name}! 👋 I'm ASSI. No study mode — just talk. What's on your mind?`;
  const s = SUBJECTS.find(s => s.id === subject);
  const label = s?.label ?? subject;
  return `Hey${name}! I'm ready to help with ${label}. Ask me anything — working through a problem, need an explanation, or want to test your understanding?`;
}

// ─────────────────────────────────────────────
// Subject picker
// ─────────────────────────────────────────────
function SubjectPicker({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-white font-semibold text-2xl tracking-tight">Ask ASSI</h1>
          <p className="text-white/40 text-sm mt-2">Choose what you want to work on today</p>
        </div>

        {/* Just talk — featured */}
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => onSelect('casual')}
          className="w-full glass rounded-2xl p-4 text-left mb-3 border border-orange-400/15 hover:border-orange-400/30 hover:bg-orange-400/5 transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💬</span>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Just talk to ASSI</p>
              <p className="text-white/35 text-xs mt-0.5">No subject — casual conversation</p>
            </div>
            <span className="text-white/20 group-hover:text-white/50 transition text-sm">→</span>
          </div>
        </motion.button>

        {/* Subject grid */}
        <p className="text-white/25 text-[10px] uppercase tracking-widest px-1 mb-2">Study subjects</p>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECTS.filter(s => s.id !== 'casual').map((s, i) => {
            const model = SUBJECT_MODELS[s.id];
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.04 }}
                onClick={() => onSelect(s.id)}
                className="glass-soft rounded-2xl p-3.5 text-left hover:bg-white/8 transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-lg">{s.icon}</span>
                    <p className="text-white/75 text-sm font-medium mt-1.5">{s.label}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${model.color}`}>
                      {model.display} model
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Chat view
// ─────────────────────────────────────────────
function ChatView({
  subject, username, onReset,
}: {
  subject: string;
  username?: string;
  onReset: () => void;
}) {
  const subjectMeta = SUBJECTS.find(s => s.id === subject);
  const modelMeta   = SUBJECT_MODELS[subject] ?? SUBJECT_MODELS.casual;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getGreeting(subject, username) },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [locked,   setLocked]   = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const msgCount   = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || locked) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    msgCount.current += 1;

    try {
      const res = await fetch(`${API_URL}/api/ai/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: trimmed,
          history,
          subject,
          model: modelMeta.model,
        }),
      });

      if (res.status === 429) {
        setLocked(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "You've reached your limit for now. Upgrade to ASSI+ for more messages, or try again shortly.",
        }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        model: modelMeta.display,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Lost my connection for a second — try sending that again?",
      }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }, [input, loading, locked, messages, subject, modelMeta]);

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">ASSI</span>
              {subject !== 'casual' && (
                <span className="text-white/30 text-xs">·</span>
              )}
              {subject !== 'casual' && (
                <span className="text-white/50 text-xs">{subjectMeta?.label}</span>
              )}
            </div>
            {/* Model indicator */}
            <div className="flex items-center gap-1 mt-0.5">
              <Cpu size={9} className={modelMeta.color} />
              <span className={`text-[10px] font-medium ${modelMeta.color}`}>
                {modelMeta.display}
              </span>
              <span className="text-white/20 text-[10px]">model active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subject switcher */}
          <div className="relative">
            <button
              onClick={() => setShowPicker(p => !p)}
              className="flex items-center gap-1.5 glass-soft rounded-xl px-3 py-1.5 text-white/40 hover:text-white/70 text-xs transition"
            >
              {subjectMeta?.icon} Switch
              <ChevronDown size={11} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 glass rounded-2xl border border-white/10 overflow-hidden z-50 shadow-2xl"
                  style={{ background: 'rgba(16,16,22,0.95)', backdropFilter: 'blur(24px)' }}
                >
                  {SUBJECTS.map(s => {
                    const m = SUBJECT_MODELS[s.id];
                    return (
                      <button
                        key={s.id}
                        onClick={() => { onReset(); setShowPicker(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/6 transition text-left"
                      >
                        <span className="text-sm">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-xs font-medium">{s.label}</p>
                          <p className={`text-[10px] ${m.color}`}>{m.display}</p>
                        </div>
                        {s.id === subject && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New chat */}
          <button
            onClick={onReset}
            className="glass-soft rounded-xl p-1.5 text-white/30 hover:text-white/60 transition"
            title="New chat"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <div key={i}>
              <AssiMessage role={msg.role} content={msg.content} />
              {/* Model attribution on assistant messages */}
              {msg.role === 'assistant' && msg.model && i > 0 && (
                <div className="flex items-center gap-1 ml-8 mt-1">
                  <Cpu size={8} className={modelMeta.color} />
                  <span className={`text-[9px] ${modelMeta.color} opacity-60`}>{msg.model}</span>
                </div>
              )}
            </div>
          ))}
          {isTyping && <AssiTypingDots key="typing" />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Limit banner ── */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 py-2.5 text-center text-xs border-t border-white/6 bg-white/2 flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Sparkles size={11} className="text-orange-400" />
            <span className="text-white/40">Message limit reached —</span>
            <button className="text-orange-400 font-medium hover:text-orange-300 transition">
              Upgrade to ASSI+
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <div className="px-4 pb-4 pt-3 border-t border-white/6 flex-shrink-0">
        <div className="flex items-end gap-2 glass-soft rounded-2xl px-3 py-2.5 border border-white/8 focus-within:border-white/15 transition">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={locked ? 'Upgrade to ASSI+ to continue…' : `Ask about ${subjectMeta?.label ?? 'anything'}…`}
            disabled={locked || loading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/85 placeholder-white/25 outline-none resize-none disabled:opacity-40 leading-relaxed pt-0.5"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || locked || !input.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition disabled:opacity-30 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff7a9c, #b84cff)' }}
          >
            <Send size={13} className="text-white" />
          </button>
        </div>
        <p className="text-white/15 text-[10px] text-center mt-2">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────
export default function AssiPage() {
  const { user } = useAuth();
  const { streak } = useStreak();

  const [subject, setSubject] = useState<string | null>(null);
  const [key, setKey]         = useState(0); // force ChatView remount on reset

  function handleReset() {
    setSubject(null);
    setKey(k => k + 1);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {!subject ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SubjectPicker onSelect={setSubject} />
          </motion.div>
        ) : (
          <motion.div
            key={`chat-${key}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChatView
              subject={subject}
              username={user?.username}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}