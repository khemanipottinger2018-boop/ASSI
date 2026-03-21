'use client';

// components/shared/assi/AssiChatBot.tsx

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, ExternalLink, Cpu, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AssiMessage    from './AssiMessage';
import AssiTypingDots from './AssiTypingDots';
import LoginModal  from '@/components/shared/ui/LoginModal';
import SignupModal from '@/components/shared/ui/SignupModal';

type Message = { role: 'user' | 'assistant'; content: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const DEEP_SESSION_THRESHOLD = 4;
const DEEP_TRIGGERS = [
  'explain', 'solve', 'help me with', 'walk me through',
  'assignment', 'essay', 'question', 'problem', 'how do i',
  'understand', 'teach me', 'what is', 'why does',
];

function isDeepQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return DEEP_TRIGGERS.some(t => lower.includes(t)) && text.length > 40;
}

const GUEST_GREETING: Message = {
  role:    'assistant',
  content: "Hey — I'm ASSI. Ask me anything about the platform, or what subjects we cover.",
};

const AUTH_GREETING: Message = {
  role:    'assistant',
  content: "Quick question or just checking in? I'm here. For a full study session, open the ASSI page.",
};

interface Props {
  onClose:  () => void;
  isGuest?: boolean;
}

export default function AssiChatBot({ onClose, isGuest = false }: Props) {
  const router = useRouter();

  const [messages,   setMessages]   = useState<Message[]>([isGuest ? GUEST_GREETING : AUTH_GREETING]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [isTyping,   setIsTyping]   = useState(false);
  const [locked,     setLocked]     = useState(false);
  const [showNudge,  setShowNudge]  = useState(false);
  const [showLogin,  setShowLogin]  = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const msgCount   = useRef(0);
  const guestCount = useRef(0);
  const GUEST_LIMIT = 3;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!locked) inputRef.current?.focus();
  }, [locked]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading || locked) return;

    const history = messages.slice(-6);
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    msgCount.current += 1;

    if (!isGuest && (msgCount.current >= DEEP_SESSION_THRESHOLD || isDeepQuery(trimmed))) {
      setShowNudge(true);
    }

    if (isGuest) {
      guestCount.current += 1;
      if (guestCount.current >= GUEST_LIMIT) setLocked(true);
    }

    try {
      const endpoint = isGuest ? '/api/ai/guest' : '/api/ai/assist';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ message: trimmed, history }),
      });

      if (res.status === 429) {
        setLocked(true);
        setMessages(prev => [...prev, {
          role:    'assistant',
          content: isGuest
            ? "You've reached the guest limit. Sign up free to keep chatting."
            : "You've hit the limit for now. Upgrade to ASSI+ for more.",
        }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Lost connection — try sending that again.',
      }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }

  function goFullPage() {
    onClose();
    router.push('/assi');
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          // Never overflows viewport — clamps on small screens
          width:               'min(360px, calc(100vw - 32px))',
          height:              'min(500px, calc(100dvh - 120px))',
          background:          'rgba(10, 10, 16, 0.97)',
          backdropFilter:      'blur(32px)',
          WebkitBackdropFilter:'blur(32px)',
          border:              '1px solid rgba(255,255,255,0.09)',
          boxShadow:           '0 24px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
              <Sparkles size={12} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">ASSI</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Cpu size={8} className="text-orange-400" />
                <p className="text-orange-400/60 text-[10px]">Quick assistant</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isGuest && (
              <button onClick={goFullPage}
                className="flex items-center gap-1 text-white/28 hover:text-white/60 text-[11px] transition">
                Full page <ExternalLink size={9} />
              </button>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/28 hover:text-white/60 hover:bg-white/6 transition">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Deep session nudge */}
        <AnimatePresence>
          {showNudge && !isGuest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-3.5 py-2 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(249,115,22,0.07)' }}
            >
              <p className="text-white/40 text-[11px]">Going deeper? Full ASSI has subject-specific models.</p>
              <button onClick={goFullPage}
                className="text-orange-400 text-[11px] font-medium hover:text-orange-300 transition flex items-center gap-1 flex-shrink-0 ml-2">
                Open <ExternalLink size={9} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <AssiMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {isTyping && <AssiTypingDots key="typing" />}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Lock CTA */}
        <AnimatePresence>
          {locked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 py-2.5 flex items-center justify-center gap-2 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
            >
              {isGuest ? (
                <>
                  <span className="text-white/38 text-xs">Want to keep going?</span>
                  <button onClick={() => setShowSignup(true)}
                    className="text-xs font-medium transition" style={{ color: '#b84cff' }}>
                    Create free account
                  </button>
                </>
              ) : (
                <>
                  <span className="text-white/38 text-xs">Limit reached —</span>
                  <button className="text-orange-400 text-xs font-medium hover:text-orange-300 transition">
                    Get ASSI+
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-3 pb-3 pt-2.5 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={locked ? 'Upgrade to continue…' : 'Quick question…'}
            disabled={locked || loading}
            className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white/85 placeholder:text-white/22 outline-none transition disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || locked || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-28 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff7a9c, #b84cff)' }}
          >
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Send size={13} className="text-white" />
            }
          </button>
        </div>
      </motion.div>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        switchToSignup={() => { setShowLogin(false); setShowSignup(true); }}
      />
      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        switchToLogin={() => { setShowSignup(false); setShowLogin(true); }}
      />
    </>
  );
}