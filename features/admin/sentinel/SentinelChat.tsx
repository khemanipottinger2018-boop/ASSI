'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Cpu, AlertCircle, ChevronRight } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const GREETING: Message = {
  role: 'assistant',
  content: "SENTINEL ONLINE. All platform data feeds are active. I have full context of your system: user metrics, live sessions, error logs, and runtime health. How can I assist you?",
};

const QUICK_PROMPTS = [
  "Show me today's platform health",
  "Any suspicious activity?",
  "Summarise pending applications",
  "What's the error rate this week?",
];

export default function SentinelChat() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg };
    const history = messages.slice(-12);
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/ai/sentinel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Sentinel connection failed.');
        return;
      }

      setMessages((p) => [...p, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Connection to Sentinel lost. Check backend status.');
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'rgba(0,6,14,0.9)',
      border: '1px solid rgba(0,180,255,0.15)',
      borderRadius: 16, overflow: 'hidden',
      boxShadow: 'inset 0 0 60px rgba(0,180,255,0.04)',
      fontFamily: "'DM Mono', 'Fira Code', monospace",
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', flexShrink: 0,
        borderBottom: '1px solid rgba(0,180,255,0.1)',
        background: 'rgba(0,10,24,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,180,255,0.2), rgba(0,255,200,0.1))',
            border: '1px solid rgba(0,180,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cpu size={14} style={{ color: '#00b4ff' }} />
          </div>
          <div>
            <p style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em' }}>SENTINEL</p>
            <p style={{ color: 'rgba(0,180,255,0.4)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 1 }}>
              AI Platform Co-Pilot // Admin Access
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff96', boxShadow: '0 0 8px #00ff96' }} />
          <span style={{ color: 'rgba(0,255,150,0.5)', fontSize: 9, letterSpacing: '0.15em' }}>ACTIVE</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>

        {/* Quick prompts — only show at start */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Quick Commands</p>
            {QUICK_PROMPTS.map((q) => (
              <button key={q} onClick={() => send(q)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.12)',
                color: 'rgba(0,200,255,0.6)', fontSize: 11, letterSpacing: '0.03em',
                transition: 'all 0.15s ease',
              }}>
                <ChevronRight size={11} style={{ color: 'rgba(0,180,255,0.4)', flexShrink: 0 }} />
                {q}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}
            >
              {msg.role === 'assistant' && (
                <p style={{ color: 'rgba(0,180,255,0.35)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', paddingLeft: 2 }}>SENTINEL</p>
              )}
              <div style={{
                maxWidth: '85%', padding: '10px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.65,
                ...(msg.role === 'assistant' ? {
                  background: 'rgba(0,180,255,0.06)',
                  border: '1px solid rgba(0,180,255,0.14)',
                  color: 'rgba(220,240,255,0.85)',
                  borderTopLeftRadius: 3,
                } : {
                  background: 'rgba(0,180,255,0.12)',
                  border: '1px solid rgba(0,180,255,0.2)',
                  color: 'rgba(180,230,255,0.9)',
                  borderTopRightRadius: 3,
                  textAlign: 'right',
                }),
              }}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <p style={{ color: 'rgba(0,180,255,0.25)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', paddingRight: 2 }}>ADMIN</p>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ color: 'rgba(0,180,255,0.35)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>SENTINEL</p>
              <div style={{
                padding: '10px 14px', borderRadius: 10, borderTopLeftRadius: 3,
                background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.14)',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#00b4ff', display: 'block' }}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)' }}>
            <AlertCircle size={12} style={{ color: '#ff453a', flexShrink: 0 }} />
            <p style={{ color: 'rgba(255,100,90,0.8)', fontSize: 11 }}>{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', flexShrink: 0,
        borderTop: '1px solid rgba(0,180,255,0.1)',
        background: 'rgba(0,8,18,0.9)',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,180,255,0.3)', fontSize: 11, pointerEvents: 'none' }}>›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Query Sentinel..."
            style={{
              width: '100%', background: 'rgba(0,180,255,0.05)',
              border: '1px solid rgba(0,180,255,0.15)',
              borderRadius: 8, padding: '9px 12px 9px 26px',
              color: 'rgba(180,230,255,0.85)', fontSize: 12,
              outline: 'none', letterSpacing: '0.03em',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: loading ? 'rgba(0,180,255,0.1)' : 'rgba(0,180,255,0.2)',
            border: '1px solid rgba(0,180,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={13} style={{ color: '#00b4ff' }} />
        </button>
      </div>
    </div>
  );
}