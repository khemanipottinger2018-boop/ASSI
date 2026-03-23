'use client';

// app/live-chat/components/SessionShared.tsx

import { useEffect, useRef, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, PhoneOff, Users, PauseCircle,
  Hand, Mic, MicOff, Settings, ChevronDown,
} from 'lucide-react';
import type { ChatMessage, Participant, SpeakMode } from '../types/SocketEvents';

/* ── Timer ── */
export function SessionTimer({ className = '' }: { className?: string }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`font-mono tabular-nums text-xs ${className}`}>
      {Math.floor(s / 60)}:{(s % 60).toString().padStart(2, '0')}
    </span>
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
interface HeaderProps {
  title: string; subtitle?: string; connected: boolean;
  participantCount?: number;
  onEnd: () => void; confirmingEnd: boolean;
  onCancelEnd: () => void; onConfirmEnd: () => void;
  rightSlot?: React.ReactNode; badge?: React.ReactNode;
}

export function SessionHeader({
  title, subtitle, connected, participantCount,
  onEnd, confirmingEnd, onCancelEnd, onConfirmEnd, rightSlot, badge,
}: HeaderProps) {
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] bg-black/20 backdrop-blur-sm">
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

      <SessionTimer className="text-white/20" />
      {rightSlot}

      <AnimatePresence mode="wait">
        {confirmingEnd ? (
          <motion.div key="confirm"
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
            className="flex items-center gap-2">
            <span className="text-white/30 text-[11px]">End?</span>
            <button onClick={onConfirmEnd}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/25 text-red-400 text-[11px] font-medium hover:bg-red-500/30 transition">
              End
            </button>
            <button onClick={onCancelEnd}
              className="px-2.5 py-1 rounded-lg glass-soft text-white/30 text-[11px] hover:text-white/60 transition">
              Cancel
            </button>
          </motion.div>
        ) : (
          <motion.button key="end-btn"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onEnd}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
            title="End session">
            <PhoneOff size={13} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
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
      {showSender && msg.senderName && !isMe && (
        <span className="text-[9px] text-white/25 px-3">{msg.senderName}</span>
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
export function MessageFeed({ messages, currentUserId, someoneIsTyping, typingName, showSenders, emptySlot }: {
  messages: ChatMessage[]; currentUserId: string;
  someoneIsTyping: boolean; typingName?: string;
  showSenders?: boolean; emptySlot?: React.ReactNode;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, someoneIsTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
      {messages.length === 0 && emptySlot}
      <AnimatePresence initial={false}>
        {messages.map(msg => (
          <MessageBubble key={msg.messageId} msg={msg}
            isMe={msg.senderId === currentUserId} showSender={showSenders} />
        ))}
        {someoneIsTyping && <TypingIndicator key="typing" name={typingName} />}
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

/* ── Session Ended ── */
const END_REASONS: Record<string, string> = {
  inactivity:         'Ended due to inactivity.',
  no_tutor_available: 'No tutors were available. Please try again.',
  system:             'The session was ended by the platform.',
  ended_by_tutor:     'The tutor ended the session.',
  ended_by_student:   'You ended the session.',
  ended_by_host:      'The host ended the session.',
};

export function SessionEndedScreen({ reason, onDismiss }: { reason: string; onDismiss?: () => void }) {
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
        {onDismiss && (
          <button onClick={onDismiss} className="glass-soft px-6 py-2.5 rounded-xl text-white/45 text-sm hover:text-white/70 transition">
            Back to browse
          </button>
        )}
      </motion.div>
    </div>
  );
}

/* ── Waiting Room ── */
export function SessionWaitingRoom({ title, subtitle, onCancel }: {
  title: string; subtitle: string; onCancel?: () => void;
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
        {onCancel && (
          <button onClick={onCancel} className="text-white/20 text-xs hover:text-white/45 transition">Cancel</button>
        )}
      </motion.div>
    </div>
  );
}

/* ── Participant List ── */
export function ParticipantList({ participants, currentUserId, isHost, onMute, onGrantFloor }: {
  participants: Participant[]; currentUserId: string; isHost?: boolean;
  onMute?: (userId: string, muted: boolean) => void;
  onGrantFloor?: (userId: string) => void;
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