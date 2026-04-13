'use client';

import { motion } from 'framer-motion';

/* =====================================================
 * ASSI BOOT LOADING SCREEN
 * Day:   rich sunset orange-to-gold gradient, white accents
 * Night: near-black with ASSI orange/gold blobs
 * Night hours: 20:00 – 05:59
 * ===================================================== */

const hour = typeof window !== 'undefined' ? new Date().getHours() : 7;
const IS_NIGHT = hour < 6 || hour >= 20;

/* ── PALETTE ── */
const DAY = {
  bg:       'linear-gradient(160deg, #c0392b 0%, #e05a1e 28%, #f97316 55%, #fbbf24 80%, #fef3c7 100%)',
  blobs: [
    { color: 'rgba(255,255,255,0.55)', w: 480, h: 480, top: '-140px', left: '-120px', dur: 22, delay: 0,  keyX: [0,  80, -40,  60,  0], keyY: [0, -60, 100, -40,  0], keyS: [1, 1.2, 0.9, 1.1,  1] },
    { color: 'rgba(255,255,255,0.35)', w: 340, h: 340, top: '58%',   left: '70%',    dur: 28, delay: 4,  keyX: [0, -60,  40, -30,  0], keyY: [0,  50, -80,  30,  0], keyS: [1, 0.9, 1.2, 0.95, 1] },
    { color: 'rgba(255,200,60,0.55)',  w: 300, h: 300, top: '62%',   left: '-40px',  dur: 20, delay: 9,  keyX: [0,  50, -20,  40,  0], keyY: [0, -40,  60, -20,  0], keyS: [1, 1.1, 0.9, 1.05, 1] },
  ],
  vignette: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(140, 30, 0, 0.50) 100%)',
  wordmark:  '#ffffff',
  accent:    'rgba(255,255,255,0.70)',
  loading:   'rgba(255,255,255,0.55)',
};

const NIGHT = {
  bg:       '#050505',
  blobs: [
    { color: '#FF6B35', w: 420, h: 420, top: '-120px', left: '-100px', dur: 22, delay: 0,  keyX: [0,  80, -40,  60,  0], keyY: [0, -60, 100, -40,  0], keyS: [1, 1.2, 0.9, 1.1,  1] },
    { color: '#FF4D4D', w: 320, h: 320, top: '55%',    left: '72%',    dur: 28, delay: 4,  keyX: [0, -60,  40, -30,  0], keyY: [0,  50, -80,  30,  0], keyS: [1, 0.9, 1.2, 0.95, 1] },
    { color: '#FFD166', w: 280, h: 280, top: '65%',    left: '-30px',  dur: 20, delay: 9,  keyX: [0,  50, -20,  40,  0], keyY: [0, -40,  60, -20,  0], keyS: [1, 1.1, 0.9, 1.05, 1] },
  ],
  vignette: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.60) 100%)',
  wordmark:  '#ffffff',
  accent:    'rgba(249,115,22,0.75)',
  loading:   'rgba(255,255,255,0.30)',
};

const P = IS_NIGHT ? NIGHT : DAY;

export default function LoadingScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: P.bg }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Animated blobs */}
      {P.blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width:      b.w,
            height:     b.h,
            top:        b.top,
            left:       b.left,
            background: `radial-gradient(circle at 40% 40%, ${b.color} 0%, transparent 70%)`,
            filter:     'blur(3px)',
          }}
          animate={{ x: b.keyX, y: b.keyY, scale: b.keyS }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: P.vignette, zIndex: 1 }}
      />

      {/* ASSI wordmark */}
      <div className="relative flex flex-col items-center gap-3 select-none" style={{ zIndex: 2 }}>
        <motion.h1
          className="font-bold uppercase"
          style={{
            letterSpacing: '0.28em',
            fontSize:      '2.1rem',
            color:         P.wordmark,
            textShadow:    IS_NIGHT ? 'none' : '0 2px 24px rgba(180,40,0,0.25)',
          }}
          initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          ASSI
        </motion.h1>

        {/* Accent line */}
        <motion.div
          style={{
            width:      '2.5rem',
            height:     '1px',
            background: `linear-gradient(to right, transparent, ${P.accent}, transparent)`,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.55, ease: 'easeOut' }}
        />

        {/* "Loading" pulse */}
        <motion.p
          className="uppercase animate-pulse"
          style={{
            fontSize:      '0.625rem',
            letterSpacing: '0.25em',
            color:         P.loading,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.85 }}
        >
          Loading
        </motion.p>
      </div>
    </motion.div>
  );
}
