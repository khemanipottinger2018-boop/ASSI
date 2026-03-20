'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';
import AssiMessage from './AssiMessage';
import AssiTypingDots from './AssiTypingDots';
import LoginModal from '@/components/shared/ui/LoginModal';
import SignupModal from '@/components/shared/ui/SignupModal';

type Message = { role: 'user' | 'assistant'; content: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const GUEST_GREETING: Message = {
  role: 'assistant',
  content: "Hey! I'm ASSI 👋 I can help you figure out if ASSI is right for you. Ask me anything about the platform, or what subjects we cover!",
};

const AUTH_GREETING: Message = {
  role: 'assistant',
  content: "Hey! I'm ASSI 👋 I'm here to help you study smarter, find the right tutor, or just get your bearings. What's on your mind?",
};

type Props = {
  onClose: () => void;
  isGuest?: boolean;
};

export default function AssiChatBot({ onClose, isGuest = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    isGuest ? GUEST_GREETING : AUTH_GREETING,
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Guest message limit — 3 messages then nudge to sign up
  const guestMessageCount = useRef(0);
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

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    // Enforce guest message limit
    if (isGuest) {
      guestMessageCount.current += 1;
      if (guestMessageCount.current >= GUEST_LIMIT) {
        setLocked(true);
      }
    }

    try {
      const endpoint = isGuest ? '/api/ai/guest' : '/api/ai/assist';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setLocked(true);
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: isGuest
            ? "You've reached the guest limit. Sign up for free to keep chatting!"
            : "You've reached the limit for now. Try again shortly!",
        }]);
        return;
      }

      if (!res.ok || !data?.reply) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: 'Something went wrong on my end — give me a moment and try again.',
        }]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "I lost my connection for a second. Try sending that again?",
      }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
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
          background: 'rgba(18, 18, 24, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'radial-gradient(circle at top left, #ff9aa2, #b84cff)' }}>
              <span className="text-white text-[11px] font-bold">A</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">ASSI</p>
              <p className="text-white/35 text-[10px] mt-0.5">
                {isGuest ? 'Ask me anything about ASSI' : 'Academic Assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <button onClick={onClose}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
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

        {/* Lock CTA */}
        <AnimatePresence>
          {locked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 py-2.5 text-center text-xs flex items-center justify-center gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
            >
              {isGuest ? (
                <>
                  <span className="text-white/40">Want to keep going?</span>
                  <button onClick={() => setShowSignup(true)}
                    className="font-medium transition"
                    style={{ color: '#b84cff' }}>
                    Create free account →
                  </button>
                </>
              ) : (
                <span className="text-white/40">You've reached the limit. Try again shortly.</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={locked ? (isGuest ? 'Sign up to continue…' : 'Try again shortly…') : 'Ask me anything…'}
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