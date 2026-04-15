'use client';

import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, ChevronDown, RotateCcw, Cpu, Sparkles,
  MessageSquare, ChevronRight, Search, Loader2,
  Paperclip, Mic, MicOff, X, Image as ImageIcon, FileText,
  Zap,
} from 'lucide-react';
import { useAuth }     from '@/features/auth';
import { useFeatures } from '@/features/platform';
import { useSubjects } from '@/features/platform';
import { subjectToModel, subjectHint } from '@/features/platform/subjectToModel';
import AssiMessage    from '@/features/assi/AssiMessage';
import AssiTypingDots from '@/features/assi/AssiTypingDots';
import type { Subject } from '@/features/platform';

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

type AttachedFile = {
  id:      string;
  file:    File;
  kind:    'image' | 'doc';
  preview: string | null; // data URL for images
};

type Message = {
  role:         'user' | 'assistant';
  content:      string;
  modelDisplay?: string;
  attachments?: { name: string; kind: 'image' | 'doc'; preview: string | null }[];
};

// File attachment limits by tier (message limits are now backend-enforced daily per subject)
const FILE_LIMITS = {
  free:  { fileMB: 5,  maxFiles: 2 },
  plus:  { fileMB: 20, maxFiles: 5 },
};

// Sanitize a subject name into a safe Redis key segment — must match backend tutor.ts
function subjectKey(name: string): string {
  return 'ai_tutor_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex w-full h-[calc(100vh-64px)]"
    >
      {/* ── Left panel — identity + general chat ── */}
      <div className="w-72 flex-shrink-0 border-r border-white/6 flex flex-col px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight leading-none">Ask ASSI</h1>
            <p className="text-white/35 text-xs mt-1">Choose what to work on</p>
          </div>
        </div>

        {/* General chat */}
        <button
          onClick={() => onSelect(GENERAL_SUBJECT)}
          className="w-full panel rounded-2xl p-4 text-left mb-6 border border-white/8 hover:border-orange-400/25 hover:bg-orange-400/4 transition group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/15 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={15} className="text-orange-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white/80 font-medium text-sm">General chat</p>
            <p className="text-white/35 text-xs mt-0.5">No subject</p>
          </div>
          <ChevronRight size={13} className="text-white/18 group-hover:text-white/50 transition" />
        </button>

        {/* Info */}
        <div className="mt-auto space-y-3">
          <div className="glass-soft rounded-2xl p-3.5">
            <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">How it works</p>
            <div className="space-y-2">
              {[
                'Pick a subject — ASSI loads the best model for it',
                'Ask anything: problems, concepts, practice questions',
                'Switch subjects anytime from the chat header',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-white/20 mt-1.5 flex-shrink-0" />
                  <p className="text-white/30 text-[11px] leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — subject grid ── */}
      <div className="flex-1 flex flex-col min-w-0 px-8 py-8 overflow-hidden">
        {/* Search */}
        <div className="relative mb-5 max-w-lg">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/28" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isLoading ? 'Loading subjects…' : `Search ${subjects.length} subjects…`}
            disabled={isLoading}
            className="w-full glass-soft rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/22 outline-none border border-white/8 focus:border-white/18 transition disabled:opacity-40"
            autoFocus
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center flex-1 gap-2 text-white/28 text-sm">
            <Loader2 size={15} className="animate-spin" />
            Loading subjects…
          </div>
        )}

        {/* Subject groups — scrollable grid */}
        {!isLoading && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
            {[
              { label: 'CSEC', items: filtered.csec, color: 'text-emerald-400/50' },
              { label: 'CAPE', items: filtered.cape, color: 'text-purple-400/50'  },
            ].map(({ label, items, color }) =>
              items.length === 0 ? null : (
                <div key={label}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 px-0.5 ${color}`}>{label}</p>
                  <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
                            <p className="text-white/15 text-[10px] mt-0.5">
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
              <div className="py-16 text-center text-white/22 text-sm">No subjects match "{search}"</div>
            )}
          </div>
        )}
      </div>
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
              style={{ background: 'rgba(10,10,16,0.97)' }}
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
  subject, subjects, csec, cape, username, isPlus, onReset, onSwitchSubject,
}: {
  subject:         Subject;
  subjects:        Subject[];
  csec:            Subject[];
  cape:            Subject[];
  username?:       string;
  isPlus:          boolean;
  onReset:         () => void;
  onSwitchSubject: (s: Subject) => void;
}) {
  const config  = useMemo(() => subjectToModel(subject.name, subject.category), [subject]);
  const SubIcon = subject.id === 'casual' ? MessageSquare : config.icon;

  const fileLimits = isPlus ? FILE_LIMITS.plus : FILE_LIMITS.free;

  const [messages,    setMessages]    = useState<Message[]>([
    { role: 'assistant', content: getGreeting(subject, username) },
  ]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [isTyping,    setIsTyping]    = useState(false);
  const [locked,      setLocked]      = useState(false);
  const [quotaUsed,   setQuotaUsed]   = useState(0);
  const [quotaLimit,  setQuotaLimit]  = useState<number | null>(20);
  const [files,       setFiles]       = useState<AttachedFile[]>([]);
  const [recording, setRecording] = useState(false);
  const [recError,  setRecError]  = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch per-subject daily quota from backend whenever the subject changes
  useEffect(() => {
    const key = subjectKey(subject.name);
    fetch(`${API_URL}/api/ai/tutor/usage?subjects=${key}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const used = data.usage[key] ?? 0;
          setQuotaUsed(used);
          setQuotaLimit(data.limit ?? null);
          if (data.limit !== null && used >= data.limit) setLocked(true);
          else setLocked(false);
        }
      })
      .catch(() => { /* fail open — don't block the UI */ });
  }, [subject]);

  // ── File attachment ──────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const remaining = fileLimits.maxFiles - files.length;
    const toAdd = picked.slice(0, remaining);
    toAdd.forEach(file => {
      if (file.size > fileLimits.fileMB * 1024 * 1024) return; // silently skip oversized
      const kind: 'image' | 'doc' = file.type.startsWith('image/') ? 'image' : 'doc';
      const id = crypto.randomUUID();
      if (kind === 'image') {
        const reader = new FileReader();
        reader.onload = ev => {
          setFiles(prev => [...prev, { id, file, kind, preview: ev.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      } else {
        setFiles(prev => [...prev, { id, file, kind, preview: null }]);
      }
    });
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  // ── Voice recording (Web Speech API transcription) ───────
  async function toggleRecording() {
    setRecError(null);
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Send to backend for transcription — wire to your /api/ai/transcribe endpoint
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'recording.webm');
          const res = await fetch(`${API_URL}/api/ai/transcribe`, {
            method: 'POST', credentials: 'include', body: fd,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setInput(prev => (prev ? prev + ' ' + data.text : data.text).trim());
              // Resize textarea
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto';
                  inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px';
                  inputRef.current.focus();
                }
              }, 50);
            }
          }
        } catch { /* transcription failed silently */ }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setRecError('Microphone access denied');
      setTimeout(() => setRecError(null), 3000);
    }
  }

  // ── Send ─────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && files.length === 0) || loading || locked) return;

    const attachments = files.map(f => ({ name: f.file.name, kind: f.kind, preview: f.preview }));
    const userMsg: Message = { role: 'user', content: trimmed || '(attached files)', attachments };

    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFiles([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/tutor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          message:   trimmed,
          history,
          subject:   subject.name,
          subjectId: subject.id,
          category:  subject.category,
          model:     config.model,
          hasFiles:  attachments.length > 0,
        }),
      });

      if (res.status === 429) {
        setLocked(true);
        setQuotaUsed(quotaLimit ?? 20);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `You've used your 20 daily messages for ${subject.name}. Resets at midnight — or upgrade to ASSI+ for unlimited.`,
        }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, modelDisplay: config.display }]);
      setQuotaUsed(prev => {
        const next = prev + 1;
        if (quotaLimit !== null && next >= quotaLimit) setLocked(true);
        return next;
      });
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection dropped — try sending that again.' }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }, [input, files, loading, locked, quotaUsed, quotaLimit, messages, subject, config]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  }

  const colorClass   = subject.id === 'casual' ? 'text-orange-400' : config.color;
  const msgsLeft     = quotaLimit !== null ? Math.max(0, quotaLimit - quotaUsed) : null;
  const showMsgWarn  = msgsLeft !== null && msgsLeft <= 5 && msgsLeft > 0;
  const canAttach    = files.length < fileLimits.maxFiles;

  return (
    // overflow-hidden is critical — prevents the AppShell scroll from
    // pushing the input up. The inner message div handles its own scroll.
    <div className="flex flex-col w-full" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/6 flex-shrink-0" style={{ background: 'var(--panel-bg)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-sm">ASSI</span>
              <span className="text-white/20 text-xs">/</span>
              <SubIcon size={11} className={colorClass} />
              <span className="text-white/55 text-sm font-medium">{subject.name}</span>
              {subject.category && subject.category !== 'general' && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  subject.category === 'CAPE'
                    ? 'bg-purple-500/15 text-purple-300/70 border border-purple-500/20'
                    : 'bg-emerald-500/15 text-emerald-300/70 border border-emerald-500/20'
                }`}>
                  {subject.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Cpu size={8} className={colorClass} />
              <span className={`text-[10px] font-medium ${colorClass}`}>{config.display}</span>
              <span className="text-white/18 text-[10px]">model</span>
              <span className="text-white/15 text-[10px]">·</span>
              {msgsLeft !== null
                ? <span className="text-white/22 text-[10px]">{msgsLeft} msg{msgsLeft !== 1 ? 's' : ''} left today</span>
                : <span className="text-white/22 text-[10px]">Unlimited</span>
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPlus && (
            <button className="flex items-center gap-1.5 glass-soft rounded-xl px-3 py-1.5 border border-orange-400/15 hover:border-orange-400/30 transition">
              <Zap size={11} className="text-orange-400" />
              <span className="text-orange-400 text-[11px] font-medium">ASSI+</span>
            </button>
          )}
          <SubjectSwitcher current={subject} subjects={subjects} csec={csec} cape={cape} onSwitch={onSwitchSubject} />
          <button onClick={onReset} title="New chat"
            className="glass-soft rounded-xl p-1.5 text-white/28 hover:text-white/60 transition border border-white/6">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        <div className="px-6 py-5 space-y-5">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {/* Attachments preview above message */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start ml-8'}`}>
                    {msg.attachments.map((a, ai) => (
                      <div key={ai} className="glass-soft rounded-xl overflow-hidden border border-white/8 flex items-center gap-2 px-2.5 py-1.5">
                        {a.kind === 'image' && a.preview
                          ? <img src={a.preview} alt={a.name} className="w-8 h-8 rounded-lg object-cover" />
                          : <FileText size={14} className="text-white/40" />
                        }
                        <span className="text-white/45 text-[11px] max-w-[120px] truncate">{a.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <AssiMessage role={msg.role} content={msg.content} />
                {msg.role === 'assistant' && msg.modelDisplay && i > 0 && (
                  <div className="flex items-center gap-1 ml-8 mt-1">
                    <Cpu size={8} className={`${colorClass} opacity-35`} />
                    <span className={`text-[9px] ${colorClass} opacity-30`}>{msg.modelDisplay}</span>
                  </div>
                )}
              </motion.div>
            ))}
            {isTyping && <AssiTypingDots key="typing" />}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Rate limit / warning banners ── */}
      <AnimatePresence>
        {(locked || showMsgWarn || recError) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-6 py-2 border-t border-white/6 flex-shrink-0 flex-wrap gap-2"
            style={{ background: locked ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.02)' }}>
            {recError && <span className="text-red-400 text-xs flex items-center gap-1.5"><MicOff size={11} /> {recError}</span>}
            {showMsgWarn && !locked && (
              <span className="text-white/35 text-xs">{msgsLeft} message{msgsLeft !== 1 ? 's' : ''} left today for {subject.name}</span>
            )}
            {locked && (
              <>
                <div className="flex items-center gap-2">
                  <Sparkles size={11} className="text-orange-400" />
                  <span className="text-white/40 text-xs">Message limit reached</span>
                </div>
                <button className="flex items-center gap-1.5 text-orange-400 text-xs font-semibold hover:text-orange-300 transition">
                  <Zap size={10} /> Upgrade to ASSI+
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input dock — always at bottom ── */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-white/6" style={{ background: 'rgba(0,0,0,0.12)' }}>

        {/* File previews row */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-2 max-w-5xl mx-auto">
              {files.map(f => (
                <div key={f.id} className="relative group glass-soft rounded-xl border border-white/8 overflow-hidden flex items-center gap-2 pl-2 pr-1 py-1">
                  {f.kind === 'image' && f.preview
                    ? <img src={f.preview} alt={f.file.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                    : <FileText size={14} className="text-white/40 flex-shrink-0" />
                  }
                  <span className="text-white/50 text-[11px] max-w-[100px] truncate">{f.file.name}</span>
                  <button onClick={() => removeFile(f.id)}
                    className="w-5 h-5 rounded-lg flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/8 transition flex-shrink-0">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input bar */}
        <div>
          <div className={`flex items-end gap-2 panel rounded-2xl px-3 py-2.5 border transition ${
            locked ? 'border-white/5 opacity-60' : 'border-white/8 focus-within:border-white/18'
          }`}>

            {/* File attach */}
            <button
              onClick={() => canAttach && fileRef.current?.click()}
              disabled={locked || !canAttach}
              title={canAttach ? 'Attach file or image' : `Max ${fileLimits.maxFiles} files`}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white/28 hover:text-white/65 hover:bg-white/6 transition disabled:opacity-30 mb-0.5"
            >
              <Paperclip size={15} />
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                locked        ? 'Upgrade to ASSI+ to continue…' :
                recording     ? 'Listening… click mic to stop' :
                subjectHint(subject.name)
              }
              disabled={locked || loading}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white/88 placeholder-white/22 outline-none resize-none disabled:opacity-40 leading-relaxed py-1"
              style={{ maxHeight: 160, minHeight: 28 }}
            />

            {/* Voice */}
            <button
              onClick={toggleRecording}
              disabled={locked}
              title={recording ? 'Stop recording' : 'Record voice message'}
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition mb-0.5 ${
                recording
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse'
                  : 'text-white/28 hover:text-white/65 hover:bg-white/6 disabled:opacity-30'
              }`}
            >
              {recording ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            {/* Send */}
            <button
              onClick={sendMessage}
              disabled={loading || locked || (!input.trim() && files.length === 0)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-25 flex-shrink-0 mb-0.5"
              style={{ background: 'linear-gradient(135deg, #ff7a9c, #b84cff)' }}
            >
              {loading
                ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send size={13} className="text-white" />
              }
            </button>
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between mt-1.5 px-1">
            <p className="text-white/14 text-[10px]">Shift + Enter for new line</p>
            <p className="text-white/14 text-[10px]">
              Max {fileLimits.fileMB}MB per file · {fileLimits.maxFiles} files · {quotaLimit !== null ? `${quotaLimit} messages/day` : 'Unlimited messages'}
              {!isPlus && <span className="text-orange-400/50"> — ASSI+ removes limits</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inner — reads search params + manages state ───────────────────
function AssiInner() {
  const searchParams             = useSearchParams();
  const { user }                 = useAuth();
  const { tier, features }       = useFeatures();
  const { subjects, csec, cape, isLoading } = useSubjects();
  const isPlus = tier === 'early_bird' || tier === 'alpha' || features?.ai_bundles;

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
    <>
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
              isPlus={!!isPlus}
              onReset={handleReset}
              onSwitchSubject={handleSwitchSubject}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
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