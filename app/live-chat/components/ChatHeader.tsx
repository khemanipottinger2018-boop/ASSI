'use client';

import { useEffect, useRef, useState } from 'react';
import { UserPlus, Loader2, Users, X, Check } from 'lucide-react';

export interface ChatHeaderProps {
  currentUserName: string;
  otherUserName?: string;
  tutorJoined: boolean;

  // Invite + group props (optional — falls back gracefully if not passed)
  participantCount?: number;
  isAtCapacity?: boolean;
  pendingInvite?: boolean;
  showInviteInput?: boolean;
  canInvite?: boolean;
  onInviteToggle?: () => void;
  onSendInvite?: (username: string) => void;
}

export default function ChatHeader({
  currentUserName,
  otherUserName,
  tutorJoined,
  participantCount = 2,
  isAtCapacity = false,
  pendingInvite = false,
  showInviteInput = false,
  canInvite = false,
  onInviteToggle,
  onSendInvite,
}: ChatHeaderProps) {
  const [seconds, setSeconds] = useState(0);
  const [inviteInput, setInviteInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Session timer ── */
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  /* ── Focus invite input when it opens ── */
  useEffect(() => {
    if (showInviteInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInviteInput('');
    }
  }, [showInviteInput]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendInvite = () => {
    const trimmed = inviteInput.trim();
    if (!trimmed || !onSendInvite) return;
    onSendInvite(trimmed);
    setInviteInput('');
  };

  const showGroupBadge = participantCount > 2;

  return (
    <div className="border-b border-neutral-800 bg-neutral-900/70 backdrop-blur-sm">

      {/* ── Main row ── */}
      <div className="px-6 py-3 flex items-center justify-between text-sm">

        {/* Left — current user */}
        <div className="flex items-center gap-2 text-neutral-300">
          <div className="w-2 h-2 rounded-full bg-neutral-400" />
          <span>{currentUserName}</span>
        </div>

        {/* Center — timer + group badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{formatTime(seconds)}</span>

          {showGroupBadge && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/8 border border-white/15 text-white/50 text-[10px]">
              <Users size={10} />
              {participantCount}
            </div>
          )}
        </div>

        {/* Right — other participant + invite button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-neutral-300">
            <span>
              {tutorJoined ? (otherUserName ?? 'Tutor') : 'Waiting for tutor'}
            </span>
            <div className={`w-2 h-2 rounded-full ${tutorJoined ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
          </div>

          {/* Invite button — only shown when canInvite or pending */}
          {(canInvite || pendingInvite) && onInviteToggle && (
            <button
              onClick={onInviteToggle}
              disabled={pendingInvite || isAtCapacity}
              title={
                isAtCapacity
                  ? 'Session is full'
                  : pendingInvite
                  ? 'Waiting for approval…'
                  : 'Invite someone'
              }
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition
                ${pendingInvite
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : isAtCapacity
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : showInviteInput
                  ? 'bg-white/15 text-white/80'
                  : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/80'
                }
              `}
            >
              {pendingInvite
                ? <><Loader2 size={12} className="animate-spin" /> Pending</>
                : <><UserPlus size={12} /> Invite</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Invite input row — slides in when showInviteInput ── */}
      {showInviteInput && !pendingInvite && (
        <div className="px-6 pb-3 flex items-center gap-2">
          <input
            ref={inputRef}
            value={inviteInput}
            onChange={e => setInviteInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
            placeholder="Enter username to invite…"
            className="
              flex-1 px-3 py-2 rounded-lg text-xs
              bg-white/6 border border-white/15
              text-white placeholder-white/30
              focus:outline-none focus:border-white/30
              transition
            "
          />
          <button
            onClick={handleSendInvite}
            disabled={!inviteInput.trim()}
            className="
              p-2 rounded-lg bg-white/10 text-white/60
              hover:bg-white/15 hover:text-white/90
              disabled:opacity-30 disabled:cursor-not-allowed
              transition
            "
          >
            <Check size={14} />
          </button>
          <button
            onClick={onInviteToggle}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white/70 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}