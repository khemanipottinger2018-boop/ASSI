'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Users, PauseCircle, PhoneOff, Loader2 } from 'lucide-react';
import { useChatSocket }   from '../hooks/useChatSocket';
import { useChatRoom }     from '../hooks/useChatRoom';
import { useChatMessages } from '../hooks/useChatMessages';
import { useTyping }       from '../hooks/useTyping';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Accept timeout — if socket never confirms tutor_joined within this window,
// reset accepting so the tutor can try again rather than being stuck forever
const ACCEPT_TIMEOUT_MS = 8_000;

interface Props {
  sessionId:        string;
  currentUserId:    string;
  currentUsername?: string;
}

function friendlyEndReason(reason: string): string {
  switch (reason) {
    case 'inactivity':         return 'Ended due to inactivity.';
    case 'system':             return 'The session was ended by the platform.';
    case 'ended_by_student':   return 'The student ended the session.';
    case 'ended_by_tutor':     return 'You ended the session.';
    default:                   return reason || 'The session has ended.';
  }
}

export function TutorChatView({ sessionId, currentUserId, currentUsername }: Props) {
  const { emit, on, off, isConnected } = useChatSocket();

  const [accepted,      setAccepted]      = useState(false);
  const [accepting,     setAccepting]     = useState(false);
  const [sessionEnded,  setSessionEnded]  = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [endReason,     setEndReason]     = useState('');
  const [input,         setInput]         = useState('');
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [hydrating,     setHydrating]     = useState(true);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const joinedRef      = useRef(false);
  const acceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const presence = useChatRoom(accepted ? sessionId : '');
  const { messages, sendMessage } = useChatMessages(accepted ? sessionId : '');
  const { onKeystroke, stopTyping, someoneIsTyping } = useTyping(accepted ? sessionId : '');

  // Clear accept timer on unmount
  useEffect(() => {
    return () => {
      if (acceptTimerRef.current) clearTimeout(acceptTimerRef.current);
    };
  }, []);

  /* ── Hydrate session state on mount ── */
  useEffect(() => {
    if (!sessionId) return;

    fetch(`${API_URL}/api/live-chat/${sessionId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.session) {
          const { status, tutorId, endedReason } = d.session;
          if (status === 'ended') {
            setSessionEnded(true);
            setEndReason(endedReason ?? '');
          } else if (status === 'paused' && tutorId === currentUserId) {
            setAccepted(true);
            setSessionPaused(true);
          } else if (status === 'active' && tutorId === currentUserId) {
            setAccepted(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setHydrating(false));
  }, [sessionId, currentUserId]);

  /* ── BUG FIX #8: emit session:join on connect AND reconnect ── */
  useEffect(() => {
    if (!isConnected || !accepted || !sessionId) return;
    if (joinedRef.current) return;

    joinedRef.current = true;
    emit('session:join', { sessionId });

    return () => { joinedRef.current = false; };
  }, [isConnected, accepted, sessionId, emit]);

  /* ── Socket listeners ── */
  useEffect(() => {
    const onTutorJoined = ({ sessionId: sid, tutorId }: { sessionId: string; tutorId: string }) => {
      if (sid !== sessionId || tutorId !== currentUserId) return;
      if (acceptTimerRef.current) clearTimeout(acceptTimerRef.current);
      setAccepted(true);
      setAccepting(false);
    };
    const onPaused  = () => setSessionPaused(true);
    const onStarted = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid !== sessionId) return;
      setSessionPaused(false);
    };
    const onEnded   = ({ reason }: { reason: string }) => {
      setEndReason(reason);
      setSessionEnded(true);
    };

    on('chat:tutor_joined', onTutorJoined);
    on('session:paused',    onPaused);
    on('session:started',   onStarted);
    on('session:ended',     onEnded);

    return () => {
      off('chat:tutor_joined', onTutorJoined);
      off('session:paused',    onPaused);
      off('session:started',   onStarted);
      off('session:ended',     onEnded);
    };
  }, [sessionId, currentUserId, on, off]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, someoneIsTyping]);

  const handleAccept = () => {
    if (accepting) return;
    setAccepting(true);
    emit('session:accept', { sessionId });

    // Safety reset — if socket never confirms tutor_joined, unblock the button
    acceptTimerRef.current = setTimeout(() => {
      setAccepting(false);
    }, ACCEPT_TIMEOUT_MS);
  };

  const handleEndSession = () => {
    if (!confirmingEnd) { setConfirmingEnd(true); return; }
    emit('session:end', { sessionId, reason: 'ended_by_tutor' });
    setSessionEnded(true);
    setEndReason('ended_by_tutor');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    stopTyping();
    setInput('');
  };

  if (hydrating) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={18} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="glass rounded-2xl px-10 py-12 text-center max-w-sm w-full">
          <p className="text-white font-semibold text-lg mb-2">Session ended</p>
          <p className="text-white/50 text-sm">{friendlyEndReason(endReason)}</p>
        </div>
      </div>
    );
  }

  if (!accepted) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="glass rounded-2xl px-10 py-12 text-center max-w-sm w-full"
        >
          <div className="flex justify-center mb-6">
            <div className="glass-soft w-14 h-14 rounded-full flex items-center justify-center">
              <Users size={22} className="text-white/80" />
            </div>
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">Student is waiting</h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Accept the session to start chatting.
          </p>
          <button onClick={handleAccept} disabled={accepting}
            className="w-full py-3 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {accepting
              ? <><span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /> Joining…</>
              : <><CheckCircle size={16} /> Accept Session</>
            }
          </button>
          {accepting && (
            <p className="text-white/25 text-xs mt-3">Connecting to session…</p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        {sessionPaused ? (
          <>
            <PauseCircle size={14} className="text-yellow-400" />
            <span className="text-white/70 text-sm font-medium">Session paused due to inactivity</span>
          </>
        ) : (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-white/80 text-sm font-medium">Session active</span>
          </>
        )}

        {presence.count > 0 && (
          <div className="flex items-center gap-1 text-white/30 text-xs">
            <Users size={12} /><span>{presence.count}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <AnimatePresence>
            {confirmingEnd && (
              <motion.div
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <span className="text-white/40 text-xs">End session?</span>
                <button onClick={handleEndSession}
                  className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition">
                  Yes, end
                </button>
                <button onClick={() => setConfirmingEnd(false)}
                  className="px-2.5 py-1 rounded-lg glass-soft text-white/40 text-xs hover:text-white/70 transition">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {!confirmingEnd && (
            <button onClick={handleEndSession} title="End session"
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition">
              <PhoneOff size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <motion.div key={msg.messageId}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMe ? 'bg-orange-500 text-white rounded-br-sm' : 'glass-soft text-white/90 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {someoneIsTyping && (
          <div className="flex justify-start">
            <div className="glass-soft rounded-2xl px-4 py-2.5 text-xs text-white/40 italic">
              Student is typing…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
        <input type="text" value={input}
          onChange={(e) => { setInput(e.target.value); onKeystroke(); }}
          placeholder="Type a message…"
          disabled={sessionPaused}
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/25 disabled:opacity-40 transition"
        />
        <button type="submit" disabled={!input.trim() || sessionPaused}
          className="glass-soft w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}