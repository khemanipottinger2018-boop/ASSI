'use client';

// app/live-chat/views/ConferenceView.tsx
// Tutor-led conference session.
// Host controls the floor — students raise hand to request to speak.
// Host can toggle speak mode between 'request' (default) and 'open' (anyone speaks).
// Host can mute/unmute participants and grant floor to hand-raisers.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Users, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useChatSocket }   from '../hooks/useChatSocket';
import { useChatMessages } from '../hooks/useChatMessages';
import { useTyping }       from '../hooks/useTyping';
import {
  SessionHeader, MessageFeed, ChatInput,
  SessionEndedScreen, PausedBanner, LiveBadge,
  ParticipantList, ParticipantSidebar,
  SpeakModeToggle, HandRaiseButton,
} from '../components/SessionShared';
import type { SessionMeta, Participant, SpeakMode } from '../types/SocketEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Props {
  sessionId:       string;
  currentUserId:   string;
  currentUsername: string;
  meta:            SessionMeta;
  isPlus:          boolean;
  role:            'student' | 'tutor';
  isHost:          boolean;
}

export function ConferenceView({
  sessionId, currentUserId, currentUsername, meta, isPlus, role, isHost,
}: Props) {
  const router = useRouter();
  const { emit, on, off, isConnected } = useChatSocket();
  const { messages, sendMessage } = useChatMessages(sessionId);
  const { onKeystroke, stopTyping, someoneIsTyping } = useTyping(sessionId);

  const [participants,  setParticipants]  = useState<Participant[]>([]);
  const [speakMode,     setSpeakMode]     = useState<SpeakMode>('request');
  const [handRaised,    setHandRaised]    = useState(false);
  const [canSpeak,      setCanSpeak]      = useState(isHost);
  const [sessionEnded,  setSessionEnded]  = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [endReason,     setEndReason]     = useState('');
  const [input,         setInput]         = useState('');
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showSidebar,   setShowSidebar]   = useState(true);
  const [hydrating,     setHydrating]     = useState(true);
  const joinedRef = useRef(false);

  /* ── Hydrate ── */
  useEffect(() => {
    fetch(`${API_URL}/api/live-chat/${sessionId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.session) {
          const { status, speakMode: sm, endedReason } = d.session;
          if (status === 'ended') { setSessionEnded(true); setEndReason(endedReason ?? ''); }
          else if (status === 'paused') setSessionPaused(true);
          if (sm) setSpeakMode(sm as SpeakMode);
          if (sm === 'open') setCanSpeak(true);
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
    const onSpeakMode = ({ sessionId: sid, mode }: { sessionId: string; mode: SpeakMode }) => {
      if (sid !== sessionId) return;
      setSpeakMode(mode);
      if (mode === 'open') setCanSpeak(true);
      if (mode === 'request' && !isHost) setCanSpeak(false);
    };
    const onFloor = ({ sessionId: sid, userId }: { sessionId: string; userId: string }) => {
      if (sid !== sessionId || userId !== currentUserId) return;
      setCanSpeak(true); setHandRaised(false);
    };
    const onMuted = ({ sessionId: sid, userId }: { sessionId: string; userId: string }) => {
      if (sid !== sessionId || userId !== currentUserId) return;
      setCanSpeak(false);
    };
    const onUnmuted = ({ sessionId: sid, userId }: { sessionId: string; userId: string }) => {
      if (sid !== sessionId || userId !== currentUserId) return;
      setCanSpeak(true);
    };
    const onPaused  = () => setSessionPaused(true);
    const onStarted = ({ sessionId: sid }: { sessionId: string }) => { if (sid === sessionId) setSessionPaused(false); };
    const onEnded   = ({ reason }: { reason: string }) => { setEndReason(reason); setSessionEnded(true); };

    on('session:participants',    onParticipants);
    on('conference:speak_mode',   onSpeakMode);
    on('conference:floor_granted',onFloor);
    on('conference:muted',        onMuted);
    on('conference:unmuted',      onUnmuted);
    on('session:paused',          onPaused);
    on('session:started',         onStarted);
    on('session:ended',           onEnded);
    return () => {
      off('session:participants',    onParticipants);
      off('conference:speak_mode',   onSpeakMode);
      off('conference:floor_granted',onFloor);
      off('conference:muted',        onMuted);
      off('conference:unmuted',      onUnmuted);
      off('session:paused',          onPaused);
      off('session:started',         onStarted);
      off('session:ended',           onEnded);
    };
  }, [sessionId, currentUserId, isHost, on, off]);

  const handleEnd = () => {
    if (!confirmingEnd) { setConfirmingEnd(true); return; }
    emit('session:end', { sessionId, reason: 'ended_by_host' });
    setSessionEnded(true); setEndReason('ended_by_host');
  };

  const handleSpeakModeChange = (mode: SpeakMode) => {
    setSpeakMode(mode);
    emit('conference:set_speak_mode', { sessionId, mode });
  };

  const handleRaiseHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    emit(next ? 'conference:raise_hand' : 'conference:lower_hand', { sessionId });
  };

  const handleMute = (userId: string, muted: boolean) => {
    emit(muted ? 'conference:mute_user' : 'conference:unmute_user', { sessionId, userId });
  };

  const handleGrant = (userId: string) => {
    emit('conference:grant_floor', { sessionId, userId });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !canSpeak || sessionPaused) return;
    sendMessage(input); stopTyping(); setInput('');
  };

  if (hydrating) return <div className="h-full flex items-center justify-center"><Loader2 size={18} className="text-white/30 animate-spin" /></div>;
  if (sessionEnded) return <SessionEndedScreen reason={endReason} onDismiss={() => router.push('/browse')} />;

  // Participants who have raised their hand (excluding host)
  const handQueue = participants.filter(p => p.handRaised && p.userId !== currentUserId);
  // Host info
  const hostParticipant = participants.find(p => p.userId === meta.hostId);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">

        <SessionHeader
          title={`Conference${meta.subjectName ? ` · ${meta.subjectName}` : ''}`}
          subtitle={
            isHost
              ? `You are hosting · ${participants.length} attendee${participants.length !== 1 ? 's' : ''}`
              : `Hosted by ${hostParticipant?.username ?? 'tutor'}`
          }
          connected={isConnected}
          participantCount={participants.length}
          onEnd={handleEnd}
          confirmingEnd={confirmingEnd}
          onCancelEnd={() => setConfirmingEnd(false)}
          onConfirmEnd={handleEnd}
          badge={<LiveBadge />}
          rightSlot={
            <div className="flex items-center gap-2">
              {isHost && (
                <SpeakModeToggle mode={speakMode} onChange={handleSpeakModeChange} />
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

        {/* Hand raise queue — host only */}
        <AnimatePresence>
          {isHost && handQueue.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 overflow-hidden border-b border-yellow-500/12 bg-yellow-500/4">
              <div className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto">
                <span className="text-yellow-400/60 text-[9px] uppercase tracking-widest flex-shrink-0">✋ Raised</span>
                {handQueue.map(p => (
                  <div key={p.userId} className="flex items-center gap-2 flex-shrink-0 glass-soft rounded-lg px-2.5 py-1.5">
                    <span className="text-white/55 text-xs">{p.username}</span>
                    <button onClick={() => handleGrant(p.userId)}
                      className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition">
                      Allow
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student speak status bar */}
        {!isHost && (
          <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-white/[0.05] bg-black/5">
            {speakMode === 'open' ? (
              <span className="text-emerald-400/60 text-xs">Open floor — everyone can speak freely</span>
            ) : canSpeak ? (
              <span className="text-emerald-400/70 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                You have the floor
              </span>
            ) : (
              <span className="text-white/25 text-xs">
                {handRaised ? 'Hand raised — waiting for host to allow you to speak' : 'Raise your hand to request to speak'}
              </span>
            )}
            {!isHost && speakMode === 'request' && !canSpeak && (
              <HandRaiseButton raised={handRaised} onToggle={handleRaiseHand} />
            )}
          </div>
        )}

        {sessionPaused && <PausedBanner />}

        <MessageFeed
          messages={messages} currentUserId={currentUserId}
          someoneIsTyping={someoneIsTyping} showSenders
          emptySlot={
            <div className="flex justify-center pt-12">
              <div className="glass-soft rounded-2xl px-6 py-5 text-center space-y-1">
                <Radio size={18} className="text-red-400/50 mx-auto" />
                <p className="text-white/25 text-sm">
                  {isHost ? 'Conference is live — your students are listening.' : 'Conference is live.'}
                </p>
                {!isHost && !canSpeak && speakMode === 'request' && (
                  <p className="text-white/15 text-xs">Raise your hand to speak.</p>
                )}
              </div>
            </div>
          }
        />

        <ChatInput
          value={input} onChange={setInput} onSubmit={handleSubmit} onKeystroke={onKeystroke}
          disabled={!canSpeak || sessionPaused}
          placeholder={
            !canSpeak && speakMode === 'request' && !isHost
              ? 'Raise your hand to speak…'
              : sessionPaused
              ? 'Session paused…'
              : isHost
              ? 'Say something to your class…'
              : 'Type a message…'
          }
        />
      </div>

      <ParticipantSidebar title={`Attendees · ${participants.length}`} visible={showSidebar}>
        <ParticipantList
          participants={participants}
          currentUserId={currentUserId}
          isHost={isHost}
          onMute={isHost ? handleMute : undefined}
          onGrantFloor={isHost ? handleGrant : undefined}
        />
        {isHost && (
          <div className="mt-3 px-2 pt-3 border-t border-white/5">
            <p className="text-white/20 text-[10px] text-center">
              Hover a participant to mute or grant floor
            </p>
          </div>
        )}
      </ParticipantSidebar>
    </div>
  );
}