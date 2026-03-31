'use client';

// app/live-chat/views/InstantChatView.tsx
// Unified 1:1 instant session — student and tutor roles.
//
// Flow:
//   Student → lands here after tutor accepts → waits in SessionWaitingRoom
//             until chat:tutor_joined → full chat
//   Tutor   → lands on accept screen → emits session:accept → joins room
//             → full chat
//
// Hardening over original:
//   - All emits gated behind isReady (not just isConnected)
//   - joinedRef cleaned up on sessionId change, not just unmount
//   - accept timeout clears properly on success
//   - session:activity heartbeat while in session
//   - invite modal guarded — only shown when session is live
//   - handleEnd idempotent — can't double-fire
//   - input trimmed before sendMessage (server max 4000 chars)

import { useEffect, useRef, useState, FormEvent, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, BookOpen } from 'lucide-react';
import { StudyPanel } from '../components/StudyPanel';
import type { StudyTool } from '../components/StudyPanel';
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

const ACCEPT_TIMEOUT      = 8_000;
const ACTIVITY_INTERVAL   = 30_000; // session:activity heartbeat — keep server watchdog alive

interface Props {
  sessionId:       string;
  currentUserId:   string;
  currentUsername: string;
  meta:            SessionMeta;
  isPlus:          boolean;
  role:            'student' | 'tutor';
}

function friendlyEnd(reason: string, role: 'student' | 'tutor'): string {
  switch (reason) {
    case 'ended_by_student':   return role === 'student' ? 'You ended the session.' : 'The student ended the session.';
    case 'ended_by_tutor':     return role === 'tutor'   ? 'You ended the session.' : 'The tutor ended the session.';
    case 'inactivity':         return 'Ended due to inactivity.';
    case 'no_tutor_available': return 'No tutors were available. Please try again.';
    case 'system':             return 'The session was ended by the platform.';
    default:                   return reason || 'The session has ended.';
  }
}

