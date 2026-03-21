'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Users, Shield, Upload, ChevronRight,
  FileText, Image, File, X, Loader2,
  CheckCircle, AlertTriangle, Info, ArrowLeft,
  Bot, Sparkles, Clock, DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Mode = 'select' | 'done' | 'guide' | 'review';

interface UploadedFile {
  file: File;
  id:   string;
  preview?: string;
}

interface ReviewResult {
  sentence:    string;
  likelihood:  number; // 0–1, probability of AI generation
  reasons:     string[];
  suggestion?: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const ACCEPTED = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp';

const MODES = [
  {
    id:    'done' as const,
    icon:  Zap,
    label: 'Get it done',
    sub:   'Submit your assignment. A tutor completes it for you.',
    accent: 'orange',
    bg:    'bg-orange-500/10 border-orange-500/20',
    iconCl: 'text-orange-400',
  },
  {
    id:    'guide' as const,
    icon:  Users,
    label: 'Guide me through it',
    sub:   'Work through your assignment live with a tutor.',
    accent: 'emerald',
    bg:    'bg-emerald-500/10 border-emerald-500/20',
    iconCl: 'text-emerald-400',
  },
  {
    id:    'review' as const,
    icon:  Shield,
    label: 'Review my work',
    sub:   'Deep AI analysis — spots flaws and AI-like writing.',
    accent: 'purple',
    bg:    'bg-purple-500/10 border-purple-500/20',
    iconCl: 'text-purple-400',
  },
];

const slide = {
  initial:  { opacity: 0, x: 32 },
  animate:  { opacity: 1, x: 0  },
  exit:     { opacity: 0, x: -32 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

// ─────────────────────────────────────────────
// File icon helper
// ─────────────────────────────────────────────
function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png','jpg','jpeg','webp'].includes(ext ?? '')) return <Image size={14} className="text-blue-400" />;
  if (['pdf'].includes(ext ?? ''))                       return <FileText size={14} className="text-red-400" />;
  return <File size={14} className="text-white/40" />;
}

// ─────────────────────────────────────────────
// Drop zone
// ─────────────────────────────────────────────
function DropZone({ files, onAdd, onRemove }: {
  files:    UploadedFile[];
  onAdd:    (f: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) onAdd(dropped);
  }, [onAdd]);

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all ${
          drag
            ? 'border-orange-400/60 bg-orange-400/6'
            : 'border-white/10 hover:border-white/20 hover:bg-white/3'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={e => { if (e.target.files) onAdd(Array.from(e.target.files)); }}
        />
        <Upload size={22} className="text-white/25 mx-auto mb-3" />
        <p className="text-white/50 text-sm font-medium">Drop files here or click to browse</p>
        <p className="text-white/25 text-xs mt-1">PDF, Word, images — any format</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className="glass-soft rounded-xl px-3 py-2.5 flex items-center gap-3">
              <FileIcon name={f.file.name} />
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-medium truncate">{f.file.name}</p>
                <p className="text-white/25 text-[10px]">
                  {(f.file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button onClick={() => onRemove(f.id)} className="text-white/25 hover:text-red-400 transition">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Mode 1 — Get it done
// ─────────────────────────────────────────────
function ModeDone({ onBack }: { onBack: () => void }) {
  const [files,    setFiles]    = useState<UploadedFile[]>([]);
  const [subject,  setSubject]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [deadline, setDeadline] = useState('');
  const [matching, setMatching] = useState<'auto' | 'manual'>('auto');
  const [step,     setStep]     = useState<'form' | 'submitted'>('form');
  const [estimate, setEstimate] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  function addFiles(incoming: File[]) {
    const next = incoming.map(f => ({ file: f, id: crypto.randomUUID() }));
    setFiles(prev => [...prev, ...next]);
  }

  async function handleSubmit() {
    if (!subject.trim() || files.length === 0) return;
    setLoading(true);
    // Estimate from backend — mock for now
    await new Promise(r => setTimeout(r, 1200));
    setEstimate('$15 – $40');
    setLoading(false);
    setStep('submitted');
  }

  if (step === 'submitted') {
    return (
      <motion.div {...slide} className="space-y-5">
        <BackBtn onClick={onBack} />
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-400/15 border border-orange-400/20 flex items-center justify-center mx-auto">
            <CheckCircle size={24} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Assignment submitted</h2>
            <p className="text-white/40 text-sm mt-1">
              {matching === 'auto'
                ? 'We\'re finding the best tutor for your assignment.'
                : 'Here\'s a shortlist of recommended tutors.'}
            </p>
          </div>
          {estimate && (
            <div className="glass-soft rounded-2xl px-4 py-3 inline-flex items-center gap-2 mx-auto">
              <DollarSign size={14} className="text-orange-400" />
              <span className="text-white/60 text-sm">Estimated cost:</span>
              <span className="text-orange-400 font-semibold text-sm">{estimate}</span>
            </div>
          )}
          <p className="text-white/25 text-xs">
            You'll pay once the tutor delivers. They may adjust the price — you'll be notified.
          </p>
        </div>

        {matching === 'manual' && (
          <div className="glass rounded-3xl p-5 space-y-3">
            <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Recommended tutors</p>
            {['Tutor A', 'Tutor B', 'Tutor C'].map((t, i) => (
              <div key={i} className="glass-soft rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-400/10 flex items-center justify-center text-orange-400 font-semibold text-sm flex-shrink-0">
                  {t[0]}
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-sm font-medium">{t}</p>
                  <p className="text-white/30 text-xs">95% match · {i + 1}h avg response</p>
                </div>
                <button className="glass-soft rounded-xl px-3 py-1.5 text-orange-400 text-xs font-medium border border-orange-400/20 hover:bg-orange-400/10 transition">
                  Request
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div {...slide} className="space-y-4">
      <BackBtn onClick={onBack} />

      <div className="glass rounded-3xl p-5 space-y-4">
        <SectionLabel icon={Zap} label="Assignment details" accent="orange" />

        <div className="space-y-3">
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject (e.g. Mathematics, Chemistry)"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-orange-400/30 transition"
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any specific instructions or context for the tutor…"
            rows={3}
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-orange-400/30 transition resize-none"
          />
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white/60 outline-none focus:ring-1 focus:ring-orange-400/30 transition"
          />
        </div>

        <DropZone
          files={files}
          onAdd={addFiles}
          onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
        />
      </div>

      {/* Matching toggle */}
      <div className="glass rounded-3xl p-4">
        <SectionLabel icon={Bot} label="How to find a tutor" accent="orange" />
        <div className="grid grid-cols-2 gap-2 mt-3">
          {([
            { id: 'auto',   label: 'Automatic',     sub: 'Best match picked for you' },
            { id: 'manual', label: 'I\'ll choose',  sub: 'See a shortlist of tutors'  },
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => setMatching(opt.id)}
              className={`rounded-2xl p-3 text-left border transition ${
                matching === opt.id
                  ? 'bg-orange-400/10 border-orange-400/30'
                  : 'glass-soft border-white/8 hover:border-white/15'
              }`}
            >
              <p className={`text-sm font-medium ${matching === opt.id ? 'text-orange-400' : 'text-white/60'}`}>
                {opt.label}
              </p>
              <p className="text-white/30 text-[11px] mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !subject.trim() || files.length === 0}
        className="w-full py-3.5 rounded-2xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-40 transition flex items-center justify-center gap-2 shadow-lg shadow-black/20"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Finding tutors…</>
          : <>Submit assignment <ChevronRight size={15} /></>
        }
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Mode 2 — Guide me through it
// ─────────────────────────────────────────────
function ModeGuide({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [files,   setFiles]   = useState<UploadedFile[]>([]);
  const [subject, setSubject] = useState('');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  function addFiles(incoming: File[]) {
    setFiles(prev => [...prev, ...incoming.map(f => ({ file: f, id: crypto.randomUUID() }))]);
  }

  async function handleStart() {
    if (!subject.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    router.push('/live-chat');
  }

  return (
    <motion.div {...slide} className="space-y-4">
      <BackBtn onClick={onBack} />

      <div className="glass rounded-3xl p-5 space-y-4">
        <SectionLabel icon={Users} label="Live guidance session" accent="emerald" />

        <div className="glass-soft rounded-2xl px-4 py-3 flex items-start gap-3">
          <Info size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-white/45 text-xs leading-relaxed">
            A tutor will work through your assignment with you in real time.
            You stay in control — they guide, explain, and help you understand.
          </p>
        </div>

        <div className="space-y-3">
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject or topic"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-emerald-400/30 transition"
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What do you need help with specifically?"
            rows={3}
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-emerald-400/30 transition resize-none"
          />
        </div>

        <DropZone
          files={files}
          onAdd={addFiles}
          onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
        />
      </div>

      {/* What to expect */}
      <div className="glass rounded-3xl p-5 space-y-3">
        <SectionLabel icon={Clock} label="What happens next" accent="emerald" />
        {[
          'Your request goes live — available tutors see it immediately',
          'A tutor accepts and a live session begins',
          'Work through your assignment together, step by step',
          'Session ends when you\'re done — you rate the tutor',
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-white/45 text-xs leading-relaxed">{s}</p>
          </div>
        ))}
      </div>

      <button
        onClick={handleStart}
        disabled={loading || !subject.trim()}
        className="w-full py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-40 transition flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Finding a tutor…</>
          : <>Start guided session <ChevronRight size={15} /></>
        }
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Mode 3 — Review my work (AI integrity scan)
// ─────────────────────────────────────────────

const MOCK_RESULTS: ReviewResult[] = [
  {
    sentence:   'The economic implications of globalisation have been extensively documented in numerous scholarly works.',
    likelihood: 0.91,
    reasons: [
      'Overly formal and generic phrasing with no specific claim',
      'Passive voice construction typical of AI-generated text',
      '"Extensively documented" is a common AI filler phrase with no citation',
    ],
    suggestion: 'Make a specific claim. E.g. "Rodrik (2011) argues globalisation creates a trilemma between..."',
  },
  {
    sentence:   'Furthermore, it is important to note that various factors contribute to this phenomenon.',
    likelihood: 0.97,
    reasons: [
      '"Furthermore" as a transition word is disproportionately common in LLM output',
      '"It is important to note" is a classic AI hedge with no informational content',
      '"Various factors" is vague — a human writer would list them',
    ],
    suggestion: 'Replace with the actual factors. If you don\'t know them, that\'s the gap to research.',
  },
  {
    sentence:   'Caribbean exports fell 12% in Q3 2023, primarily driven by drought conditions in key agricultural regions.',
    likelihood: 0.08,
    reasons: [
      'Contains a specific statistic with context — hallmark of human research',
      'Causal link is concrete and verifiable',
    ],
  },
  {
    sentence:   'In conclusion, this essay has explored the multifaceted dimensions of the topic at hand.',
    likelihood: 0.89,
    reasons: [
      '"Multifaceted dimensions" is a high-frequency AI phrase',
      '"Topic at hand" is a vague closer — human writers name their topic',
      'Conclusion restates nothing specific — typical of AI-generated summaries',
    ],
    suggestion: 'State what you actually proved. "This essay argued X, demonstrated through Y and Z."',
  },
];

function LikelihoodBar({ value }: { value: number }) {
  const pct  = Math.round(value * 100);
  const col  = value > 0.75 ? 'bg-red-400' : value > 0.45 ? 'bg-yellow-400' : 'bg-emerald-400';
  const text = value > 0.75 ? 'text-red-400' : value > 0.45 ? 'text-yellow-400' : 'text-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${col}`}
        />
      </div>
      <span className={`text-[11px] font-semibold w-8 text-right ${text}`}>{pct}%</span>
    </div>
  );
}

function ModeReview({ onBack }: { onBack: () => void }) {
  const [files,   setFiles]   = useState<UploadedFile[]>([]);
  const [text,    setText]    = useState('');
  const [mode,    setMode]    = useState<'upload' | 'paste'>('paste');
  const [step,    setStep]    = useState<'input' | 'scanning' | 'results'>('input');
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [overall, setOverall] = useState(0);

  function addFiles(incoming: File[]) {
    setFiles(prev => [...prev, ...incoming.map(f => ({ file: f, id: crypto.randomUUID() }))]);
  }

  async function handleScan() {
    const hasContent = mode === 'paste' ? text.trim().length > 20 : files.length > 0;
    if (!hasContent) return;
    setStep('scanning');
    await new Promise(r => setTimeout(r, 2400));
    setResults(MOCK_RESULTS);
    setOverall(Math.round(MOCK_RESULTS.reduce((a, r) => a + r.likelihood, 0) / MOCK_RESULTS.length * 100));
    setStep('results');
  }

  if (step === 'scanning') {
    return (
      <motion.div {...slide} className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
          <Sparkles size={22} className="text-purple-400 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white/70 text-sm font-medium">Analysing your work…</p>
          <p className="text-white/30 text-xs mt-1">Scanning sentence by sentence</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-purple-400"
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (step === 'results') {
    const overallColor = overall > 70 ? 'text-red-400' : overall > 40 ? 'text-yellow-400' : 'text-emerald-400';
    const overallBg    = overall > 70 ? 'bg-red-400/10 border-red-400/20' : overall > 40 ? 'bg-yellow-400/10 border-yellow-400/20' : 'bg-emerald-400/10 border-emerald-400/20';

    return (
      <motion.div {...slide} className="space-y-4">
        <BackBtn onClick={() => setStep('input')} label="Scan again" />

        {/* Overall score */}
        <div className={`glass rounded-3xl p-5 border ${overallBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={14} className={overallColor} />
              <span className="text-white/50 text-xs font-medium uppercase tracking-widest">AI likelihood score</span>
            </div>
            <span className={`text-3xl font-bold ${overallColor}`}>{overall}%</span>
          </div>
          <LikelihoodBar value={overall / 100} />
          <p className="text-white/30 text-xs mt-3 leading-relaxed">
            {overall > 70
              ? 'High chance this will be flagged. Significant AI-like patterns detected — see breakdown below.'
              : overall > 40
              ? 'Mixed signals. Some sections look natural, others may raise flags. Review highlighted sentences.'
              : 'Looks mostly human. Minor patterns detected — check flagged sentences just in case.'
            }
          </p>
        </div>

        {/* Side-by-side breakdown */}
        <div className="space-y-3">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest px-1">Sentence breakdown</p>
          {results.map((r, i) => {
            const isHigh = r.likelihood > 0.75;
            const isMed  = r.likelihood > 0.45 && !isHigh;
            const borderCl = isHigh ? 'border-red-400/20' : isMed ? 'border-yellow-400/20' : 'border-emerald-400/15';
            const bgCl     = isHigh ? 'bg-red-400/5'     : isMed ? 'bg-yellow-400/5'     : 'bg-emerald-400/5';
            const icon     = isHigh ? <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                           : isMed  ? <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                           :          <CheckCircle   size={12} className="text-emerald-400 flex-shrink-0" />;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`glass rounded-2xl border overflow-hidden ${borderCl}`}
              >
                {/* Original sentence */}
                <div className={`px-4 py-3 ${bgCl}`}>
                  <div className="flex items-start gap-2">
                    {icon}
                    <p className="text-white/75 text-sm leading-relaxed flex-1">
                      "{r.sentence}"
                    </p>
                  </div>
                  <div className="mt-2 ml-5">
                    <LikelihoodBar value={r.likelihood} />
                  </div>
                </div>

                {/* Reasoning */}
                {r.reasons.length > 0 && (
                  <div className="px-4 py-3 border-t border-white/6 space-y-2">
                    <p className="text-white/25 text-[10px] uppercase tracking-widest">Why this was flagged</p>
                    {r.reasons.map((reason, ri) => (
                      <div key={ri} className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-white/20 mt-1.5 flex-shrink-0" />
                        <p className="text-white/50 text-xs leading-relaxed">{reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestion */}
                {r.suggestion && (
                  <div className="px-4 py-3 border-t border-white/6 bg-white/2">
                    <p className="text-white/25 text-[10px] uppercase tracking-widest mb-1.5">How to fix it</p>
                    <p className="text-white/55 text-xs leading-relaxed italic">"{r.suggestion}"</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...slide} className="space-y-4">
      <BackBtn onClick={onBack} />

      <div className="glass rounded-3xl p-5 space-y-4">
        <SectionLabel icon={Shield} label="Integrity review" accent="purple" />

        <div className="glass-soft rounded-2xl px-4 py-3 flex items-start gap-3">
          <Info size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-white/45 text-xs leading-relaxed">
            This isn't just a flag — ASSI explains exactly <span className="text-white/70">why</span> each sentence
            reads as AI-generated, and what a human rewrite looks like.
          </p>
        </div>

        {/* Input mode toggle */}
        <div className="flex items-center gap-1 glass-soft rounded-xl p-1 w-fit">
          {(['paste', 'upload'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                mode === m
                  ? 'bg-white/12 text-white'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              {m === 'paste' ? 'Paste text' : 'Upload file'}
            </button>
          ))}
        </div>

        {mode === 'paste' ? (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your essay, report, or assignment here…"
            rows={8}
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 outline-none focus:ring-1 focus:ring-purple-400/30 transition resize-none leading-relaxed"
          />
        ) : (
          <DropZone
            files={files}
            onAdd={addFiles}
            onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
          />
        )}
      </div>

      <button
        onClick={handleScan}
        disabled={mode === 'paste' ? text.trim().length < 20 : files.length === 0}
        className="w-full py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-40 transition flex items-center justify-center gap-2 bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25"
      >
        <Sparkles size={15} />
        Analyse my work
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────
function BackBtn({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-white/35 hover:text-white/65 text-xs transition mb-1"
    >
      <ArrowLeft size={13} /> {label}
    </button>
  );
}

function SectionLabel({ icon: Icon, label, accent }: {
  icon: React.ElementType; label: string;
  accent: 'orange' | 'emerald' | 'purple';
}) {
  const cl = { orange: 'text-orange-400', emerald: 'text-emerald-400', purple: 'text-purple-400' };
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className={cl[accent]} />
      <span className="text-white/40 text-xs font-medium uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mode selector screen
// ─────────────────────────────────────────────
function ModeSelector({ onSelect }: { onSelect: (m: Exclude<Mode, 'select'>) => void }) {
  return (
    <motion.div
      key="selector"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28 }}
      className="space-y-3"
    >
      <div className="px-1 mb-5">
        <h1 className="text-white font-semibold text-xl tracking-tight">Assignments</h1>
        <p className="text-white/35 text-sm mt-1">What do you need help with?</p>
      </div>

      {MODES.map((m, i) => (
        <motion.button
          key={m.id}
          onClick={() => onSelect(m.id)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.98 }}
          className="w-full glass rounded-3xl p-5 text-left hover:bg-white/5 transition group"
        >
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center flex-shrink-0 ${m.bg}`}>
              <m.icon size={20} className={m.iconCl} />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-base tracking-tight">{m.label}</p>
              <p className="text-white/35 text-sm mt-0.5 leading-snug">{m.sub}</p>
            </div>
            <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition flex-shrink-0" />
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────
export default function AssignmentsPage() {
  const [mode, setMode] = useState<Mode>('select');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {mode === 'select' && (
          <ModeSelector key="select" onSelect={setMode} />
        )}
        {mode === 'done' && (
          <ModeDone key="done" onBack={() => setMode('select')} />
        )}
        {mode === 'guide' && (
          <ModeGuide key="guide" onBack={() => setMode('select')} />
        )}
        {mode === 'review' && (
          <ModeReview key="review" onBack={() => setMode('select')} />
        )}
      </AnimatePresence>
    </div>
  );
}