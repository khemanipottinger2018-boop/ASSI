'use client';

// app/live-chat/views/ConferenceView.tsx
//
// Three distinct actors, one view:
//
//   attendee    — raise/lower hand, speak when floor is granted or mode is open
//   tutor host  — speak mode toggle, grant floor, mute/unmute individuals, end session
//   admin       — everything tutor has + mute all, broadcast announcements, force end (no confirm)
//
// Conference is a tutor-only feature. Tutors start and host the session;
// anyone who joins via the broadcast link is an attendee.
//
// Role is determined by the caller ([chatId]/page.tsx):
//   admin    → user.role === 'admin'
//   tutor    → meta.hostId === user.id
//   attendee → everyone else

import { useEffect, useRef, useState, FormEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Users, Radio, Shield, MicOff, Megaphone, BookOpen } from 'lucide-react';
import { useChatSocket }    from '@/features/live-chat/hooks/useChatSocket';
import { useChatMessages }  from '@/features/live-chat/hooks/useChatMessages';
import { useTyping }        from '@/features/live-chat/hooks/useTyping';
import { useSessionEvents } from '@/features/live-chat/hooks/useSessionEvents';
import { useSessionStore }  from '@/features/live-chat/store/useSessionStore';
import {
  SessionHeader, MessageFeed, ChatInput,
  SessionEndedScreen, PausedBanner, LiveBadge, ConfirmEndBanner,
  ParticipantList, ParticipantSidebar,
  SpeakModeToggle, HandRaiseButton,
  ActivityFeed, useActivityEvents,
} from '../components/SessionShared';
import type { SessionMeta, Participant, SpeakMode } from '@/features/live-chat/types/SocketEvents';
import { StudyPanel } from '@/features/live-chat';
import type { StudyTool, StudyPermissions } from '@/features/live-chat';

const API_URL            = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const ACTIVITY_INTERVAL  = 30_000;

// ─── Prop shape ──────────────────────────────────────────────────────────────

export type ConferenceRole = 'attendee' | 'tutor' | 'admin';

interface Props {
  sessionId:       string;
  currentUserId:   string;
  currentUsername: string;
  meta:            SessionMeta;
  isPlus:          boolean;
  // viewerRole replaces the old isHost boolean — the caller sets this.
  // [chatId]/page.tsx: admin → 'admin', meta.hostId === user.id → 'tutor', else → 'student'
  viewerRole:      ConferenceRole;
}

// ─── Capability derived from role ────────────────────────────────────────────

interface Capabilities {
  canHost:       boolean; // tutor + admin: speak mode, grant floor, mute individuals, end
  canAdminForce: boolean; // admin only: mute all, broadcast, force end without confirm
  isParticipant: boolean; // student + tutor: raise hand, send messages when allowed
}