export function InstantChatView({
  sessionId, currentUserId, currentUsername, meta, role,
}: Props) {
  const router = useRouter();

  // isReady: auth settled + socket connected — gate all emits behind this
  const { emit, on, off, isConnected, isReady } = useChatSocket();
  const presence = useChatRoom(sessionId);
  const { messages, sendMessage } = useChatMessages(sessionId);
  const { onKeystroke, stopTyping, someoneIsTyping } = useTyping(sessionId);

  /* ── Tutor: needs to accept before joining the room ── */
  const [accepted,      setAccepted]      = useState(role === 'student');
  const [accepting,     setAccepting]     = useState(false);

  const [peerJoined,    setPeerJoined]    = useState(false);
  const [sessionEnded,  setSessionEnded]  = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [endReason,     setEndReason]     = useState('');
  const [input,         setInput]         = useState('');
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<InviteRequest | null>(null);
  const [hydrating,     setHydrating]     = useState(true);

  const [showTools,    setShowTools]    = useState(false);
  const joinedRef      = useRef(false);

  // Tools available per role
  const studentTools: StudyTool[] = ['notebook', 'files'];
  const tutorTools:   StudyTool[] = ['whiteboard', 'problems', 'files', 'broadcast'];
  const endedRef       = useRef(false);               // idempotency guard for handleEnd
  const acceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Cleanup helpers ── */
  const clearAcceptTimer = () => {
    if (acceptTimerRef.current) { clearTimeout(acceptTimerRef.current); acceptTimerRef.current = null; }
  };
  const clearActivityInterval = () => {
    if (activityRef.current) { clearInterval(activityRef.current); activityRef.current = null; }
  };

  useEffect(() => () => {
    clearAcceptTimer();
    clearActivityInterval();
  }, []);

  /* ── Hydrate: resolve session state on mount ── */
  useEffect(() => {
    if (!sessionId) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    let cancelled = false;
    fetch(`${API_URL}/api/live-chat/${sessionId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.success || !d.session) return;
        const { status, tutorId, endedReason } = d.session;

        if (status === 'ended') {
          setSessionEnded(true);
          setEndReason(endedReason ?? '');
        } else if (status === 'paused') {
          setSessionPaused(true);
          if (tutorId) setPeerJoined(true);
          if (role === 'tutor' && tutorId === currentUserId) setAccepted(true);
        } else if (status === 'active' && tutorId) {
          setPeerJoined(true);
          if (role === 'tutor' && tutorId === currentUserId) setAccepted(true);
        }
      })
      .catch(() => {}) // hydration failure is non-fatal — socket will catch up
      .finally(() => { if (!cancelled) setHydrating(false); });

    return () => { cancelled = true; };
  }, [sessionId, currentUserId, role]);

  /* ── Join room once accepted + socket ready ── */
  useEffect(() => {
    if (!isReady || !sessionId || !accepted) return;
    if (joinedRef.current) return;

    joinedRef.current = true;
    emit('session:join', { sessionId });

    return () => {
      joinedRef.current = false;
      // Note: chat:leave is handled by useChatRoom — no need to duplicate here
    };
  }, [isReady, sessionId, accepted, emit]);

  /* ── session:activity heartbeat — keeps server watchdog alive ── */
  useEffect(() => {
    if (!isReady || !accepted || !peerJoined || sessionEnded || sessionPaused) {
      clearActivityInterval();
      return;
    }

    activityRef.current = setInterval(() => {
      emit('session:activity', { sessionId });
    }, ACTIVITY_INTERVAL);

    return clearActivityInterval;
  }, [isReady, accepted, peerJoined, sessionEnded, sessionPaused, sessionId, emit]);

  /* ── Socket events ── */
  useEffect(() => {
    const onTutorJoined = ({ sessionId: sid, tutorId }: { sessionId: string; tutorId: string }) => {
      if (sid !== sessionId) return;
      if (role === 'student') {
        setPeerJoined(true);
      }
      if (role === 'tutor' && tutorId === currentUserId) {
        clearAcceptTimer();
        setAccepted(true);
        setAccepting(false);
      }
    };

    // session:ready fires when student's request is matched — peer is joining
    const onReady = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid === sessionId && role === 'student') setPeerJoined(true);
    };

    const onPaused  = () => setSessionPaused(true);
    const onStarted = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid === sessionId) setSessionPaused(false);
    };
    const onEnded = ({ reason }: { reason: string }) => {
      setEndReason(reason);
      setSessionEnded(true);
      clearActivityInterval();
    };

    // Invite requests — only show modal if the session is live
    const onInviteReq = (p: InviteRequest) => {
      if (p.sessionId === sessionId && peerJoined && !sessionEnded) {
        setPendingInvite(p);
      }
    };
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
  // peerJoined + sessionEnded included so invite guard stays current
  }, [sessionId, currentUserId, role, peerJoined, sessionEnded, on, off]);

  /* ── Handlers ── */
  const handleAccept = useCallback(() => {
    if (accepting || !isReady) return;
    setAccepting(true);
    emit('session:accept', { sessionId });

    // Fallback: if server never confirms, reset accepting state
    acceptTimerRef.current = setTimeout(() => {
      setAccepting(false);
    }, ACCEPT_TIMEOUT);
  }, [accepting, isReady, emit, sessionId]);

  const handleEnd = useCallback(() => {
    if (endedRef.current) return; // idempotent — prevents double-fire
    if (!confirmingEnd) {
      setConfirmingEnd(true);
      return;
    }
    endedRef.current = true;
    const reason = role === 'tutor' ? 'ended_by_tutor' : 'ended_by_student';
    emit('session:end', { sessionId, reason });
    clearActivityInterval();
    setSessionEnded(true);
    setEndReason(reason);
  }, [confirmingEnd, role, emit, sessionId]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    // Server enforces 4000 char max — guard client-side too
    if (!trimmed || trimmed.length > 4000 || !peerJoined || sessionPaused || !isReady) return;
    sendMessage(trimmed);
    stopTyping();
    setInput('');
  }, [input, peerJoined, sessionPaused, isReady, sendMessage, stopTyping]);

  const handleInviteAccept = useCallback(() => {
    if (!pendingInvite) return;
    emit('chat:invite_accept', { sessionId, responderUsername: currentUsername });
    setPendingInvite(null);
  }, [pendingInvite, emit, sessionId, currentUsername]);

  const handleInviteDecline = useCallback(() => {
    if (!pendingInvite) return;
    emit('chat:invite_decline', { sessionId, responderUsername: currentUsername });
    setPendingInvite(null);
  }, [pendingInvite, emit, sessionId, currentUsername]);

  /* ── Render states ── */
  if (hydrating) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={18} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <SessionEndedScreen
        reason={friendlyEnd(endReason, role)}
        onDismiss={() => router.push('/browse')}
      />
    );
  }

  /* ── Tutor: accept screen ── */
  if (role === 'tutor' && !accepted) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl px-10 py-14 text-center max-w-sm w-full space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl glass-soft flex items-center justify-center mx-auto text-3xl">
            ✋
          </div>
          <div className="space-y-2">
            <p className="text-white/80 font-semibold text-lg tracking-tight">Student is waiting</p>
            <p className="text-white/40 text-sm leading-relaxed">
              {meta.subjectName ? `${meta.subjectName} · ` : ''}Instant chat — accept to start.
            </p>
          </div>

          <button
            onClick={handleAccept}
            disabled={accepting || !isReady}
            className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 font-medium text-sm hover:bg-emerald-500/30 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {accepting
              ? <><span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />Joining…</>
              : <><CheckCircle size={15} />Accept Session</>
            }
          </button>

          {/* Socket not ready — tell tutor why the button is disabled */}
          {!isReady && !accepting && (
            <p className="text-white/20 text-xs">Connecting to server…</p>
          )}
        </motion.div>
      </div>
    );
  }

  /* ── Student: waiting for tutor ── */
  if (role === 'student' && !peerJoined) {
    return (
      <SessionWaitingRoom
        title="Waiting for your tutor…"
        subtitle="Hang tight — a tutor will join shortly. Free for up to 60 minutes."
        onCancel={() => {
          emit('session:end', { sessionId, reason: 'ended_by_student' });
          router.push('/browse');
        }}
      />
    );
  }

  /* ── Live session ── */
  return (
    <>
      {pendingInvite && (
        <InviteModal
          invite={pendingInvite}
          onAccept={handleInviteAccept}
          onDecline={handleInviteDecline}
        />
      )}

      <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <SessionHeader
          title={
            peerJoined
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
          rightSlot={
            peerJoined ? (
              <button
                onClick={() => setShowTools(s => !s)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                  showTools
                    ? 'bg-blue-500/20 border-blue-500/25 text-blue-300'
                    : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <BookOpen size={11} /> Tools
              </button>
            ) : undefined
          }
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
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onKeystroke={onKeystroke}
          disabled={!peerJoined || sessionPaused || !isReady}
          placeholder={
            !isReady        ? 'Reconnecting…'
            : !peerJoined   ? 'Waiting for connection…'
            : sessionPaused ? 'Session paused…'
            : 'Type a message…'
          }
        />
        </div>

        {/* Study tools panel */}
        {peerJoined && showTools && (
          <StudyPanel
            sessionId={sessionId}
            currentUsername={currentUsername}
            tools={role === 'tutor' ? tutorTools : studentTools}
            permissions={{
              canDrive:       role === 'tutor',
              notebookShared: false, // 1:1 notebook is personal
            }}
            emit={emit}
            on={on}
            off={off}
          />
        )}
      </div>
    </>
  );
}