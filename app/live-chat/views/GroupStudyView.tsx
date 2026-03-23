'use client';

// app/live-chat/views/GroupStudyView.tsx
// Multi-participant group study — 3 free / 6 ASSI+
// Invite system with approval, participant sidebar, capacity enforcement

import { useEffect, useRef, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, X, Check, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useChatSocket }   from '../hooks/useChatSocket';
import { useChatMessages } from '../hooks/useChatMessages';
import { useTyping }       from '../hooks/useTyping';
import {
  SessionHeader, MessageFeed, ChatInput,
  SessionEndedScreen, SessionWaitingRoom, PausedBanner,
  ParticipantList, ParticipantSidebar,
} from '../components/SessionShared';
import type { SessionMeta, Participant, InviteRequest } from '../types/SocketEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Props {
  sessionId:       string;
  currentUserId:   string;
  currentUsername: string;
  meta:            SessionMeta;
  isPlus:          boolean;
  role:            'student' | 'tutor';
  maxParticipants: number;
}

export function GroupStudyView({
  sessionId, currentUserId, currentUsername, meta, isPlus, role, maxParticipants,
}: Props) {
  const router = useRouter();
  const { emit, on, off, isConnected } = useChatSocket();
  const { messages, sendMessage } = useChatMessages(sessionId);
  const { onKeystroke, stopTyping, someoneIsTyping } = useTyping(sessionId);

  const [participants,  setParticipants]  = useState<Participant[]>([]);
  const [sessionEnded,  setSessionEnded]  = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [endReason,     setEndReason]     = useState('');
  const [input,         setInput]         = useState('');
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showSidebar,   setShowSidebar]   = useState(true);
  const [showInvite,    setShowInvite]    = useState(false);
  const [inviteInput,   setInviteInput]   = useState('');
  const [invitePending, setInvitePending] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<InviteRequest | null>(null);
  const [hydrating,     setHydrating]     = useState(true);
  const joinedRef = useRef(false);

  const isAtCapacity = participants.length >= maxParticipants;

  /* ── Hydrate ── */
  useEffect(() => {
    fetch(`${API_URL}/api/live-chat/${sessionId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.session) {
          const { status, endedReason } = d.session;
          if (status === 'ended') { setSessionEnded(true); setEndReason(endedReason ?? ''); }
          else if (status === 'paused') setSessionPaused(true);
        }
      })
      .catch(() => {})
      .finally(() => setHydrating(false));
  }, [sessionId]);

  /* ── Join ── */
  useEffect(() => {
    if (!isConnected || !sessionId) return;
    if (joinedRef.current) return;
    joinedRef.current = true;
    emit('session:join', { sessionId });
    return () => { joinedRef.current = false; };
  }, [isConnected, sessionId, emit]);

  /* ── Socket events ── */
  useEffect(() => {
    const onParticipants = ({ sessionId: sid, participants: list }: { sessionId: string; participants: Participant[] }) => {
      if (sid !== sessionId) return;
      setParticipants(list);
    };
    const onPaused     = () => setSessionPaused(true);
    const onStarted    = ({ sessionId: sid }: { sessionId: string }) => { if (sid === sessionId) setSessionPaused(false); };
    const onEnded      = ({ reason }: { reason: string }) => { setEndReason(reason); setSessionEnded(true); };
    const onInviteReq  = (p: InviteRequest) => { if (p.sessionId === sessionId) setPendingApproval(p); };
    const onInviteAcc  = () => { setPendingApproval(null); setInvitePending(false); };
    const onInviteDec  = () => { setPendingApproval(null); setInvitePending(false); };
    const onInviteErr  = () => setInvitePending(false);

    on('session:participants', onParticipants);
    on('session:paused',       onPaused);
    on('session:started',      onStarted);
    on('session:ended',        onEnded);
    on('chat:invite_request',  onInviteReq);
    on('chat:invite_accepted', onInviteAcc);
    on('chat:invite_declined', onInviteDec);
    on('chat:invite_error',    onInviteErr);
    return () => {
      off('session:participants', onParticipants);
      off('session:paused',       onPaused);
      off('session:started',      onStarted);
      off('session:ended',        onEnded);
      off('chat:invite_request',  onInviteReq);
      off('chat:invite_accepted', onInviteAcc);
      off('chat:invite_declined', onInviteDec);
      off('chat:invite_error',    onInviteErr);
    };
  }, [sessionId, on, off]);

  const handleEnd = () => {
    if (!confirmingEnd) { setConfirmingEnd(true); return; }
    emit('session:end', { sessionId, reason: 'ended_by_host' });
    setSessionEnded(true); setEndReason('ended_by_host');
  };

  const handleSendInvite = () => {
    const username = inviteInput.trim();
    if (!username || invitePending) return;
    setInvitePending(true);
    emit('chat:invite_request', { sessionId, fromUsername: currentUsername, inviteeUsername: username });
    setInviteInput(''); setShowInvite(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sessionPaused) return;
    sendMessage(input); stopTyping(); setInput('');
  };

  if (hydrating) return <div className="h-full flex items-center justify-center"><Loader2 size={18} className="text-white/30 animate-spin" /></div>;
  if (sessionEnded) return <SessionEndedScreen reason={endReason} onDismiss={() => router.push('/browse')} />;

  const spotsLeft = maxParticipants - participants.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">

        <SessionHeader
          title={`Group Study${meta.subjectName ? ` · ${meta.subjectName}` : ''}`}
          subtitle={`${participants.length}/${maxParticipants} members${isPlus ? '' : ' · upgrade for 6'}`}
          connected={isConnected}
          participantCount={participants.length}
          onEnd={handleEnd}
          confirmingEnd={confirmingEnd}
          onCancelEnd={() => setConfirmingEnd(false)}
          onConfirmEnd={handleEnd}
          rightSlot={
            <div className="flex items-center gap-2">
              {!isAtCapacity && !invitePending && (
                <button onClick={() => setShowInvite(s => !s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                    showInvite ? 'bg-white/10 border-white/20 text-white/70' : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                  }`}>
                  <UserPlus size={11} /> Invite
                </button>
              )}
              {invitePending && (
                <span className="flex items-center gap-1 text-white/30 text-[11px]">
                  <Loader2 size={10} className="animate-spin" /> Pending…
                </span>
              )}
              <button onClick={() => setShowSidebar(s => !s)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                  showSidebar ? 'bg-white/10 border-white/20 text-white/70' : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                }`}>
                <Users size={11} /> {participants.length}
              </button>
            </div>
          }
        />

        {/* Invite input bar */}
        <AnimatePresence>
          {showInvite && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
              className="shrink-0 overflow-hidden border-b border-white/[0.07]">
              <div className="flex items-center gap-2 px-4 py-2.5">
                <input autoFocus value={inviteInput} onChange={e => setInviteInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                  placeholder="Username to invite…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition" />
                <button onClick={handleSendInvite} disabled={!inviteInput.trim()}
                  className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 hover:text-white disabled:opacity-30 transition">
                  <Check size={13} />
                </button>
                <button onClick={() => { setShowInvite(false); setInviteInput(''); }}
                  className="p-2 rounded-lg glass-soft text-white/30 hover:text-white/60 transition">
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending approval request (all members vote) */}
        <AnimatePresence>
          {pendingApproval && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="shrink-0 flex items-center gap-3 px-4 py-3 bg-blue-500/8 border-b border-blue-500/15">
              <div className="flex-1 min-w-0">
                <p className="text-blue-300/80 text-xs">
                  <span className="font-medium text-white/70">{pendingApproval.fromUsername}</span>
                  {' '}wants to invite{' '}
                  <span className="font-medium text-white/70">{pendingApproval.inviteeUsername}</span>
                </p>
              </div>
              <button onClick={() => { emit('chat:invite_accept', { sessionId, responderUsername: currentUsername }); setPendingApproval(null); }}
                className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[11px] border border-blue-500/25 hover:bg-blue-500/30 transition">
                Approve
              </button>
              <button onClick={() => { emit('chat:invite_decline', { sessionId, responderUsername: currentUsername }); setPendingApproval(null); }}
                className="px-2.5 py-1 rounded-lg glass-soft text-white/30 text-[11px] hover:text-white/60 transition">
                Decline
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Capacity warning */}
        {isAtCapacity && !isPlus && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-orange-500/6 border-b border-orange-500/12">
            <Sparkles size={11} className="text-orange-400/70" />
            <span className="text-orange-400/60 text-[11px]">Room is full. Upgrade to ASSI+ for 6 members.</span>
          </div>
        )}

        {sessionPaused && <PausedBanner />}

        <MessageFeed
          messages={messages} currentUserId={currentUserId}
          someoneIsTyping={someoneIsTyping} showSenders
          emptySlot={
            <div className="flex flex-col items-center gap-2 pt-12">
              <div className="glass-soft rounded-2xl px-6 py-4 text-center">
                <p className="text-white/25 text-sm">Group session started</p>
                <p className="text-white/15 text-xs mt-1">
                  {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} remaining` : 'Room is full'}
                </p>
              </div>
            </div>
          }
        />
        <ChatInput
          value={input} onChange={setInput} onSubmit={handleSubmit} onKeystroke={onKeystroke}
          disabled={sessionPaused} placeholder="Message the group…"
        />
      </div>

      <ParticipantSidebar title={`Members · ${participants.length}/${maxParticipants}`} visible={showSidebar}>
        <ParticipantList participants={participants} currentUserId={currentUserId} />
        {!isPlus && (
          <div className="mt-3 px-2">
            <p className="text-orange-400/40 text-[10px] text-center">
              ASSI+ unlocks 6 members
            </p>
          </div>
        )}
      </ParticipantSidebar>
    </div>
  );
}