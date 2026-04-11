'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AssiChatBot from './AssiChatBot';

const STORAGE_KEY = 'assi_orb_pos';
const ORB = 52;
const PAD = 20;

// Clearance the panel needs in each direction
const PANEL_W = 360;
const PANEL_H = 500;
const PANEL_GAP = 12; // gap between orb edge and panel

type Pos = { x: number; y: number };

interface Props {
  enabled?: boolean;
  isGuest?: boolean;
  isPlus?: boolean;
}

// Work out which corner the panel should anchor to based on orb position
function getPanelStyle(pos: Pos): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer opening above if orb is in bottom half, below if in top half
  const openAbove = pos.y > vh / 2;
  // Prefer opening left if orb is in right half, right if in left half
  const openLeft  = pos.x > vw / 2;

  const orbRight  = pos.x + ORB;
  const orbBottom = pos.y + ORB;

  return {
    position: 'fixed',
    zIndex:   10000,
    // Vertical — anchor bottom of panel to top of orb, or top of panel to bottom of orb
    ...(openAbove
      ? { bottom: vh - pos.y + PANEL_GAP }
      : { top: orbBottom + PANEL_GAP }),
    // Horizontal — align right edge of panel with right edge of orb, or left with left
    ...(openLeft
      ? { right: vw - orbRight }
      : { left: pos.x }),
    // Clamp so panel never leaves viewport
    maxWidth:  `min(${PANEL_W}px, calc(100vw - ${PAD * 2}px))`,
    maxHeight: `min(${PANEL_H}px, calc(100dvh - 120px))`,
  };
}

export default function AssiFloatingLauncher({ enabled = true, isGuest = false }: Props) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<Pos | null>(null);

  const dragging  = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const posRef    = useRef<Pos | null>(null); // always up to date for the mouseup handler

  useEffect(() => {
    if (!enabled) return;

    const handleOpen = () => setOpen(true);
    window.addEventListener('assi:open', handleOpen);

    const def: Pos = { x: window.innerWidth - ORB - PAD, y: window.innerHeight - ORB - PAD };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : def;
      const clamped = clamp(parsed);
      setPos(clamped);
      posRef.current = clamped;
    } catch {
      setPos(def);
      posRef.current = def;
    }

    return () => window.removeEventListener('assi:open', handleOpen);
  }, [enabled]);

  function clamp(p: Pos): Pos {
    return {
      x: Math.max(PAD, Math.min(p.x, window.innerWidth  - ORB - PAD)),
      y: Math.max(PAD, Math.min(p.y, window.innerHeight - ORB - PAD)),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    dragging.current  = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos!.x, oy: pos!.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragging.current = true;
      const next = clamp({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
      setPos(next);
      posRef.current = next;
    }

    function onUp() {
      if (posRef.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onClick() {
    if (!dragging.current) setOpen(o => !o);
  }

  if (!enabled || !pos) return null;

  return (
    <>
      {/* ── Depth-of-field backdrop ── */}
      {/* z-index: 9996 — below orb (9999) so orb stays draggable/clickable.
          The backdrop closes the panel on click, but the orb above it
          intercepts its own click events first. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dof-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
            style={{
              position:             'fixed',
              inset:                0,
              zIndex:               9996,
              backdropFilter:       'blur(12px) brightness(0.52)',
              WebkitBackdropFilter: 'blur(12px) brightness(0.52)',
              background:           'rgba(4,4,10,0.40)',
              cursor:               'default',
              pointerEvents:        'auto',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Orb ── */}
      <motion.button
        onMouseDown={onMouseDown}
        onClick={onClick}
        animate={pos}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className={open ? undefined : 'assi-orb-idle'}
        style={{
          position:     'fixed',
          width:        ORB,
          height:       ORB,
          borderRadius: 999,
          /* ASSI brand: warm gold → coral orange → rose — matches logo */
          background:   open
            ? 'radial-gradient(circle at 32% 28%, #ffe08a, #ff6840, #f04870)'
            : 'radial-gradient(circle at 32% 28%, #ffd070, #ff5830, #e83258)',
          boxShadow: open
            ? '0 0 0 3px rgba(255,110,55,0.45), 0 0 18px rgba(255,90,40,0.30), 0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.30)'
            : undefined, /* idle shadow handled by .assi-orb-idle keyframe */
          border:     'none',
          cursor:     'grab',
          zIndex:     9999,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.25s ease',
        }}
        whileTap={{ scale: 0.92 }}
        aria-label="Open ASSI"
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            color:      'rgba(255,255,255,0.92)',
            fontSize:   open ? 22 : 18,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: open ? undefined : '0.02em',
            textShadow: '0 1px 4px rgba(0,0,0,0.35)',
          }}
        >
          {open ? '+' : 'A'}
        </motion.span>
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && pos && (
          <motion.div
            key="assi-panel"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={getPanelStyle(pos)}
          >
            <AssiChatBot onClose={() => setOpen(false)} isGuest={isGuest} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
