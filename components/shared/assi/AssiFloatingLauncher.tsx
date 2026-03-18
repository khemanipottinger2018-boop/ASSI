'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AssiChatBot from './AssiChatBot';

const STORAGE_KEY = 'assi_orb_pos';
const ORB = 52;
const PAD = 20;

type Pos = { x: number; y: number };

export default function AssiFloatingLauncher({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  /* ── Init position ── */
  useEffect(() => {
    if (!enabled) return;
    const def: Pos = { x: window.innerWidth - ORB - PAD, y: window.innerHeight - ORB - PAD };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : def;
      setPos(clamp(parsed));
    } catch {
      setPos(def);
    }
  }, [enabled]);

  function clamp(p: Pos): Pos {
    return {
      x: Math.max(PAD, Math.min(p.x, window.innerWidth  - ORB - PAD)),
      y: Math.max(PAD, Math.min(p.y, window.innerHeight - ORB - PAD)),
    };
  }

  /* ── Drag handlers ── */
  function onMouseDown(e: React.MouseEvent) {
    dragging.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos!.x, oy: pos!.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragging.current = true;
      const next = clamp({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
      setPos(next);
    }

    function onUp() {
      if (pos) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onClick() {
    if (!dragging.current) setOpen((o) => !o);
  }

  if (!enabled || !pos) return null;

  /* Panel positioning — flip to left if orb is on right half */
  const panelRight = pos.x > window.innerWidth / 2;

  return (
    <>
      {/* Orb */}
      <motion.button
        onMouseDown={onMouseDown}
        onClick={onClick}
        animate={pos}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{
          position: 'fixed',
          width: ORB,
          height: ORB,
          borderRadius: 999,
          background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)',
          boxShadow: open
            ? '0 0 0 3px rgba(184,76,255,0.4), 0 16px 40px rgba(0,0,0,0.4)'
            : '0 8px 24px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.2)',
          border: 'none',
          cursor: 'grab',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'box-shadow 0.2s ease',
        }}
        whileTap={{ scale: 0.92 }}
        aria-label="Open ASSI"
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1 }}
        >
          {open ? '+' : 'A'}
        </motion.span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="assi-panel"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              bottom: Math.max(PAD, window.innerHeight - pos.y + 12),
              ...(panelRight ? { right: window.innerWidth - pos.x - ORB } : { left: pos.x }),
              zIndex: 10000,
            }}
          >
            <AssiChatBot onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}