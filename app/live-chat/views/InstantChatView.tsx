'use client';

// app/live-chat/views/InstantChatView.tsx
// Replaces StudentChatView + TutorChatView — unified 1:1 instant session.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useChatSocket }   from '../hooks/useChatSocket';
import { useChatRoom }     from '../hooks/useChatRoom';
import { useChatMessages } from '../hooks/useChatMessages';
import { useTyping }       from '../hooks/useTyping';
import InviteModal         from '../components/InviteModal';
import {
  SessionHeader, MessageFeed, ChatInput,
  SessionEndedScreen, SessionWaitingRoom, PausedBanner,
} from '../components/SessionShared';
import type { SessionMeta, InviteRequest } from '../types/SocketEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const ACCEPT_TIMEOUT = 8_000;

interface Props {
  sessionId:       string;
  currentUserId:   string;
  currentUsername: string;
  meta:            SessionMeta;
  isPlus:          boolean;
  role:            'student' | 'tutor';
}

function friendlyEnd(reason: string, role: 'student' | 'tutor'): string {
  if (reason === 'ended_by_student') return role === 'student' ? 'You ended the session.' : 'The student ended the session.';
  if (reason === 'ended_by_tutor')   return role === 'tutor'   ? 'You ended the session.' : 'The tutor ended the session.';
  if (reason === 'inactivity')       return 'Ended due to inactivity.';
  if (reason === 'system')           return 'The session was ended by the platform.';
  return reason || 'The session has ended.';
}

