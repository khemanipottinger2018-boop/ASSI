'use client';

// components/shared/assi/AssiChatBot.tsx
// Lightweight floating chat — quick questions, casual nudges.
// Heavy tasks get redirected to /assi (full page).
// Preserves all existing guest/auth behaviour.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, ExternalLink, Cpu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AssiMessage from './AssiMessage';
import AssiTypingDots from './AssiTypingDots';
import LoginModal from '@/components/shared/ui/LoginModal';
import SignupModal from '@/components/shared/ui/SignupModal';

type Message = { role: 'user' | 'assistant'; content: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// How many messages before we suggest the full page
const DEEP_SESSION_THRESHOLD = 4;

// Phrases that signal heavy work — nudge to full ASSI
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
  role: 'assistant',
  content: "Hey! I'm ASSI 👋 Ask me anything about the platform, or what subjects we cover!",
};

const AUTH_GREETING: Message = {
  role: 'assistant',
  content: "Hey! 👋 Quick question or just checking in? I'm here. For a full study session, try the ASSI page.",
};

type Props = {
  onClose:  () => void;
  isGuest?: boolean;
};

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

    const userMsg: Message = { role: 'user', content: trimmed };
    const history = messages.slice(-6);

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    msgCount.current += 1;

    // Check if this feels like a deep session
    if (!isGuest && (msgCount.current >= DEEP_SESSION_THRESHOLD || isDeepQuery(trimmed))) {
      setShowNudge(true);
    }

    // Guest limit
    if (isGuest) {
      guestCount.current += 1;
      if (guestCount.current >= GUEST_LIMIT) setLocked(true);
    }

    try {
      const endpoint = isGuest ? '/api/ai/guest' : '/api/ai/assist';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (res.status === 429) {
        setLocked(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isGuest
            ? "You've reached the guest limit. Sign up free to keep chatting!"
            : "You've hit the limit for now. Try again shortly, or upgrade to ASSI+ for more.",
        }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error();

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Lost my connection — try that again?",
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
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col rounded-3xl overflow-hidden"
        style={{
          width: 360,
          height: 500,
          background: 'rgba(14, 14, 20, 0.94)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'radial-gradient(circle at top left, #ff9aa2, #b84cff)' }}>
              <span className="text-white text-[11px] font-bold">A</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">ASSI</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Cpu size={8} className="text-orange-400" />
                <p className="text-orange-400/70 text-[10px]">Quick assistant</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Full page link — always visible for auth users */}
            {!isGuest && (
              <button
                onClick={goFullPage}
                className="flex items-center gap-1 text-white/30 hover:text-white/60 text-[11px] transition"
                title="Open full ASSI"
              >
                Full page <ExternalLink size={10} />
              </button>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Deep session nudge ── */}
        <AnimatePresence>
          {showNudge && !isGuest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-3.5 py-2 flex-shrink-0"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(249,115,22,0.06)',
              }}
            >
              <p className="text-white/45 text-[11px]">Going deep? The full ASSI has subject models.</p>
              <button
                onClick={goFullPage}
                className="text-orange-400 text-[11px] font-medium hover:text-orange-300 transition flex items-center gap-1 flex-shrink-0 ml-2"
              >
                Open <ExternalLink size={9} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
          style={{ scrollbarWidth: 'none' }}>
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <AssiMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {isTyping && <AssiTypingDots key="typing" />}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* ── Lock CTA ── */}
        <AnimatePresence>
          {locked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 py-2.5 text-center text-xs flex items-center justify-center gap-2 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
            >
              {isGuest ? (
                <>
                  <span className="text-white/40">Want to keep going?</span>
                  <button onClick={() => setShowSignup(true)}
                    className="font-medium transition" style={{ color: '#b84cff' }}>
                    Create free account →
                  </button>
                </>
              ) : (
                <>
                  <span className="text-white/40">Limit reached —</span>
                  <button className="text-orange-400 font-medium hover:text-orange-300 transition">
                    Get ASSI+ →
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input ── */}
        <div className="px-3 pb-3 pt-2 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={locked ? 'Upgrade to continue…' : 'Quick question…'}
            disabled={locked || loading}
            className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white/85 placeholder:text-white/25 outline-none transition disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || locked || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #ff7a9c, #b84cff)' }}
          >
            <Send size={14} className="text-white" />
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