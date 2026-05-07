'use client';

// app/live-chat/components/StudyPanel.tsx
//
// Reusable study tools panel — mounts as a side panel in any session view.
// Configured entirely via props — knows nothing about session type.
//
// Usage:
//   <StudyPanel
//     sessionId={sessionId}
//     currentUsername={currentUsername}
//     tools={['notebook', 'whiteboard', 'problems', 'files']}
//     permissions={{ canDrive: true, notebookShared: true }}
//     emit={emit} on={on} off={off}
//   />

import {
  useEffect, useRef, useState, useCallback,
  FormEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, PenTool, HelpCircle, Timer,
  Paperclip, Megaphone, ChevronRight,
  X, Check, Trash2, RotateCcw, Upload,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudyTool =
  | 'notebook'
  | 'whiteboard'
  | 'problems'
  | 'timer'
  | 'files'
  | 'broadcast';

export interface StudyPermissions {
  // Whether this user can drive shared tools (whiteboard, problem resolve, timer, broadcast)
  canDrive:        boolean;
  // Whether the notebook syncs to all participants (false = personal only)
  notebookShared:  boolean;
}

export interface Problem {
  id:       string;
  text:     string;
  askedBy:  string;
  resolved: boolean;
  answer?:  string;
}

export interface FileEntry {
  id:      string;
  name:    string;
  url:     string;
  addedBy: string;
}

export interface TimerState {
  running:   boolean;
  minutes:   number;
  seconds:   number;
  totalSecs: number;
}

interface StudyPanelProps {
  sessionId:       string;
  currentUsername: string;
  tools:           StudyTool[];
  permissions:     StudyPermissions;
  emit:            (event: string, payload?: any) => void;
  on:              (event: string, handler: (...args: any[]) => void) => void;
  off:             (event: string, handler: (...args: any[]) => void) => void;
}

// ── Tab config ─────────────────────────────────────────────────────────────────

const TAB_META: Record<StudyTool, { label: string; icon: React.ElementType }> = {
  notebook:   { label: 'Notes',     icon: BookOpen   },
  whiteboard: { label: 'Board',     icon: PenTool    },
  problems:   { label: 'Problems',  icon: HelpCircle },
  timer:      { label: 'Timer',     icon: Timer      },
  files:      { label: 'Files',     icon: Paperclip  },
  broadcast:  { label: 'Broadcast', icon: Megaphone  },
};

// ── StudyPanel ─────────────────────────────────────────────────────────────────

export function StudyPanel({
  sessionId, currentUsername, tools, permissions, emit, on, off,
}: StudyPanelProps) {
  const [activeTool, setActiveTool] = useState<StudyTool>(tools[0] ?? 'notebook');

  // Shared state — lifted here so switching tabs doesn't reset content
  const [notebookText, setNotebookText] = useState('');
  const [problems,     setProblems]     = useState<Problem[]>([]);
  const [files,        setFiles]        = useState<FileEntry[]>([]);
  const [timer,        setTimer]        = useState<TimerState>({
    running: false, minutes: 25, seconds: 0, totalSecs: 25 * 60,
  });
  const [broadcastText, setBroadcastText] = useState('');

  // Ensure activeTool is always one of the allowed tools
  useEffect(() => {
    if (!tools.includes(activeTool)) setActiveTool(tools[0] ?? 'notebook');
  }, [tools, activeTool]);

  // ── Inbound socket events (all study: namespace) ──
  useEffect(() => {
    const onNotebook       = ({ text }: { text: string }) => setNotebookText(text);
    const onProblemAdd     = ({ problem }: { problem: Problem }) =>
      setProblems(prev => prev.some(p => p.id === problem.id) ? prev : [...prev, problem]);
    const onProblemResolve = ({ id, answer }: { id: string; answer?: string }) =>
      setProblems(prev => prev.map(p => p.id === id ? { ...p, resolved: true, answer } : p));
    const onTimerSync      = (state: TimerState) => setTimer(state);
    const onFileAdd        = ({ file }: { file: FileEntry }) =>
      setFiles(prev => prev.some(f => f.id === file.id) ? prev : [...prev, file]);

    on('study:notebook_update',  onNotebook);
    on('study:problem_add',      onProblemAdd);
    on('study:problem_resolve',  onProblemResolve);
    on('study:timer_sync',       onTimerSync);
    on('study:file_add',         onFileAdd);

    return () => {
      off('study:notebook_update',  onNotebook);
      off('study:problem_add',      onProblemAdd);
      off('study:problem_resolve',  onProblemResolve);
      off('study:timer_sync',       onTimerSync);
      off('study:file_add',         onFileAdd);
    };
  }, [on, off]);

  return (
    <div className="w-[300px] h-full flex flex-col border-l border-white/[0.07] bg-white/[0.03]">

      {/* ── Tab bar ── */}
      <div className="flex items-center border-b border-white/[0.07] px-2 pt-2 pb-0 gap-0.5 flex-shrink-0 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}>
        {tools.map(tool => {
          const meta   = TAB_META[tool];
          const active = activeTool === tool;
          return (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-[11px] font-medium transition border-b-2 whitespace-nowrap ${
                active
                  ? 'text-white border-orange-400 bg-white/5'
                  : 'text-white/30 border-transparent hover:text-white/55'
              }`}
            >
              <meta.icon size={11} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* ── Active tool ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="h-full"
          >
            {activeTool === 'notebook' && (
              <NotebookTool
                sessionId={sessionId}
                text={notebookText}
                onChange={setNotebookText}
                shared={permissions.notebookShared}
                emit={emit}
              />
            )}
            {activeTool === 'whiteboard' && (
              <WhiteboardTool
                sessionId={sessionId}
                canDrive={permissions.canDrive}
                emit={emit}
                on={on}
                off={off}
              />
            )}
            {activeTool === 'problems' && (
              <ProblemTool
                sessionId={sessionId}
                currentUsername={currentUsername}
                problems={problems}
                canResolve={permissions.canDrive}
                emit={emit}
              />
            )}
            {activeTool === 'timer' && (
              <TimerTool
                sessionId={sessionId}
                timer={timer}
                setTimer={setTimer}
                canDrive={permissions.canDrive}
                emit={emit}
              />
            )}
            {activeTool === 'files' && (
              <FileTool
                sessionId={sessionId}
                currentUsername={currentUsername}
                files={files}
                emit={emit}
              />
            )}
            {activeTool === 'broadcast' && (
              <BroadcastTool
                sessionId={sessionId}
                text={broadcastText}
                onChange={setBroadcastText}
                canDrive={permissions.canDrive}
                emit={emit}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTEBOOK TOOL
// shared=false → personal only, no socket emit
// shared=true  → debounced sync via study:notebook_update
// ─────────────────────────────────────────────────────────────────────────────

interface NotebookToolProps {
  sessionId: string;
  text:      string;
  onChange:  (text: string) => void;
  shared:    boolean;
  emit:      (event: string, payload?: any) => void;
}

function NotebookTool({ sessionId, text, onChange, shared, emit }: NotebookToolProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((val: string) => {
    onChange(val);
    if (!shared) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      emit('study:notebook_update', { sessionId, text: val });
    }, 600);
  }, [onChange, shared, emit, sessionId]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-white/25 text-[10px] uppercase tracking-widest">
          {shared ? 'Shared notebook' : 'Personal notes'}
        </p>
        {shared && (
          <span className="text-[9px] text-emerald-400/50 px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/8">
            Live sync
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder={
          shared
            ? 'Everyone in the room can edit…'
            : 'Take personal notes — saved when you end the session…'
        }
        className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white/80 placeholder-white/20 outline-none focus:border-white/15 resize-none transition leading-relaxed min-h-[280px]"
      />
      {!shared && (
        <p className="text-white/15 text-[10px] text-center">
          You'll be prompted to save at the end
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHITEBOARD TOOL
// canDrive=true  → can draw, strokes emitted via study:whiteboard_draw
// canDrive=false → read-only, replays incoming strokes
// ─────────────────────────────────────────────────────────────────────────────

interface WhiteboardToolProps {
  sessionId: string;
  canDrive:  boolean;
  emit:      (event: string, payload?: any) => void;
  on:        (event: string, handler: (...args: any[]) => void) => void;
  off:       (event: string, handler: (...args: any[]) => void) => void;
}

function WhiteboardTool({ sessionId, canDrive, emit, on, off }: WhiteboardToolProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const isDrawing   = useRef(false);
  const currentPath = useRef<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState('#ffffff');
  const [size,  setSize]  = useState(2);

  // Replay remote strokes
  useEffect(() => {
    const onDraw = ({ points, color: c, size: s }: {
      points: { x: number; y: number }[];
      color:  string;
      size:   number;
    }) => {
      const canvas = canvasRef.current;
      if (!canvas || points.length < 2) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = c;
      ctx.lineWidth   = s;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
    };

    const onClear = () => {
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    };

    on('study:whiteboard_draw',  onDraw);
    on('study:whiteboard_clear', onClear);
    return () => {
      off('study:whiteboard_draw',  onDraw);
      off('study:whiteboard_clear', onClear);
    };
  }, [on, off]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDrive) return;
    isDrawing.current = true;
    currentPath.current = [getPos(e)];
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(currentPath.current[0].x, currentPath.current[0].y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canDrive) return;
    const pos = getPos(e);
    currentPath.current.push(pos);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth   = size;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !canDrive) return;
    isDrawing.current = false;
    if (currentPath.current.length > 1) {
      emit('study:whiteboard_draw', {
        sessionId,
        points: currentPath.current,
        color,
        size,
      });
    }
    currentPath.current = [];
  };

  const handleClear = () => {
    if (!canDrive) return;
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, 270, 320);
    emit('study:whiteboard_clear', { sessionId });
  };

  const COLORS = ['#ffffff', '#f97316', '#34d399', '#60a5fa', '#f472b6', '#facc15'];

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-white/25 text-[10px] uppercase tracking-widest">Whiteboard</p>
        {canDrive && (
          <button onClick={handleClear}
            className="flex items-center gap-1 text-white/25 text-[10px] hover:text-white/50 transition">
            <RotateCcw size={10} /> Clear
          </button>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={270} height={320}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`rounded-xl bg-white/[0.04] border border-white/[0.06] w-full ${
          canDrive ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />

      {canDrive && (
        <div className="flex items-center gap-3">
          {/* Color picker */}
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full transition border ${
                  color === c ? 'border-white/60 scale-110' : 'border-white/10'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          {/* Brush size */}
          <div className="flex items-center gap-1.5 ml-auto">
            {[1, 2, 4, 7].map(s => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-full bg-white/60 transition ${
                  size === s ? 'opacity-100 ring-1 ring-white/40' : 'opacity-30'
                }`}
                style={{ width: s * 2 + 6, height: s * 2 + 6 }}
              />
            ))}
          </div>
        </div>
      )}

      {!canDrive && (
        <p className="text-white/20 text-[10px] text-center">
          View only — tutor is drawing
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM TOOL
// Anyone can post. canResolve=true (tutor/owner/presenter) can mark answered.
// ─────────────────────────────────────────────────────────────────────────────

interface ProblemToolProps {
  sessionId:       string;
  currentUsername: string;
  problems:        Problem[];
  canResolve:      boolean;
  emit:            (event: string, payload?: any) => void;
}

function ProblemTool({ sessionId, currentUsername, problems, canResolve, emit }: ProblemToolProps) {
  const [input,  setInput]  = useState('');
  const [answer, setAnswer] = useState<Record<string, string>>({});

  const handleAdd = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const problem: Problem = {
      id:       crypto.randomUUID(),
      text,
      askedBy:  currentUsername,
      resolved: false,
    };
    emit('study:problem_add', { sessionId, problem });
    setInput('');
  }, [input, currentUsername, emit, sessionId]);

  const handleResolve = useCallback((id: string) => {
    if (!canResolve) return;
    emit('study:problem_resolve', { sessionId, id, answer: answer[id] ?? '' });
    setAnswer(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [canResolve, emit, sessionId, answer]);

  const open   = problems.filter(p => !p.resolved);
  const closed = problems.filter(p => p.resolved);

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-white/25 text-[10px] uppercase tracking-widest px-0.5">Problem board</p>

      {/* Post a question */}
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Post a question or problem…"
          className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/15 transition"
        />
        <button onClick={handleAdd} disabled={!input.trim()}
          className="p-2 rounded-lg bg-white/8 text-white/40 hover:bg-white/12 hover:text-white disabled:opacity-25 transition">
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Open problems */}
      {open.length === 0 && closed.length === 0 && (
        <p className="text-white/20 text-xs text-center py-6">No problems yet</p>
      )}

      {open.map(p => (
        <div key={p.id} className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 space-y-1.5">
          <p className="text-white/75 text-xs leading-relaxed">{p.text}</p>
          <p className="text-white/20 text-[10px]">Asked by {p.askedBy}</p>
          {canResolve && (
            <div className="flex gap-1.5 pt-1">
              <input
                value={answer[p.id] ?? ''}
                onChange={e => setAnswer(prev => ({ ...prev, [p.id]: e.target.value }))}
                placeholder="Answer (optional)…"
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5 text-[11px] text-white placeholder-white/15 outline-none focus:border-white/12 transition"
              />
              <button onClick={() => handleResolve(p.id)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/25 transition">
                Resolve
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Resolved */}
      {closed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-white/15 text-[10px] uppercase tracking-widest px-0.5 pt-1">Resolved</p>
          {closed.map(p => (
            <div key={p.id} className="rounded-xl bg-emerald-500/6 border border-emerald-500/12 px-3 py-2.5 space-y-1">
              <p className="text-white/40 text-xs line-through leading-relaxed">{p.text}</p>
              {p.answer && <p className="text-emerald-400/60 text-[11px] leading-relaxed">{p.answer}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMER TOOL
// canDrive=true → can set + start/stop. Synced to all via study:timer_sync.
// canDrive=false → view only, countdown ticks locally.
// ─────────────────────────────────────────────────────────────────────────────

interface TimerToolProps {
  sessionId: string;
  timer:     TimerState;
  setTimer:  React.Dispatch<React.SetStateAction<TimerState>>;
  canDrive:  boolean;
  emit:      (event: string, payload?: any) => void;
}

function TimerTool({ sessionId, timer, setTimer, canDrive, emit }: TimerToolProps) {
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Local tick
  useEffect(() => {
    if (!timer.running) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev.running) return prev;
        const total = prev.minutes * 60 + prev.seconds - 1;
        if (total <= 0) {
          if (tickRef.current) clearInterval(tickRef.current);
          return { ...prev, running: false, minutes: 0, seconds: 0 };
        }
        return { ...prev, minutes: Math.floor(total / 60), seconds: total % 60 };
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [timer.running, setTimer]);

  const start = useCallback((mins: number) => {
    if (!canDrive) return;
    const state: TimerState = { running: true, minutes: mins, seconds: 0, totalSecs: mins * 60 };
    setTimer(state);
    emit('study:timer_sync', { sessionId, state });
  }, [canDrive, setTimer, emit, sessionId]);

  const stop = useCallback(() => {
    if (!canDrive) return;
    setTimer(prev => {
      const next = { ...prev, running: false };
      emit('study:timer_sync', { sessionId, state: next });
      return next;
    });
  }, [canDrive, setTimer, emit, sessionId]);

  const reset = useCallback(() => {
    if (!canDrive) return;
    const state: TimerState = {
      running: false,
      minutes: Math.floor(timer.totalSecs / 60),
      seconds: 0,
      totalSecs: timer.totalSecs,
    };
    setTimer(state);
    emit('study:timer_sync', { sessionId, state });
  }, [canDrive, timer.totalSecs, setTimer, emit, sessionId]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const PRESETS = [5, 10, 15, 25, 45];

  // Progress arc
  const total    = timer.totalSecs || 1;
  const elapsed  = total - (timer.minutes * 60 + timer.seconds);
  const progress = elapsed / total;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-4 p-3 pt-5">
      <p className="text-white/25 text-[10px] uppercase tracking-widest self-start px-0.5">Pomodoro timer</p>

      {/* Clock face */}
      <div className="relative flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={timer.running ? '#f97316' : 'rgba(255,255,255,0.20)'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-white font-mono text-2xl font-semibold tabular-nums leading-none">
            {pad(timer.minutes)}:{pad(timer.seconds)}
          </p>
          {timer.running && (
            <p className="text-orange-400/60 text-[10px] mt-1">Focus</p>
          )}
        </div>
      </div>

      {/* Controls */}
      {canDrive ? (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-1.5 justify-center">
            {timer.running ? (
              <>
                <button onClick={stop}
                  className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white/60 text-xs hover:bg-white/12 hover:text-white transition">
                  Pause
                </button>
                <button onClick={reset}
                  className="p-2 rounded-xl glass-soft text-white/30 hover:text-white/60 transition">
                  <RotateCcw size={13} />
                </button>
              </>
            ) : (
              <button onClick={() => start(Math.floor(timer.totalSecs / 60))}
                className="px-5 py-2 rounded-xl bg-orange-500/20 border border-orange-500/25 text-orange-300 text-xs font-medium hover:bg-orange-500/30 transition">
                Start
              </button>
            )}
          </div>

          {/* Presets */}
          {!timer.running && (
            <div className="flex gap-1 justify-center flex-wrap">
              {PRESETS.map(m => (
                <button
                  key={m}
                  onClick={() => start(m)}
                  className="px-2.5 py-1 rounded-lg glass-soft text-white/35 text-[11px] hover:text-white/65 transition"
                >
                  {m}m
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-white/20 text-[10px] text-center">
          {timer.running ? 'Timer running — stay focused' : 'Waiting for host to start timer'}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE TOOL
// All members can add files. Client-side object URL for now.
// study:file_add broadcasts to room (URL will be storage URL in prod).
// ─────────────────────────────────────────────────────────────────────────────

interface FileToolProps {
  sessionId:       string;
  currentUsername: string;
  files:           FileEntry[];
  emit:            (event: string, payload?: any) => void;
}

function FileTool({ sessionId, currentUsername, files, emit }: FileToolProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url   = URL.createObjectURL(file);
    const entry: FileEntry = {
      id:      crypto.randomUUID(),
      name:    file.name,
      url,
      addedBy: currentUsername,
    };
    // Add locally immediately
    emit('study:file_add', { sessionId, file: entry });
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  }, [currentUsername, emit, sessionId]);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-white/25 text-[10px] uppercase tracking-widest">Files</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1 text-white/35 text-[10px] hover:text-white/60 transition"
        >
          <Upload size={10} /> Upload
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center">
            <Paperclip size={16} className="text-white/25" />
          </div>
          <p className="text-white/20 text-xs text-center">No files yet</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl glass-soft border border-white/10 text-white/40 text-xs hover:text-white/65 hover:border-white/20 transition"
          >
            Share a file
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map(f => {
            const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name);
            return (
              <div key={f.id} className="rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                {isImage && (
                  <img src={f.url} alt={f.name}
                    className="w-full max-h-32 object-cover border-b border-white/[0.06]" />
                )}
                <div className="flex items-center gap-2 px-3 py-2">
                  <Paperclip size={11} className="text-white/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-[11px] truncate">{f.name}</p>
                    <p className="text-white/20 text-[10px]">{f.addedBy}</p>
                  </div>
                  <a href={f.url} download={f.name}
                    className="text-white/25 hover:text-white/55 transition">
                    <Upload size={11} style={{ transform: 'rotate(180deg)' }} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST TOOL
// Tutor/owner/presenter only. Sends a pinned message to all participants.
// ─────────────────────────────────────────────────────────────────────────────

interface BroadcastToolProps {
  sessionId: string;
  text:      string;
  onChange:  (text: string) => void;
  canDrive:  boolean;
  emit:      (event: string, payload?: any) => void;
}

function BroadcastTool({ sessionId, text, onChange, canDrive, emit }: BroadcastToolProps) {
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState<string[]>([]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !canDrive) return;
    setSending(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${API_URL}/api/sessions/${sessionId}/broadcast`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ content: trimmed, type: 'announcement' }),
      });
    } catch {
      emit('study:broadcast', { sessionId, message: trimmed });
    }
    setSent(prev => [trimmed, ...prev.slice(0, 4)]);
    onChange('');
    setSending(false);
  }, [text, canDrive, emit, sessionId, onChange]);

  if (!canDrive) {
    return (
      <div className="flex flex-col items-center gap-3 p-3 pt-10">
        <Megaphone size={20} className="text-white/15" />
        <p className="text-white/20 text-xs text-center">
          Only the host can send broadcast messages
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-white/25 text-[10px] uppercase tracking-widest px-0.5">Broadcast</p>
      <p className="text-white/30 text-xs leading-relaxed px-0.5">
        Sends a pinned message visible to all participants.
      </p>

      <textarea
        value={text}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
        placeholder="Write an announcement…"
        rows={3}
        className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-orange-500/25 resize-none transition leading-relaxed"
      />

      <button
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/20 border border-orange-500/25 text-orange-300 text-xs font-medium hover:bg-orange-500/30 disabled:opacity-40 transition"
      >
        <Megaphone size={12} />
        Broadcast to all
      </button>

      {sent.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-white/15 text-[10px] uppercase tracking-widest px-0.5">Recent</p>
          {sent.map((msg, i) => (
            <div key={i} className="rounded-xl bg-orange-500/6 border border-orange-500/10 px-3 py-2">
              <p className="text-orange-300/50 text-[11px] leading-relaxed">{msg}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}