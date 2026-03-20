'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// =============================================================================
// CYBERPUNK — neon grid + digital rain
// =============================================================================

function NeonGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
        <defs>
          <pattern id="cyberpunk-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00ffff" strokeWidth="0.5"/>
          </pattern>
          <pattern id="cyberpunk-grid2" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">
            <path d="M 180 0 L 0 0 0 180" fill="none" stroke="#ff00ff" strokeWidth="0.8" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cyberpunk-grid)"/>
        <rect width="100%" height="100%" fill="url(#cyberpunk-grid2)"/>
      </svg>
      {/* Perspective vanishing point effect */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,255,255,0.04) 0%, transparent 70%)',
      }}/>
    </div>
  );
}

function DigitalRain() {
  const columns = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    x:       i * 5 + Math.random() * 3,
    chars:   Array.from({ length: 12 }, () =>
      String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))),
    dur:     3 + Math.random() * 4,
    delay:   Math.random() * 5,
    opacity: 0.15 + Math.random() * 0.20,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {columns.map((col, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute', left: `${col.x}%`,
            display: 'flex', flexDirection: 'column', gap: 2,
            fontFamily: 'monospace', fontSize: 11,
            color: '#00ff41', opacity: col.opacity,
            textShadow: '0 0 6px #00ff41',
          }}
          animate={{ y: ['-100%', '120%'] }}
          transition={{ duration: col.dur, repeat: Infinity, delay: col.delay, ease: 'linear' }}
        >
          {col.chars.map((c, j) => (
            <span key={j} style={{ opacity: 1 - j * 0.07 }}>{c}</span>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

function NeonGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* Cyan glow top-left */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,255,255,0.07) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }}/>
      {/* Magenta glow bottom-right */}
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,0,255,0.06) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }}/>
      {/* Purple center */}
      <motion.div style={{
        position: 'absolute', top: '30%', left: '40%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(130,0,255,0.05) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

export function CyberpunkTheme() {
  return (
    <>
      <NeonGrid />
      <NeonGlow />
      <DigitalRain />
    </>
  );
}

// =============================================================================
// OCEAN DEPTHS — bubbles + caustic light rays
// =============================================================================

function Bubble({ x, size, delay, dur }: { x: number; size: number; delay: number; dur: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute', left: `${x}%`, bottom: '-5%',
        width: size, height: size, borderRadius: '50%',
        border: '1px solid rgba(100,200,255,0.4)',
        background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15) 0%, rgba(100,200,255,0.05) 50%, transparent 70%)',
      }}
      animate={{ y: [0, -(window?.innerHeight ?? 800) - 100], x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60], opacity: [0, 0.7, 0.7, 0] }}
      transition={{ duration: dur, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function CausticRays() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${10 + i * 14}%`,
            width: 60 + i * 10,
            height: '70%',
            background: `linear-gradient(to bottom, rgba(100,200,255,${0.04 + i * 0.008}) 0%, transparent 100%)`,
            transformOrigin: 'top center',
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          }}
          animate={{
            rotate:  [-3, 3, -3],
            scaleX:  [1, 1.15, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 4 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
        />
      ))}
    </div>
  );
}

function DeepGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,150,255,0.12) 0%, transparent 60%)',
      }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
        background: 'linear-gradient(to top, rgba(0,20,80,0.3) 0%, transparent 100%)',
      }}/>
    </div>
  );
}

export function OceanDepthsTheme() {
  const bubbles = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
    x:     Math.random() * 95,
    size:  4 + Math.random() * 20,
    delay: Math.random() * 8,
    dur:   6 + Math.random() * 8,
  })), []);

  return (
    <>
      <DeepGlow />
      <CausticRays />
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
        {bubbles.map((b, i) => <Bubble key={i} {...b} />)}
      </div>
    </>
  );
}

// =============================================================================
// LO-FI STUDY — warm amber desk lamp glow, paper texture, subtle dust motes
// =============================================================================

function DeskLampGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* Main cone of warm light from top-center (desk lamp) */}
      <div style={{
        position: 'absolute',
        top: '-5%', left: '50%',
        width: 0, height: 0,
        marginLeft: -300,
        borderLeft:  '300px solid transparent',
        borderRight: '300px solid transparent',
        borderTop:   '0px solid transparent',
        borderBottom: '700px solid rgba(255,200,80,0.06)',
        filter: 'blur(30px)',
      }}/>
      {/* Warm center glow */}
      <motion.div style={{
        position: 'absolute', top: '5%', left: '50%',
        width: 400, height: 300,
        marginLeft: -200,
        background: 'radial-gradient(ellipse, rgba(255,190,60,0.10) 0%, rgba(255,160,40,0.05) 40%, transparent 70%)',
        filter: 'blur(20px)',
      }}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Edge darkness — cozy enclosed feel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 30%, rgba(20,10,5,0.25) 100%)',
      }}/>
    </div>
  );
}

function DustMotes() {
  const motes = useMemo(() => Array.from({ length: 20 }, () => ({
    x:       20 + Math.random() * 60,
    y:       10 + Math.random() * 60,
    size:    1.5 + Math.random() * 2.5,
    opacity: 0.15 + Math.random() * 0.25,
    dur:     8 + Math.random() * 10,
    delay:   Math.random() * 8,
    driftX:  (Math.random() - 0.5) * 40,
    driftY:  (Math.random() - 0.5) * 20,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {motes.map((m, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute', left: `${m.x}%`, top: `${m.y}%`,
            width: m.size, height: m.size, borderRadius: '50%',
            background: 'rgba(255,220,150,0.8)',
          }}
          animate={{
            x:       [0, m.driftX, 0],
            y:       [0, m.driftY, 0],
            opacity: [0, m.opacity, m.opacity * 0.5, m.opacity, 0],
          }}
          transition={{ duration: m.dur, repeat: Infinity, ease: 'easeInOut', delay: m.delay }}
        />
      ))}
    </div>
  );
}

export function LoFiStudyTheme() {
  return (
    <>
      <DeskLampGlow />
      <DustMotes />
    </>
  );
}