function getCapabilities(role: ConferenceRole): Capabilities {
  return {
    canHost:       role === 'tutor' || role === 'admin',
    canAdminForce: role === 'admin',
    isParticipant: role === 'attendee' || role === 'tutor',
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConferenceView({
  sessionId, currentUserId, currentUsername, meta, viewerRole,
}: Props) {
  const { emit, on, off, isConnected, isReady } = useChatSocket();
  const { messages, sendMessage } = useChatMessages(sessionId, { id: currentUserId, name: currentUsername });
  const { onKeystroke, stopTyping, typingUsernames } = useTyping(sessionId);
  const { events: activityEvents, push: pushActivity } = useActivityEvents();

  const cap = getCapabilities(viewerRole);

  // ── Centralized session lifecycle — single .on() binding per event ──
  useSessionEvents(sessionId);
  const { status, endReason, setStatus, setEndReason, reset } = useSessionStore();
  const sessionEnded  = status === 'ended';
  const sessionPaused = status === 'paused';

  // Session-aware reset: only clears state when sessionId changes (not same-session re-renders)
  useEffect(() => { reset(sessionId); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Study panel config (role-gated) ───────────────────────────────────────
  // Admin monitors only — no study tools.
  const studyTools: StudyTool[] | null =
    viewerRole === 'tutor'
      ? ['whiteboard', 'problems', 'broadcast', 'timer', 'notebook']
      : viewerRole === 'attendee'
        ? ['notebook', 'files', 'whiteboard']
        : null;

  const studyPermissions: StudyPermissions = {
    canDrive:       cap.canHost,
    notebookShared: viewerRole === 'tutor',
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [participants,   setParticipants]   = useState<Participant[]>([]);
  const [speakMode,      setSpeakMode]      = useState<SpeakMode>('request');
  const [handRaised,     setHandRaised]     = useState(false);
  // canSpeak: true for host/admin always; students start false in request mode
  const [canSpeak,       setCanSpeak]       = useState(cap.canHost);
  const [input,          setInput]          = useState('');
  const [confirmingEnd,  setConfirmingEnd]  = useState(false);
  const [showSidebar,    setShowSidebar]    = useState(true);
  const [showStudyPanel, setShowStudyPanel] = useState(false);
  const [hydrating,      setHydrating]      = useState(true);

  // Admin-only state
  const [broadcastInput,    setBroadcastInput]    = useState('');
  const [showBroadcast,     setShowBroadcast]     = useState(false);
  const [broadcastSending,  setBroadcastSending]  = useState(false);

  const joinedRef    = useRef(false);
  const endedRef     = useRef(false);
  const activityRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearActivity = () => {
    if (activityRef.current) { clearInterval(activityRef.current); activityRef.current = null; }
  };

  useEffect(() => () => clearActivity(), []);

  // ── Hydrate ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/live-chat/${sessionId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.success || !d.session) return;
        const { status: s, speakMode: sm, endedReason } = d.session;

        if (s === 'ended')       { setEndReason(endedReason ?? ''); setStatus('ended'); }
        else if (s === 'paused') setStatus('paused');
        else if (s === 'active') setStatus('active');
        else if (s === 'waiting') setStatus('waiting');

        if (sm) {
          setSpeakMode(sm as SpeakMode);
          // In open mode everyone can speak; in request mode only hosts start with floor
          if (sm === 'open') setCanSpeak(true);
          if (sm === 'request' && !cap.canHost)  setCanSpeak(false);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHydrating(false); });

    return () => { cancelled = true; };
  }, [sessionId, cap.canHost]);

  // ── Join — wait for hydration so we know the session is valid ──
  useEffect(() => {
    if (!isReady || !sessionId || hydrating || joinedRef.current) return;
    // Do not join if session has already ended or hasn't been hydrated yet
    if (status === null || status === 'ended') return;
    joinedRef.current = true;
    emit('session:join', { sessionId });
    return () => { joinedRef.current = false; };
  }, [isReady, sessionId, hydrating, status, emit]);

  // ── Cleanup when session ends (local side-effects only) ──
  useEffect(() => {
    if (status === 'ended') clearActivity();
  }, [status]);

  // ── Activity heartbeat ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || sessionEnded || sessionPaused) { clearActivity(); return; }
    activityRef.current = setInterval(() => {
      emit('session:activity', { sessionId });
    }, ACTIVITY_INTERVAL);
    return clearActivity;
  }, [isReady, sessionEnded, sessionPaused, sessionId, emit]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onParticipants = ({ sessionId: sid, participants: list }: { sessionId: string; participants: Participant[] }) => {
      if (sid !== sessionId) return;
      setParticipants(list);
    };

    const onSpeakMode = ({ sessionId: sid, mode }: { sessionId: string; mode: SpeakMode }) => {
      if (sid !== sessionId) return;
      setSpeakMode(mode);
      if (mode === 'open') setCanSpeak(true);
      // In request mode: hosts keep the floor, students lose it
      if (mode === 'request' && !cap.canHost) setCanSpeak(false);
    };

    const onFloor = ({ sessionId: sid, userId }: { sessionId: string; userId: string }) => {
      if (sid !== sessionId || userId !== currentUserId) return;
      setCanSpeak(true);
      setHandRaised(false);
    };

    const onMuted = ({ sessionId: sid, userId }: { sessionId: string; userId: string }) => {
      if (sid !== sessionId || userId !== currentUserId) return;
      setCanSpeak(false);
    };

    const onUnmuted = ({ sessionId: sid, userId }: { sessionId: string; userId: string }) => {
      if (sid !== sessionId || userId !== currentUserId) return;
      setCanSpeak(true);
    };

    const onJoined = ({ username }: { username: string }) =>
      pushActivity({ label: `${username} joined`, kind: 'joined' });

    on('session:participants',        onParticipants);
    on('conference:speak_mode',       onSpeakMode);
    on('conference:floor_granted',    onFloor);
    on('conference:muted',            onMuted);
    on('conference:unmuted',          onUnmuted);
    on('session:participant_joined',  onJoined);

    return () => {
      off('session:participants',       onParticipants);
      off('conference:speak_mode',      onSpeakMode);
      off('conference:floor_granted',   onFloor);
      off('conference:muted',           onMuted);
      off('conference:unmuted',         onUnmuted);
      off('session:participant_joined', onJoined);
    };
  }, [sessionId, currentUserId, cap.canHost, on, off, pushActivity]);

  // ── Handlers — shared ─────────────────────────────────────────────────────

  const handleEndRequest = useCallback(() => {
    if (endedRef.current || status === 'ended') return;
    // Admin can force-end without confirmation
    if (cap.canAdminForce) {
      endedRef.current = true;
      emit('session:end', { sessionId, reason: 'ended_by_host' });
      clearActivity();
      setEndReason('ended_by_host');
      setStatus('ended');
    } else {
      setConfirmingEnd(true);
    }
  }, [status, cap.canAdminForce, emit, sessionId, setEndReason, setStatus]);

  const handleEndConfirm = useCallback(() => {
    if (endedRef.current || status === 'ended') return;
    endedRef.current = true;
    setConfirmingEnd(false);
    emit('session:end', { sessionId, reason: 'ended_by_host' });
    clearActivity();
    setEndReason('ended_by_host');
    setStatus('ended');
  }, [status, emit, sessionId, setEndReason, setStatus]);

  const handleSpeakModeChange = useCallback((mode: SpeakMode) => {
    if (!cap.canHost || !isReady) return;
    setSpeakMode(mode);
    emit('conference:set_speak_mode', { sessionId, mode });
  }, [cap.canHost, isReady, emit, sessionId]);

  const handleRaiseHand = useCallback(() => {
    if (!isReady) return;
    const next = !handRaised;
    setHandRaised(next);
    emit(next ? 'conference:raise_hand' : 'conference:lower_hand', { sessionId });
  }, [isReady, handRaised, emit, sessionId]);

  const handleMute = useCallback((userId: string, muted: boolean) => {
    if (!cap.canHost || !isReady) return;
    emit(muted ? 'conference:mute_user' : 'conference:unmute_user', { sessionId, userId });
  }, [cap.canHost, isReady, emit, sessionId]);

  const handleGrant = useCallback((userId: string) => {
    if (!cap.canHost || !isReady) return;
    emit('conference:grant_floor', { sessionId, userId });
  }, [cap.canHost, isReady, emit, sessionId]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > 4000 || !canSpeak || sessionPaused || !isReady) return;
    sendMessage(trimmed);
    stopTyping();
    setInput('');
  }, [input, canSpeak, sessionPaused, isReady, sendMessage, stopTyping]);

  // ── Handlers — admin only ─────────────────────────────────────────────────

  // Mute all: mute every non-admin, non-host participant at once
  const handleMuteAll = useCallback(() => {
    if (!cap.canAdminForce || !isReady) return;
    participants
      .filter(p => p.userId !== currentUserId && !p.isMuted)
      .forEach(p => emit('conference:mute_user', { sessionId, userId: p.userId }));
  }, [cap.canAdminForce, isReady, participants, currentUserId, emit, sessionId]);

  // Broadcast: send a pinned announcement visible to all participants.
  // Implemented as a regular chat message with a [BROADCAST] prefix the
  // server/UI can style distinctly. If your backend adds a dedicated
  // broadcast event later, swap the emit here.
  const handleBroadcast = useCallback(() => {
    const trimmed = broadcastInput.trim();
    if (!trimmed || !cap.canAdminForce || !isReady) return;
    setBroadcastSending(true);
    sendMessage(`[BROADCAST] ${trimmed}`);
    setBroadcastInput('');
    setShowBroadcast(false);
    setBroadcastSending(false);
  }, [broadcastInput, cap.canAdminForce, isReady, sendMessage]);

  // ── Derived ───────────────────────────────────────────────────────────────

  // Students/tutors who have raised their hand (excluding the current user)
  const handQueue = participants.filter(p => p.handRaised && p.userId !== currentUserId);
  const hostParticipant = participants.find(p => p.userId === meta.hostId);

  const headerSubtitle = (() => {
    if (viewerRole === 'admin')   return `Admin view · ${participants.length} attendee${participants.length !== 1 ? 's' : ''}`;
    if (viewerRole === 'tutor')   return `You are hosting · ${participants.length} attendee${participants.length !== 1 ? 's' : ''}`;
    return `Hosted by ${hostParticipant?.username ?? 'tutor'}`;
  })();

  // ── Loading / ended ───────────────────────────────────────────────────────

  if (hydrating) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={18} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (sessionEnded) {
    return <SessionEndedScreen reason={endReason} role={viewerRole} />;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Header ── */}
        <SessionHeader
          title={`Conference${meta.subjectName ? ` · ${meta.subjectName}` : ''}`}
          subtitle={headerSubtitle}
          connected={isConnected}
          participantCount={participants.length}
          startedAt={meta.startedAt}
          onEnd={handleEndRequest}
          badge={
            viewerRole === 'admin'
              ? <AdminBadge />
              : <LiveBadge />
          }
          rightSlot={
            <div className="flex items-center gap-2">
              {/* Speak mode — tutor + admin */}
              {cap.canHost && (
                <SpeakModeToggle mode={speakMode} onChange={handleSpeakModeChange} />
              )}

              {/* Admin: mute all + broadcast buttons */}
              {cap.canAdminForce && (
                <>
                  <button
                    onClick={handleMuteAll}
                    title="Mute all participants"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border glass-soft border-transparent text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition"
                  >
                    <MicOff size={11} /> Mute all
                  </button>
                  <button
                    onClick={() => setShowBroadcast(s => !s)}
                    title="Broadcast announcement"
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                      showBroadcast
                        ? 'bg-orange-500/15 border-orange-500/25 text-orange-300'
                        : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Megaphone size={11} /> Broadcast
                  </button>
                </>
              )}

              {/* Study panel toggle — tutor + student only */}
              {studyTools && (
                <button
                  onClick={() => setShowStudyPanel(s => !s)}
                  title="Study tools"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                    showStudyPanel
                      ? 'bg-white/10 border-white/20 text-white/70'
                      : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                  }`}
                >
                  <BookOpen size={11} /> Study
                </button>
              )}

              {/* Participants toggle */}
              <button
                onClick={() => setShowSidebar(s => !s)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                  showSidebar
                    ? 'bg-white/10 border-white/20 text-white/70'
                    : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <Users size={11} /> {participants.length}
              </button>
            </div>
          }
        />

        {/* ── Admin broadcast input ── */}
        <AnimatePresence>
          {showBroadcast && cap.canAdminForce && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="shrink-0 overflow-hidden border-b border-orange-500/15 bg-orange-500/5"
            >
              <div className="flex items-center gap-2 px-4 py-2.5">
                <Shield size={11} className="text-orange-400/60 flex-shrink-0" />
                <input
                  autoFocus
                  value={broadcastInput}
                  onChange={e => setBroadcastInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
                  placeholder="Broadcast a message to all attendees…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-orange-500/30 transition"
                />
                <button
                  onClick={handleBroadcast}
                  disabled={!broadcastInput.trim() || broadcastSending}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/25 text-orange-300 text-[11px] font-medium hover:bg-orange-500/30 disabled:opacity-40 transition"
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hand raise queue — tutor + admin ── */}
        <AnimatePresence>
          {cap.canHost && handQueue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 overflow-hidden border-b border-yellow-500/12 bg-yellow-500/4"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto">
                <span className="text-yellow-400/60 text-[9px] uppercase tracking-widest flex-shrink-0">
                  ✋ Raised
                </span>
                {handQueue.map(p => (
                  <div key={p.userId} className="flex items-center gap-2 flex-shrink-0 glass-soft rounded-lg px-2.5 py-1.5">
                    <span className="text-white/55 text-xs">{p.username}</span>
                    <button
                      onClick={() => handleGrant(p.userId)}
                      className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition"
                    >
                      Allow
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Attendee speak status bar ── */}
        {viewerRole === 'attendee' && (
          <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-white/[0.05]">
            {speakMode === 'open' ? (
              <span className="text-emerald-400/60 text-xs">Open floor — everyone can speak freely</span>
            ) : canSpeak ? (
              <span className="text-emerald-400/70 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                You have the floor
              </span>
            ) : (
              <span className="text-white/25 text-xs">
                {handRaised
                  ? 'Hand raised — waiting for host to allow you to speak'
                  : 'Raise your hand to request to speak'}
              </span>
            )}
            {speakMode === 'request' && !canSpeak && (
              <HandRaiseButton raised={handRaised} onToggle={handleRaiseHand} />
            )}
          </div>
        )}

        <AnimatePresence>
          {confirmingEnd && (
            <ConfirmEndBanner
              onConfirm={handleEndConfirm}
              onCancel={() => setConfirmingEnd(false)}
            />
          )}
        </AnimatePresence>

        {sessionPaused && <PausedBanner />}

        {/* ── Message feed ── */}
        <MessageFeed
          messages={messages}
          currentUserId={currentUserId}
          showSenders
          emptySlot={
            <div className="flex justify-center pt-12">
              <div className="glass-soft rounded-2xl px-6 py-5 text-center space-y-1">
                <Radio size={18} className="text-red-400/50 mx-auto" />
                <p className="text-white/25 text-sm">
                  {viewerRole === 'admin'    ? 'Monitoring conference.' :
                   viewerRole === 'tutor'    ? 'Conference is live — you\'re broadcasting.' :
                                               'Conference is live.'}
                </p>
                {viewerRole === 'attendee' && !canSpeak && speakMode === 'request' && (
                  <p className="text-white/15 text-xs">Raise your hand to speak.</p>
                )}
              </div>
            </div>
          }
        />

        <ActivityFeed typingUsernames={typingUsernames} events={activityEvents} />

        {/* ── Input ── */}
        {/* Admin can always type (broadcast aside, they may also chat).
            Tutor (host) can always type.
            Student: gated by canSpeak + sessionPaused + isReady. */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onKeystroke={onKeystroke}
          disabled={!canSpeak || sessionPaused || !isReady}
          placeholder={
            !isReady                                          ? 'Reconnecting…'
            : sessionPaused                                   ? 'Session paused…'
            : viewerRole === 'tutor'                          ? 'Say something to your attendees…'
            : viewerRole === 'admin'                          ? 'Send as admin…'
            : !canSpeak && speakMode === 'request'            ? 'Raise your hand to speak…'
            : 'Type a message…'
          }
        />
      </div>

      {/* ── Participant sidebar ── */}
      <ParticipantSidebar
        title={`Attendees · ${participants.length}`}
        visible={showSidebar}
      >
        <ParticipantList
          participants={participants}
          currentUserId={currentUserId}
          isHost={cap.canHost}
          onMute={cap.canHost ? handleMute : undefined}
          onGrantFloor={cap.canHost ? handleGrant : undefined}
        />

        {cap.canHost && (
          <div className="mt-3 px-2 pt-3 border-t border-white/5">
            <p className="text-white/20 text-[10px] text-center">
              Hover a participant to mute or grant floor
            </p>
          </div>
        )}

        {/* Admin: extra participant count summary */}
        {cap.canAdminForce && (
          <div className="mt-2 px-2">
            <p className="text-orange-400/30 text-[10px] text-center">
              {participants.filter(p => p.isMuted).length} muted ·{' '}
              {participants.filter(p => p.handRaised).length} hand raised
            </p>
          </div>
        )}
      </ParticipantSidebar>

      {/* ── Study panel — tutor + student, admin excluded ── */}
      {studyTools && showStudyPanel && (
        <div className="w-72 flex-shrink-0 border-l border-white/[0.07] overflow-y-auto">
          <StudyPanel
            sessionId={sessionId}
            currentUsername={currentUsername}
            tools={studyTools}
            permissions={studyPermissions}
            emit={emit}
            on={on}
            off={off}
          />
        </div>
      )}
    </div>
  );
}

// ── Admin badge ───────────────────────────────────────────────────────────────

function AdminBadge() {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20">
      <Shield size={9} className="text-orange-400" />
      <span className="text-orange-400 text-[9px] font-bold uppercase tracking-wider">Admin</span>
    </div>
  );
}