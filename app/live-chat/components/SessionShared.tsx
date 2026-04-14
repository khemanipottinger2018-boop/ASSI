'use client';

// app/live-chat/components/SessionShared.tsx

import { useEffect, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, PhoneOff, Users, PauseCircle,
  Hand, Mic, MicOff, Settings, ChevronDown, Wifi, LogOut,
} from 'lucide-react';
import type { ChatMessage, Participant, SpeakMode } from '@/features/live-chat/types/SocketEvents';

/* ── Timer ── */
/**
 * SessionTimer
 *
 * When `endsAt` (ms epoch) is provided, derives remaining time as
 * (endsAt - Date.now()) at render time — no drift, always fresh.
 * Falls back to startedAt-based elapsed/countdown for legacy callers.
 *
 * The setInterval here is only a render trigger; the actual time value
 * is computed fresh on every render, not accumulated.
 */
export function SessionTimer({
  className = '',
  startedAt,
  mode = 'elapsed',
  limitSecs,
  endsAt,
}: {
  className?: string;
  startedAt?: number;
  mode?: 'elapsed' | 'countdown';
  limitSecs?: number;
  endsAt?: number;  // backend epoch — when provided, drives countdown with no drift
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  let display: number;
  let warning = false;

  if (endsAt !== undefined) {
    // Backend-authoritative countdown — derive from epoch, never accumulate
    display = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
    warning = display <= 300;
  } else if (mode === 'countdown' && limitSecs !== undefined && startedAt !== undefined) {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    display = Math.max(0, limitSecs - elapsed);
    warning = display <= 300;
  } else {
    display = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  }

  const mm  = Math.floor(display / 60);
  const ss  = (display % 60).toString().padStart(2, '0');
  const col = warning ? 'text-amber-400' : className;

  return (
    <span className={`font-mono tabular-nums text-xs ${col}`}>
      {mm}:{ss}
    </span>
  );
}

/* ── Grace State Banner ── */
/**
 * GraceStateBanner
 *
 * Shown when session status is 'host_left_grace'. Countdown derives
 * from graceExpiresAt (ms epoch) — computed fresh each render, no drift.
 * Offers two actions: leave immediately or wait for the host to return.
 */
export function GraceStateBanner({
  graceExpiresAt,
  onLeave,
  onWait,
}: {
  graceExpiresAt: number;
  onLeave: () => void;
  onWait?: () => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec = Math.max(0, Math.floor((graceExpiresAt - Date.now()) / 1000));
  const mm = Math.floor(remainingSec / 60);
  const ss = String(remainingSec % 60).padStart(2, '0');

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-amber-500/8 border-b border-amber-500/15">
      <div className="flex items-center gap-2">
        <span className="text-amber-400/80 text-[11px]">Host has left — session ends in</span>
        <span className="font-mono text-amber-300 text-[11px] tabular-nums">{mm}:{ss}</span>
      </div>
      <div className="flex items-center gap-2">
        {onWait && (
          <button
            onClick={onWait}
            className="px-2.5 py-1 rounded-lg glass-soft text-white/45 text-[11px] hover:text-white/70 transition"
          >
            Wait for Host
          </button>
        )}
        <button
          onClick={onLeave}
          className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 text-[11px] hover:bg-red-500/25 transition"
        >
          Leave Session
        </button>
      </div>
    </div>
  );
}

/* ── Connection dot ── */
export function ConnDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
      connected ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'
    }`} />
  );
}

/* ── Live badge ── */
export function LiveBadge() {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/20">
      <motion.span className="w-1.5 h-1.5 rounded-full bg-red-400"
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <span className="text-red-400 text-[9px] font-bold uppercase tracking-wider">Live</span>
    </div>
  );
}

/* ── Session Header ── */

/** Single user pill used in the dual-user header layout. */
function UserPill({
  name, isMe, inRoom, side,
}: {
  name: string;
  isMe: boolean;
  inRoom: boolean;
  side: 'left' | 'right';
}) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold ${
            isMe
              ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
              : 'bg-white/8 border border-white/12 text-white/60'
          }`}
        >
          {initial}
        </div>
        {/* In-room presence dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[--panel-bg] ${
            inRoom ? 'bg-emerald-400' : 'bg-white/15'
          }`}
        />
      </div>
      {/* Name */}
      <div className={`min-w-0 ${side === 'right' ? 'text-right' : ''}`}>
        <p className="text-white/70 text-[11px] font-medium truncate max-w-[80px]">{name}</p>
        <p className={`text-[9px] font-medium ${isMe ? 'text-orange-400/60' : inRoom ? 'text-emerald-400/70' : 'text-white/25'}`}>
          {isMe ? 'You' : inRoom ? 'In session' : 'Joining…'}
        </p>
      </div>
    </div>
  );
}

