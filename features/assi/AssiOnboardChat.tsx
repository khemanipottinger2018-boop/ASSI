'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AssiMessage    from './AssiMessage';
import AssiTypingDots from './AssiTypingDots';

type Message = { role: 'user' | 'assistant'; content: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const ONBOARD_GREETING: Message = {
  role:    'assistant',
  content: "Hey! I'm ASSI — your study assistant. Ask me what I can do, what subjects we cover, or anything about the platform.",
};

const GUEST_LIMIT = 4;

interface Props {
  onClose: () => void;
}

/**
 * Inline onboarding chat panel rendered directly on the landing page.
 * Uses the guest AI endpoint (no auth required).
 */
export default function AssiOnboardChat({ onClose }: Props) {
  const router = useRouter();

  const [messages,  setMessages]  = useState<Message[]>([ONBOARD_GREETING]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [isTyping,  setIsTyping]  = useState(false);
  const [locked,    setLocked]    = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const countRef   = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!locked) inputRef.current?.focus();
  }, [locked]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading || locked) return;

    countRef.current += 1;
    if (countRef.current >= GUEST_LIMIT) setLocked(true);

    const history = messages.slice(-6);
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/guest`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, history }),
      });

      if (res.status === 429) {
        setLocked(true);
        setMessages(prev => [...prev, {
          role:    'assistant',
          content: "You've reached the guest limit. Sign up for free to keep chatting with ASSI!",
        }]);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Connection issue — try sending that again.',
      }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        height:              'min(420px, 60dvh)',
        background:          'rgba(10, 10, 16, 0.97)',
        backdropFilter:      'blur(32px)',
        WebkitBackdropFilter:'blur(32px)',
        border:              '1px solid rgba(255,255,255,0.09)',
        boxShadow:           '0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 32% 28%, #ffd070, #ff5830, #e83258)' }}>
            <Sparkles size={12} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Ask ASSI</p>
            <p className="text-white/40 text-[10px] mt-0.5">I'll help you get started</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/28 hover:text-white/60 hover:bg-white/6 transition">
            <X size={13} />
          </button>
        </div>
      </div>

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

      {/* Locked CTA */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <span className="text-white/40 text-xs">Ready to get full access?</span>
            <button onClick={() => router.push('/signup')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
              style={{ background: 'linear-gradient(135deg, #ff7a42, #e83258)', color: '#fff' }}>
              Sign up free <ArrowRight size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-3 pb-3 pt-2.5 flex gap-2 flex-shrink-0"
        style={{ borderTop: locked ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={locked ? 'Create an account to continue…' : 'Ask me anything about ASSI…'}
          disabled={locked || loading}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white/85 placeholder:text-white/22 outline-none transition disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || locked || !input.trim()}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-28 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #ff7a42, #e83258)' }}
        >
          {loading
            ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Send size={13} className="text-white" />
          }
        </button>
      </div>
    </motion.div>
  );
}