export function InstantChatView({ sessionId, currentUserId, currentUsername, meta, role }: Props) {
  const router = useRouter();
  const { emit, on, off, isConnected } = useChatSocket();
  const presence = useChatRoom(sessionId);
  const { messages, sendMessage } = useChatMessages(sessionId);
  const { onKeystroke, stopTyping, someoneIsTyping } = useTyping(sessionId);

  // Tutor: needs to accept before joining
  const [accepted,      setAccepted]      = useState(role === 'student');
  const [accepting,     setAccepting]     = useState(false);
  const acceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [peerJoined,    setPeerJoined]    = useState(false);
  const [sessionEnded,  setSessionEnded]  = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [endReason,     setEndReason]     = useState('');
  const [input,         setInput]         = useState('');
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<InviteRequest | null>(null);
  const [hydrating,     setHydrating]     = useState(true);
  const joinedRef = useRef(false);

  useEffect(() => () => {
    if (acceptTimerRef.current) clearTimeout(acceptTimerRef.current);
  }, []);

  /* ── Hydrate ── */
  useEffect(() => {
    if (!sessionId) return;
    fetch(`${API_URL}/api/live-chat/${sessionId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.session) {
          const { status, tutorId, endedReason } = d.session;
          if (status === 'ended') {
            setSessionEnded(true); setEndReason(endedReason ?? '');
          } else if (status === 'paused') {
            setSessionPaused(true);
            if (tutorId) setPeerJoined(true);
            if (role === 'tutor' && tutorId === currentUserId) setAccepted(true);
          } else if (status === 'active' && tutorId) {
            setPeerJoined(true);
            if (role === 'tutor' && tutorId === currentUserId) setAccepted(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setHydrating(false));
  }, [sessionId, currentUserId, role]);

  /* ── Join on connect (only after accepted) ── */
  useEffect(() => {
    if (!isConnected || !sessionId || !accepted) return;
    if (joinedRef.current) return;
    joinedRef.current = true;
    emit('session:join', { sessionId });
    return () => { joinedRef.current = false; };
  }, [isConnected, sessionId, accepted, emit]);

  /* ── Socket events ── */
  useEffect(() => {
    const onTutorJoined = ({ sessionId: sid, tutorId }: { sessionId: string; tutorId: string }) => {
      if (sid !== sessionId) return;
      if (role === 'student') setPeerJoined(true);
      if (role === 'tutor' && tutorId === currentUserId) {
        if (acceptTimerRef.current) clearTimeout(acceptTimerRef.current);
        setAccepted(true); setAccepting(false);
      }
    };
    const onReady   = ({ sessionId: sid }: { sessionId: string }) => { if (sid === sessionId) setPeerJoined(true); };
    const onPaused  = () => setSessionPaused(true);
    const onStarted = ({ sessionId: sid }: { sessionId: string }) => { if (sid === sessionId) setSessionPaused(false); };
    const onEnded   = ({ reason }: { reason: string }) => { setEndReason(reason); setSessionEnded(true); };
    const onInviteReq = (p: InviteRequest) => { if (p.sessionId === sessionId) setPendingInvite(p); };
    const onInviteRes = () => setPendingInvite(null);

    on('chat:tutor_joined',    onTutorJoined);
    on('session:ready',        onReady);
    on('session:paused',       onPaused);
    on('session:started',      onStarted);
    on('session:ended',        onEnded);
    on('chat:invite_request',  onInviteReq);
    on('chat:invite_accepted', onInviteRes);
    on('chat:invite_declined', onInviteRes);
    return () => {
      off('chat:tutor_joined',    onTutorJoined);
      off('session:ready',        onReady);
      off('session:paused',       onPaused);
      off('session:started',      onStarted);
      off('session:ended',        onEnded);
      off('chat:invite_request',  onInviteReq);
      off('chat:invite_accepted', onInviteRes);
      off('chat:invite_declined', onInviteRes);
    };
  }, [sessionId, currentUserId, role, on, off]);

  const handleAccept = () => {
    if (accepting) return;
    setAccepting(true);
    emit('session:accept', { sessionId });
    acceptTimerRef.current = setTimeout(() => setAccepting(false), ACCEPT_TIMEOUT);
  };

  const handleEnd = () => {
    if (!confirmingEnd) { setConfirmingEnd(true); return; }
    const reason = role === 'tutor' ? 'ended_by_tutor' : 'ended_by_student';
    emit('session:end', { sessionId, reason });
    setSessionEnded(true); setEndReason(reason);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !peerJoined || sessionPaused) return;
    sendMessage(input); stopTyping(); setInput('');
  };

  if (hydrating) {
    return <div className="h-full flex items-center justify-center"><Loader2 size={18} className="text-white/30 animate-spin" /></div>;
  }

  if (sessionEnded) {
    return <SessionEndedScreen reason={endReason} onDismiss={() => router.push('/browse')} />;
  }

  /* ── Tutor accept screen ── */
  if (role === 'tutor' && !accepted) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl px-10 py-14 text-center max-w-sm w-full space-y-6">
          <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center mx-auto text-3xl">
            ✋
          </div>
          <div className="space-y-2">
            <p className="text-white/80 font-semibold text-lg tracking-tight">Student is waiting</p>
            <p className="text-white/40 text-sm leading-relaxed">
              {meta.subjectName ? `${meta.subjectName} · ` : ''}Instant chat session — accept to start.
            </p>
          </div>
          <button onClick={handleAccept} disabled={accepting}
            className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 font-medium text-sm hover:bg-emerald-500/30 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {accepting
              ? <><span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />Joining…</>
              : <><CheckCircle size={15} />Accept Session</>
            }
          </button>
          {accepting && <p className="text-white/20 text-xs">Connecting to session…</p>}
        </motion.div>
      </div>
    );
  }

  /* ── Student waiting for tutor ── */
  if (role === 'student' && !peerJoined) {
    return (
      <SessionWaitingRoom
        title="Waiting for your tutor…"
        subtitle="Hang tight — a tutor will join shortly. This is free for up to 60 minutes."
        onCancel={() => router.push('/browse')}
      />
    );
  }

  return (
    <>
      {pendingInvite && (
        <InviteModal
          invite={pendingInvite}
          onAccept={() => { emit('chat:invite_accept', { sessionId, responderUsername: currentUsername }); setPendingInvite(null); }}
          onDecline={() => { emit('chat:invite_decline', { sessionId, responderUsername: currentUsername }); setPendingInvite(null); }}
        />
      )}

      <div className="flex flex-col h-full">
        <SessionHeader
          title={peerJoined
            ? (role === 'student' ? 'Tutor connected' : 'Session active')
            : 'Connecting…'
          }
          subtitle={meta.subjectName}
          connected={isConnected}
          participantCount={presence.count}
          onEnd={handleEnd}
          confirmingEnd={confirmingEnd}
          onCancelEnd={() => setConfirmingEnd(false)}
          onConfirmEnd={handleEnd}
        />
        {sessionPaused && <PausedBanner />}
        <MessageFeed
          messages={messages}
          currentUserId={currentUserId}
          someoneIsTyping={someoneIsTyping}
          emptySlot={
            <div className="flex justify-center pt-10">
              <p className="text-white/20 text-sm">Session started — say hello! 👋</p>
            </div>
          }
        />
        <ChatInput
          value={input} onChange={setInput} onSubmit={handleSubmit} onKeystroke={onKeystroke}
          disabled={!peerJoined || sessionPaused}
          placeholder={
            !peerJoined ? 'Waiting for connection…'
            : sessionPaused ? 'Session paused…'
            : 'Type a message…'
          }
        />
      </div>
    </>
  );
}