interface HeaderProps {
  title: string; subtitle?: string; connected: boolean;
  participantCount?: number;
  startedAt?: number;
  timerMode?: 'elapsed' | 'countdown';
  timerLimitSecs?: number;
  endsAt?: number;
  // Student-only: triggers the confirm-end banner (no in-header confirm)
  onEnd?: () => void;
  // Tutor-only: leave without ending — triggers grace period
  onLeave?: () => void;
  rightSlot?: React.ReactNode; badge?: React.ReactNode;
  // Dual-user layout: when provided, replaces the plain title with two user pills
  currentUser?: { name: string; inRoom?: boolean };
  peerUser?:    { name: string; inRoom: boolean };
}

export function SessionHeader({
  title, subtitle, connected, participantCount,
  startedAt, timerMode = 'elapsed', timerLimitSecs, endsAt,
  onEnd, onLeave, rightSlot, badge,
  currentUser, peerUser,
}: HeaderProps) {
  const isDual = !!(currentUser && peerUser);

  return (
    <div
      className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.07]"
      style={{ background: 'var(--panel-bg)' }}
    >
      {isDual ? (
        /* ── Dual-user layout ── */
        <>
          {/* Peer — left */}
          <UserPill name={peerUser!.name} isMe={false} inRoom={peerUser!.inRoom} side="left" />

          {/* Center: subject + timer */}
          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0 px-1">
            {subtitle && (
              <p className="text-white/35 text-[10px] font-medium truncate">{subtitle}</p>
            )}
            <SessionTimer
              className="text-white/50 tabular-nums"
              startedAt={startedAt}
              mode={timerMode}
              limitSecs={timerLimitSecs}
              endsAt={endsAt}
            />
          </div>

          {/* Me — right */}
          <UserPill name={currentUser!.name} isMe inRoom={currentUser?.inRoom ?? true} side="right" />
        </>
      ) : (
        /* ── Legacy single-title layout (group study, conference) ── */
        <>
          <ConnDot connected={connected} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white/85 text-sm font-medium tracking-tight truncate">{title}</p>
              {badge}
            </div>
            {subtitle && <p className="text-white/30 text-[10px] mt-0.5 truncate">{subtitle}</p>}
          </div>

          {participantCount !== undefined && participantCount > 1 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/8">
              <Users size={10} className="text-white/30" />
              <span className="text-white/35 text-[10px]">{participantCount}</span>
            </div>
          )}

          <SessionTimer
            className="text-white/20"
            startedAt={startedAt}
            mode={timerMode}
            limitSecs={timerLimitSecs}
            endsAt={endsAt}
          />
          {rightSlot}
        </>
      )}

      {/* Tutor: Leave button (no confirmation — tutor steps away, session stays open) */}
      {onLeave && (
        <button
          onClick={onLeave}
          className="ml-1 p-1.5 rounded-lg text-white/25 hover:text-orange-300 hover:bg-orange-500/10 transition"
          title="Leave session"
        >
          <LogOut size={13} />
        </button>
      )}

      {/* Student: End button — clicking opens the ConfirmEndBanner below the header */}
      {onEnd && (
        <button
          onClick={onEnd}
          className="ml-1 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
          title="End session"
        >
          <PhoneOff size={13} />
        </button>
      )}

      {/* rightSlot shown after action buttons in dual mode (e.g. Tools toggle) */}
      {isDual && rightSlot}
    </div>
  );
}

