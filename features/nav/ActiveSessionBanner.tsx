'use client';

import { useRouter }          from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { useActiveSession }   from '@/features/sessions';

/**
 * Drop this anywhere in your nav or sidebar.
 * It renders nothing when there's no active session.
 * When a session exists it shows a pulsing "Ongoing session" pill
 * that navigates directly to /live-chat/[sessionId].
 */
export default function ActiveSessionBanner() {
  const router    = useRouter();
  const sessionId = useActiveSession();

  return (
    <AnimatePresence>
      {sessionId && (
        <motion.button
          key="active-session"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => router.push(`/live-chat/${sessionId}`)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.22)',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.14)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.08)';
          }}
        >
          {/* Pulse dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: '#34d399', opacity: 0.4,
              animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
            }} />
            <MessageCircle size={14} style={{ color: '#34d399', position: 'relative' }} />
          </div>

          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <p style={{ color: '#34d399', fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
              Ongoing Session
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>
              Tap to rejoin
            </p>
          </div>

          <ChevronRight size={13} style={{ color: 'rgba(52,211,153,0.5)', flexShrink: 0 }} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
