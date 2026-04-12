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
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, BookOpen } from 'lucide-react';
import { StudyPanel } from '../components/StudyPanel';
import type { StudyTool } from '../components/StudyPanel';
import { useRouter } from 'next/navigation';
import { useChatSocket }    from '@/features/live-chat/hooks/useChatSocket';
import { useChatRoom }      from '@/features/live-chat/hooks/useChatRoom';
import { useChatMessages }  from '@/features/live-chat/hooks/useChatMessages';
import { useTyping }        from '@/features/live-chat/hooks/useTyping';
import { useLiveSession }   from '@/features/live-chat/hooks/useLiveSession';
import { useSessionStore }  from '@/features/live-chat/store/useSessionStore';
import InviteModal          from '../components/InviteModal';
import {
  SessionHeader, MessageFeed, ChatInput,
  SessionEndedScreen, SessionWaitingRoom, PausedBanner,
  GraceStateBanner, ActivityFeed, useActivityEvents, ConfirmEndBanner,
  ExtensionPromptBanner,
} from '../components/SessionShared';
import type { SessionMeta, InviteRequest } from '@/features/live-chat/types/SocketEvents';

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
  const { messages, sendMessage } = useChatMessages(sessionId, { id: currentUserId, name: currentUsername });
  const { onKeystroke, stopTyping, typingUsernames } = useTyping(sessionId);
  const { events: activityEvents, push: pushActivity } = useActivityEvents();

  // ── Backend-authoritative session state — all transitions via useLiveSession ──
  const { hydrating, status, endReason, startedAt, endsAt, graceExpiresAt, canExtend } = useLiveSession(sessionId);
  // Optimistic updates (handleEnd) still need direct store access
  const { setStatus, setEndReason } = useSessionStore();
  const sessionEnded      = status === 'ended';
  const sessionPaused     = status === 'paused';
  const sessionGrace      = status === 'host_left_grace';

  /* ── Tutor: needs to accept before joining the room ── */
  const [accepted,      setAccepted]      = useState(role === 'student');
  const [accepting,     setAccepting]     = useState(false);

  const [peerJoined,    setPeerJoined]    = useState(false);
  // Student can "Join now" to skip the waiting room and see the chat UI immediately
  const [skipWaiting,   setSkipWaiting]   = useState(false);
  const [input,         setInput]         = useState('');
  // Student-only: show the confirmation banner when they click End
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<InviteRequest | null>(null);
  const [extending,       setExtending]       = useState(false);
  const [dismissedExtend, setDismissedExtend] = useState(false);
  // Tick state: forces re-render every second so extension banner threshold
  // is evaluated fresh without drift (same pattern as GraceStateBanner).
  const [extTick, setExtTick] = useState(0);

  const [showTools,    setShowTools]    = useState(false);
  const joinedRef      = useRef(false);

  // Tools available per role
  const studentTools: StudyTool[] = ['notebook', 'files'];
  const tutorTools:   StudyTool[] = ['whiteboard', 'problems', 'files', 'broadcast'];
  const endedRef    = useRef(false);               // idempotency guard for handleEnd
  const activityRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const acceptTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  /* ── Cleanup helpers ── */
  const clearActivityInterval = () => {
    if (activityRef.current) { clearInterval(activityRef.current); activityRef.current = null; }
  };
  const clearAcceptTimer = () => {
    if (acceptTimerRef.current) { clearTimeout(acceptTimerRef.current); acceptTimerRef.current = null; }
  };

  useEffect(() => () => {
    clearActivityInterval();
  }, []);

  /* ── Seed peer/accept state from hydrated session status ── */
  // useLiveSession fetches the session; once hydrated, derive UI-local state
  // from the store status (peerJoined, accepted). This is the only place
  // local UI state is derived from session status — status itself is NOT set here.
  useEffect(() => {
    if (hydrating || status === null) return;
    if (status === 'active' || status === 'paused' || status === 'host_left_grace') {
      setPeerJoined(true);
      if (role === 'tutor') setAccepted(true);
    }
  }, [hydrating, status, role]);

  /* ── Join room once hydrated + accepted + socket ready ── */
  useEffect(() => {
    if (!isReady || !sessionId || !accepted || hydrating) return;
    // Do not join if session has already ended or hasn't been hydrated yet
    if (status === null || status === 'ended') return;
    if (joinedRef.current) return;

    joinedRef.current = true;
    emit('session:join', { sessionId });

    return () => {
      joinedRef.current = false;
      // Note: chat:leave is handled by useChatRoom — no need to duplicate here
    };
  }, [isReady, sessionId, accepted, hydrating, status, emit]);

  /* ── Cleanup when session ends (local side-effects only) ── */
  useEffect(() => {
    if (status === 'ended') clearActivityInterval();
  }, [status]);

  /* ── Extension prompt tick — re-render every second to check remaining time ── */
  useEffect(() => {
    if (!endsAt || status === 'ended') return;
    const t = setInterval(() => setExtTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [endsAt, status]);

  /* ── Reset dismiss flag when endsAt changes (session was extended) ── */
  useEffect(() => {
    setDismissedExtend(false);
    setExtending(false);
  }, [endsAt]);

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
        setAccepted(true);
        setAccepting(false);
      }
    };

    // session:ready fires when student's request is matched — peer is joining
    const onReady = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid === sessionId && role === 'student') setPeerJoined(true);
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
    on('chat:invite_request',  onInviteReq);
    on('chat:invite_accepted', onInviteRes);
    on('chat:invite_declined', onInviteRes);

    return () => {
      off('chat:tutor_joined',    onTutorJoined);
      off('session:ready',        onReady);
      off('chat:invite_request',  onInviteReq);
      off('chat:invite_accepted', onInviteRes);
      off('chat:invite_declined', onInviteRes);
    };
  // peerJoined + sessionEnded included so invite guard stays current
  }, [sessionId, currentUserId, role, peerJoined, sessionEnded, on, off]);

  /* ── Handlers ── */
  const handleAccept = useCallback(async () => {
    if (accepting || !isReady) return;
    setAccepting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res  = await fetch(`${API_URL}/api/live-chat/${sessionId}/accept`, {
        method:      'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) {
        setAccepting(false);
        return;
      }
      // HTTP success → backend atomically claimed the session and emitted session:ready
      // to the student. Transition tutor into the room immediately.
      clearAcceptTimer();
      setAccepted(true);
      setAccepting(false);
    } catch {
      setAccepting(false);
    }
  }, [accepting, isReady, sessionId]);

  // Derived: show extension banner when ≤ 3 min remain AND canExtend is true AND not dismissed.
  // extTick drives re-evaluation every second. dismissedExtend lets the user hide it.
  const remainingMs      = endsAt ? endsAt - Date.now() : Infinity;
  const showExtendBanner = canExtend && !dismissedExtend && remainingMs <= 3 * 60 * 1000 && remainingMs > 0;
  void extTick; // consumed to force re-render on each tick

  const handleExtend = useCallback(() => {
    if (extending || !canExtend) return;
    setExtending(true);
    emit('session:extend', { sessionId });
    // canExtend will flip to false via session:extended socket event → banner hides
    // Reset extending flag after a short timeout in case the event doesn't fire
    setTimeout(() => setExtending(false), 5000);
  }, [extending, canExtend, emit, sessionId]);

  // Student only: opens the ConfirmEndBanner; confirmed → ends session for both
  const handleEndRequest = useCallback(() => {
    if (endedRef.current || status === 'ended') return;
    setConfirmingEnd(true);
  }, [status]);

  const handleEndConfirm = useCallback(() => {
    if (endedRef.current || status === 'ended') return;
    endedRef.current = true;
    setConfirmingEnd(false);
    emit('session:end', { sessionId, reason: 'ended_by_student' });
    clearActivityInterval();
    setEndReason('ended_by_student');
    setStatus('ended');
  }, [status, emit, sessionId, setEndReason, setStatus]);

  // Tutor only: step away without ending — triggers 2-min grace period on backend
  const handleLeave = useCallback(() => {
    emit('session:host_leave', { sessionId });
    router.push('/dashboard');
  }, [emit, sessionId, router]);

  // Both roles: leave during grace period (session already in host_left_grace state)
  const handleLeaveGrace = useCallback(() => {
    emit('chat:leave', sessionId);
    router.push(role === 'tutor' ? '/dashboard' : '/browse');
  }, [emit, sessionId, router, role]);

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
        role={role}
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
  if (role === 'student' && !peerJoined && !skipWaiting) {
    return (
      <SessionWaitingRoom
        title="Waiting for your tutor…"
        subtitle="Hang tight — a tutor will join shortly. Free for up to 60 minutes."
        onJoinNow={() => setSkipWaiting(true)}
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
          title={meta.subjectName ?? 'Session'}
          subtitle={meta.subjectName}
          connected={isConnected}
          participantCount={presence.count}
          startedAt={startedAt ?? undefined}
          timerMode="elapsed"
          endsAt={endsAt ?? undefined}
          onEnd={role === 'student' ? handleEndRequest : undefined}
          onLeave={role === 'tutor' ? handleLeave : undefined}
          currentUser={{
            name:   currentUsername,
            inRoom: presence.participants.includes(currentUserId),
          }}
          peerUser={{
            name:   role === 'student'
              ? (meta.tutorName ?? 'Tutor')
              : (meta.studentName ?? 'Student'),
            inRoom: peerJoined,
          }}
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

        {/* Student end-session confirmation — slides in below header */}
        <AnimatePresence>
          {confirmingEnd && (
            <ConfirmEndBanner
              onConfirm={handleEndConfirm}
              onCancel={() => setConfirmingEnd(false)}
            />
          )}
        </AnimatePresence>

        {/* Banner shown when student skipped the waiting room but tutor hasn't joined yet */}
        {role === 'student' && skipWaiting && !peerJoined && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-orange-500/6 border-b border-orange-500/12">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span className="text-orange-300/70 text-[11px]">Waiting for your tutor to join…</span>
          </div>
        )}
        {/* Extension prompt — shown when ≤ 3 min remain on the 30-min cap */}
        <AnimatePresence>
          {showExtendBanner && !sessionEnded && (
            <ExtensionPromptBanner
              onExtend={handleExtend}
              onDismiss={() => setDismissedExtend(true)}
              extending={extending}
            />
          )}
        </AnimatePresence>

        {sessionPaused && <PausedBanner />}
        {sessionGrace && graceExpiresAt && (
          <GraceStateBanner
            graceExpiresAt={graceExpiresAt}
            onLeave={handleLeaveGrace}
          />
        )}

        <MessageFeed
          messages={messages}
          currentUserId={currentUserId}
          showSenders
          emptySlot={
            <div className="flex justify-center pt-10">
              <p className="text-white/20 text-sm">Session started — say hello! 👋</p>
            </div>
          }
        />

        <ActivityFeed typingUsernames={typingUsernames} events={activityEvents} />

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