/* ── Student end-session confirmation banner ── */
export function ConfirmEndBanner({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-red-500/15 bg-red-500/6"
    >
      <div className="min-w-0">
        <p className="text-white/70 text-xs font-medium">End session?</p>
        <p className="text-white/35 text-[10px] mt-0.5">This ends the session for both you and your tutor.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg glass-soft text-white/40 text-xs hover:text-white/70 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition"
        >
          Yes, end
        </button>
      </div>
    </motion.div>
  );
}

/* ── Session extension prompt ── */
/**
 * ExtensionPromptBanner
 *
 * Shown when an instant session has ≤ 3 minutes remaining AND
 * canExtend is true. Either participant can request the one-time
 * 15-minute extension. Dismissed automatically once extended or
 * the session ends.
 */
export function ExtensionPromptBanner({
  onExtend,
  onDismiss,
  extending,
}: {
  onExtend:  () => void;
  onDismiss: () => void;
  extending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/8"
    >
      <div className="min-w-0">
        <p className="text-amber-300/90 text-xs font-medium">Session ending soon</p>
        <p className="text-amber-400/50 text-[10px] mt-0.5">Need more time? You can extend by 15 minutes once.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDismiss}
          className="px-2.5 py-1.5 rounded-lg glass-soft text-white/35 text-[11px] hover:text-white/60 transition"
        >
          Dismiss
        </button>
        <button
          onClick={onExtend}
          disabled={extending}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold hover:bg-amber-500/30 disabled:opacity-50 transition flex items-center gap-1.5"
        >
          {extending ? (
            <><span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />Extending…</>
          ) : (
            <>+15 min</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Paused banner ── */
export function PausedBanner() {
  return (
    <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-yellow-500/6 border-b border-yellow-500/12">
      <PauseCircle size={12} className="text-yellow-400/80" />
      <span className="text-yellow-400/70 text-[11px]">Session paused — still there?</span>
    </div>
  );
}

/* ── Message Bubble ── */
export function MessageBubble({ msg, isMe, showSender }: {
  msg: ChatMessage; isMe: boolean; showSender?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
    >
      {showSender && (isMe || msg.senderName) && (
        <span className={`text-[9px] px-3 ${isMe ? 'text-orange-400/40' : 'text-white/25'}`}>
          {isMe ? 'You' : msg.senderName}
        </span>
      )}
      <div className={`
        max-w-[72%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
        ${isMe
          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md shadow-lg shadow-orange-900/20'
          : 'bg-white/[0.08] border border-white/[0.07] text-white/85 rounded-bl-md'
        }
      `}>
        {msg.content}
      </div>
      <span className="text-[9px] text-white/15 px-3">
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </motion.div>
  );
}

/* ── Typing Indicator ── */
export function TypingIndicator({ name }: { name?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-end gap-2">
      <div className="bg-white/[0.08] border border-white/[0.07] rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white/35"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
      {name && <span className="text-white/20 text-[10px] mb-1">{name}</span>}
    </motion.div>
  );
}

/* ── Message Feed ── */
export function MessageFeed({ messages, currentUserId, showSenders, emptySlot }: {
  messages: ChatMessage[]; currentUserId: string;
  showSenders?: boolean; emptySlot?: React.ReactNode;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
      {messages.length === 0 && emptySlot}
      <AnimatePresence initial={false}>
        {messages.map(msg => (
          <MessageBubble key={msg.messageId} msg={msg}
            isMe={msg.senderId === currentUserId} showSender={showSenders} />
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

/* ── Chat Input ── */
export function ChatInput({ value, onChange, onSubmit, onKeystroke, disabled, placeholder }: {
  value: string; onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void; onKeystroke: () => void;
  disabled?: boolean; placeholder?: string;
}) {
  return (
    <form onSubmit={onSubmit}
      className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-white/[0.07] bg-black/10">
      <input type="text" value={value}
        onChange={e => { onChange(e.target.value); onKeystroke(); }}
        placeholder={placeholder ?? 'Type a message…'}
        disabled={disabled}
        className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.08] disabled:opacity-30 transition-all duration-200"
      />
      <button type="submit" disabled={disabled || !value.trim()}
        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-orange-500/20 border border-orange-500/25 text-orange-400 hover:bg-orange-500/30 hover:text-orange-300 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200">
        <Send size={14} />
      </button>
    </form>
  );
}

/* ── Activity Feed ── */
export interface ActivityEvent {
  id:    string;
  label: string;
  kind:  'drawing' | 'problem' | 'joined';
}

function typingLabel(names: string[]): string {
  if (names.length === 0)  return '';
  if (names.length === 1)  return `${names[0]} is typing…`;
  if (names.length < 5)    return `${names.length} people are typing…`;
  return 'Many people are typing…';
}

export function ActivityFeed({
  typingUsernames = [],
  events = [],
}: {
  typingUsernames?: string[];
  events?: ActivityEvent[];
}) {
  const typingText = typingLabel(typingUsernames);
  const items      = [...(typingText ? [{ id: '__typing__', label: typingText }] : []), ...events];

  return (
    <div className="shrink-0 min-h-[22px] px-4 pb-1 flex flex-col gap-0.5">
      <AnimatePresence initial={false}>
        {items.map(item => (
          <motion.p
            key={item.id}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.16 }}
            className="text-[10px] text-white/30 leading-none"
          >
            {item.label}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Hook for managing auto-dismissing activity events (3 s TTL). */
export function useActivityEvents() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const push = (event: Omit<ActivityEvent, 'id'>) => {
    const id = `${event.kind}-${Date.now()}-${Math.random()}`;
    setEvents(prev => [...prev, { ...event, id }]);
    const t = setTimeout(() => {
      setEvents(prev => prev.filter(e => e.id !== id));
      timers.current.delete(id);
    }, 3000);
    timers.current.set(id, t);
  };

  useEffect(() => () => { timers.current.forEach(t => clearTimeout(t)); }, []);

  return { events, push };
}

/* ── Session Ended ── */
const END_REASONS: Record<string, string> = {
  inactivity:         'Ended due to inactivity.',
  no_tutor_available: 'No tutors were available. Please try again.',
  system:             'The session was ended by the platform.',
  ended_by_tutor:     'The tutor ended the session.',
  ended_by_student:   'You ended the session.',
  ended_by_host:      'The host ended the session.',
  time_limit_reached: 'Your 30-minute session has ended.',
};

export function SessionEndedScreen({ reason, role }: { reason: string; role?: 'student' | 'tutor' | 'attendee' | 'admin' }) {
  const router = useRouter();
  const isTutor = role === 'tutor' || role === 'admin';

  return (
    <div className="h-full flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl px-10 py-14 text-center max-w-sm w-full space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
          <PhoneOff size={22} className="text-white/30" />
        </div>
        <div className="space-y-1.5">
          <p className="text-white/80 font-semibold text-base tracking-tight">Session ended</p>
          <p className="text-white/35 text-sm leading-relaxed">{END_REASONS[reason] ?? reason ?? 'The session has ended.'}</p>
        </div>
        {isTutor ? (
          <button
            onClick={() => router.push('/dashboard')}
            className="glass-soft px-6 py-2.5 rounded-xl text-white/45 text-sm hover:text-white/70 transition"
          >
            Back to dashboard
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="glass-soft px-5 py-2.5 rounded-xl text-white/45 text-sm hover:text-white/70 transition"
            >
              Home
            </button>
            <button
              onClick={() => router.push('/browse')}
              className="glass-soft px-5 py-2.5 rounded-xl text-white/45 text-sm hover:text-white/70 transition"
            >
              Back to browse
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Waiting Room ── */
export function SessionWaitingRoom({ title, subtitle, onJoinNow, onCancel }: {
  title: string; subtitle: string; onJoinNow?: () => void; onCancel?: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl px-10 py-14 text-center max-w-sm w-full space-y-8">
        <div className="relative w-20 h-20 mx-auto">
          <motion.div className="absolute inset-0 rounded-full bg-orange-500/10"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }} />
          <motion.div className="absolute inset-2 rounded-full bg-orange-500/15"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }} />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-400/25 to-orange-600/25 border border-orange-500/20 flex items-center justify-center">
            <Users size={28} className="text-orange-300/70" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-white/80 font-semibold text-base tracking-tight">{title}</p>
          <p className="text-white/35 text-sm leading-relaxed">{subtitle}</p>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20"
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }} />
          ))}
        </div>
        {/* Action row */}
        <div className="flex items-center justify-center gap-3">
          {onJoinNow && (
            <button
              onClick={onJoinNow}
              className="glass-soft px-5 py-2 rounded-xl text-white/55 text-xs font-medium hover:text-white/80 transition border border-white/10"
            >
              Join now
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="text-white/20 text-xs hover:text-white/45 transition">
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Participant List ── */
export function ParticipantList({ participants, currentUserId, isHost, onMute, onGrantFloor, onKick, kickingId }: {
  participants: Participant[]; currentUserId: string; isHost?: boolean;
  onMute?: (userId: string, muted: boolean) => void;
  onGrantFloor?: (userId: string) => void;
  onKick?: (userId: string) => void;
  kickingId?: string | null;
}) {
  return (
    <div className="space-y-0.5">
      {participants.map((p, i) => (
        <motion.div key={p.userId}
          initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition group">
          <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
            <span className="text-white/50 text-xs font-semibold">{p.username[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/65 text-xs font-medium truncate">
              {p.username}
              {p.userId === currentUserId && <span className="text-white/20 ml-1 font-normal">(you)</span>}
              {p.isHost && <span className="text-orange-400/60 ml-1 font-normal">· host</span>}
            </p>
            <p className="text-white/20 text-[9px] capitalize">{p.role}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {p.handRaised && <span className="text-[11px]">✋</span>}
            {p.isMuted ? <MicOff size={10} className="text-white/15" /> : <Mic size={10} className="text-emerald-400/50" />}
            {isHost && p.userId !== currentUserId && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {p.handRaised && onGrantFloor && (
                  <button onClick={() => onGrantFloor(p.userId)}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition">
                    Allow
                  </button>
                )}
                {onMute && (
                  <button onClick={() => onMute(p.userId, !p.isMuted)}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 transition">
                    {p.isMuted ? 'Unmute' : 'Mute'}
                  </button>
                )}
                {onKick && (
                  <button
                    onClick={() => onKick(p.userId)}
                    disabled={kickingId === p.userId}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-400/70 border border-red-500/15 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-40 transition"
                  >
                    {kickingId === p.userId ? '…' : 'Kick'}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Speak Mode Toggle ── */
export function SpeakModeToggle({ mode, onChange }: { mode: SpeakMode; onChange: (m: SpeakMode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-soft text-white/45 text-[11px] hover:text-white/70 transition">
        <Settings size={11} />
        {mode === 'open' ? 'Open floor' : 'Request mode'}
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 glass rounded-xl overflow-hidden z-50 w-48 shadow-xl shadow-black/30">
            {([['request', 'Request to speak', 'Students raise hand'], ['open', 'Open floor', 'Anyone can speak']] as [SpeakMode, string, string][]).map(([m, label, desc]) => (
              <button key={m} onClick={() => { onChange(m); setOpen(false); }}
                className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-white/8 transition">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${mode === m ? 'bg-emerald-400' : 'bg-white/15'}`} />
                <div>
                  <p className={`text-xs font-medium ${mode === m ? 'text-white/80' : 'text-white/40'}`}>{label}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Hand Raise Button ── */
export function HandRaiseButton({ raised, onToggle, disabled }: {
  raised: boolean; onToggle: () => void; disabled?: boolean;
}) {
  return (
    <motion.button onClick={onToggle} disabled={disabled} whileTap={{ scale: 0.94 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200
        ${raised ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' : 'glass-soft border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      <Hand size={12} />
      {raised ? 'Lower hand' : 'Raise hand'}
    </motion.button>
  );
}

/* ── Participant Sidebar ── */
export function ParticipantSidebar({ children, title, visible }: {
  children: React.ReactNode; title: string; visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 220 }}
          exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0 border-l border-white/[0.07] overflow-hidden bg-black/10">
          <div className="w-[220px] h-full flex flex-col p-3 gap-3">
            <p className="text-white/25 text-[9px] uppercase tracking-widest font-medium px-1">{title}</p>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}