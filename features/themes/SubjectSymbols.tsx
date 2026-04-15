'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface FloatingSymbol {
  x: number; y: number;
  symbol: string;
  size: number;
  opacity: number;
  dur: number;
  delay: number;
  driftX: number;
  driftY: number;
}

function FloatingSymbols({ symbols, color }: { symbols: string[]; color: string }) {
  const items = useMemo<FloatingSymbol[]>(() => Array.from({ length: 14 }, (_, i) => ({
    x:       5 + Math.random() * 90,
    y:       5 + Math.random() * 90,
    symbol:  symbols[i % symbols.length],
    size:    14 + Math.random() * 18,
    opacity: 0.06 + Math.random() * 0.10,
    dur:     8 + Math.random() * 8,
    delay:   Math.random() * 6,
    driftX:  (Math.random() - 0.5) * 40,
    driftY:  (Math.random() - 0.5) * 30,
  })), [symbols]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {items.map((item, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top:  `${item.y}%`,
            fontSize: item.size,
            color,
            fontFamily: 'serif',
            userSelect: 'none',
            opacity: item.opacity,
          }}
          animate={{
            x:       [0, item.driftX, 0],
            y:       [0, item.driftY, 0],
            opacity: [item.opacity, item.opacity * 1.8, item.opacity],
            rotate:  [0, (Math.random() - 0.5) * 20, 0],
          }}
          transition={{ duration: item.dur, repeat: Infinity, ease: 'easeInOut', delay: item.delay }}
        >
          {item.symbol}
        </motion.div>
      ))}
    </div>
  );
}

// SVG-based molecule for sciences
function MoleculeCluster({ x, y, color, opacity, scale }: { x: number; y: number; color: string; opacity: number; scale: number }) {
  return (
    <motion.div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, pointerEvents: 'none' }}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 20 + Math.random() * 10, repeat: Infinity, ease: 'linear' }}
    >
      <svg width={60 * scale} height={60 * scale} viewBox="0 0 60 60" style={{ opacity }}>
        <g stroke={color} strokeWidth="1.5" fill="none">
          <line x1="30" y1="30" x2="12" y2="18"/>
          <line x1="30" y1="30" x2="48" y2="18"/>
          <line x1="30" y1="30" x2="30" y2="50"/>
          <circle cx="30" cy="30" r="5"  fill={color} fillOpacity="0.7"/>
          <circle cx="12" cy="18" r="4"  fill={color} fillOpacity="0.6"/>
          <circle cx="48" cy="18" r="4"  fill={color} fillOpacity="0.6"/>
          <circle cx="30" cy="50" r="4"  fill={color} fillOpacity="0.6"/>
        </g>
      </svg>
    </motion.div>
  );
}

// Circuit trace for technology
function CircuitTrace({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, pointerEvents: 'none', opacity }}>
      <svg width="80" height="60" viewBox="0 0 80 60">
        <g stroke="rgba(99,102,241,0.6)" strokeWidth="1" fill="none" strokeLinecap="round">
          <path d="M0,30 L15,30 L15,10 L35,10 L35,30 L50,30 L50,50 L70,50 L70,30 L80,30"/>
          <circle cx="15" cy="30" r="2.5" fill="rgba(99,102,241,0.5)"/>
          <circle cx="35" cy="30" r="2.5" fill="rgba(99,102,241,0.5)"/>
          <circle cx="50" cy="30" r="2.5" fill="rgba(99,102,241,0.5)"/>
          <circle cx="70" cy="30" r="2.5" fill="rgba(99,102,241,0.5)"/>
        </g>
        <motion.div
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </svg>
    </div>
  );
}

function PulsingCircuit({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  return (
    <motion.div style={{ position: 'absolute', left: `${x}%`, top: `${y}%` }}
      animate={{ opacity: [opacity * 0.4, opacity, opacity * 0.4] }}
      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 3 }}
    >
      <CircuitTrace x={0} y={0} opacity={1} />
    </motion.div>
  );
}

// =============================================================================
// SUBJECT SYMBOL SETS
// =============================================================================

export function MathematicsSymbols() {
  return <FloatingSymbols
    symbols={['∑','π','∫','√','²','³','△','∞','≠','≈','±','÷','×','∂','φ','θ','Δ','∏']}
    color="rgba(25,118,210,0.8)"
  />;
}

export function SciencesSymbols() {
  const molecules = useMemo(() => Array.from({ length: 5 }, () => ({
    x:       5 + Math.random() * 88,
    y:       5 + Math.random() * 88,
    color:   'rgba(46,125,50,0.6)',
    opacity: 0.4 + Math.random() * 0.3,
    scale:   0.6 + Math.random() * 0.7,
  })), []);

  return (
    <>
      <FloatingSymbols
        symbols={['⚗','⚛','○','—','H₂O','CO₂','O₂','N₂','DNA','ATP']}
        color="rgba(46,125,50,0.8)"
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {molecules.map((m, i) => <MoleculeCluster key={i} {...m} />)}
      </div>
    </>
  );
}

export function LanguagesSymbols() {
  // Speech bubbles + multilingual letters
  const bubbles = useMemo(() => Array.from({ length: 5 }, () => ({
    x:       5 + Math.random() * 85,
    y:       10 + Math.random() * 75,
    opacity: 0.06 + Math.random() * 0.08,
    scale:   0.7 + Math.random() * 0.8,
    delay:   Math.random() * 4,
  })), []);

  return (
    <>
      <FloatingSymbols
        symbols={['"','"','«','»','¡','¿','à','é','ü','ñ','ç','Ω','α','β','γ','→','←']}
        color="rgba(142,36,170,0.8)"
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {bubbles.map((b, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, opacity: b.opacity }}
            animate={{ y: [0, -10, 0], opacity: [b.opacity, b.opacity * 2, b.opacity] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
          >
            <svg width={50 * b.scale} height={40 * b.scale} viewBox="0 0 50 40">
              <path d="M2,2 Q2,2 48,2 Q48,2 48,28 Q48,28 30,28 L22,38 L22,28 Q2,28 2,28 Q2,28 2,2Z"
                fill="none" stroke="rgba(142,36,170,0.4)" strokeWidth="1.5"/>
            </svg>
          </motion.div>
        ))}
      </div>
    </>
  );
}

export function BusinessSymbols() {
  const chartItems = useMemo(() => Array.from({ length: 4 }, () => ({
    x:       8 + Math.random() * 82,
    y:       10 + Math.random() * 75,
    opacity: 0.07 + Math.random() * 0.08,
    scale:   0.6 + Math.random() * 0.6,
  })), []);

  return (
    <>
      <FloatingSymbols
        symbols={['$','£','€','¥','₹','%','↑','↓','◈','▲','▼','≡','∝','∞']}
        color="rgba(0,105,92,0.8)"
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {chartItems.map((c, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, opacity: c.opacity }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
          >
            <svg width={60 * c.scale} height={45 * c.scale} viewBox="0 0 60 45">
              <g fill="rgba(0,105,92,0.5)" stroke="rgba(0,105,92,0.3)" strokeWidth="0.5">
                <rect x="5"  y="30" width="8" height="12"/>
                <rect x="17" y="20" width="8" height="22"/>
                <rect x="29" y="10" width="8" height="32"/>
                <rect x="41" y="18" width="8" height="24"/>
              </g>
              <polyline points="9,28 21,18 33,8 45,16"
                fill="none" stroke="rgba(0,150,136,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </motion.div>
        ))}
      </div>
    </>
  );
}

export function TechnologySymbols() {
  const circuits = useMemo(() => Array.from({ length: 5 }, () => ({
    x:       5 + Math.random() * 82,
    y:       5 + Math.random() * 82,
    opacity: 0.25 + Math.random() * 0.25,
  })), []);

  const binaryLines = useMemo(() => Array.from({ length: 8 }, () => ({
    x:       Math.random() * 90,
    y:       Math.random() * 90,
    text:    Array.from({ length: 8 }, () => Math.round(Math.random())).join(' '),
    opacity: 0.05 + Math.random() * 0.06,
    delay:   Math.random() * 5,
  })), []);

  return (
    <>
      <FloatingSymbols
        symbols={['</>','{}','[]','()','=>','::','&&','||','//','++','--','≡','∀','∃']}
        color="rgba(55,65,181,0.8)"
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {circuits.map((c, i) => <PulsingCircuit key={i} {...c} />)}
        {binaryLines.map((b, i) => (
          <motion.div key={`bin-${i}`}
            style={{
              position: 'absolute', left: `${b.x}%`, top: `${b.y}%`,
              fontFamily: 'monospace', fontSize: 10,
              color: 'rgba(99,102,241,0.5)',
              opacity: b.opacity, letterSpacing: 2,
            }}
            animate={{ opacity: [b.opacity, b.opacity * 2, b.opacity] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
          >
            {b.text}
          </motion.div>
        ))}
      </div>
    </>
  );
}

export function ArtsSymbols() {
  const brushStrokes = useMemo(() => Array.from({ length: 4 }, () => ({
    x:       5 + Math.random() * 80,
    y:       5 + Math.random() * 80,
    opacity: 0.07 + Math.random() * 0.08,
    rot:     Math.random() * 40 - 20,
    delay:   Math.random() * 4,
  })), []);

  return (
    <>
      <FloatingSymbols
        symbols={['♪','♫','♬','✒','⚐','★','✦','❋','✿','◈','≋','∿']}
        color="rgba(230,74,25,0.8)"
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {brushStrokes.map((b, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, opacity: b.opacity, rotate: b.rot }}
            animate={{ opacity: [b.opacity, b.opacity * 1.8, b.opacity], scaleX: [1, 1.1, 1] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
          >
            <svg width="80" height="12" viewBox="0 0 80 12">
              <path d="M0,6 Q20,2 40,6 Q60,10 80,6" stroke="rgba(230,74,25,0.4)" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
          </motion.div>
        ))}
      </div>
    </>
  );
}

export function HealthSymbols() {
  const hearts = useMemo(() => Array.from({ length: 6 }, () => ({
    x:       5 + Math.random() * 88,
    y:       5 + Math.random() * 88,
    size:    16 + Math.random() * 16,
    opacity: 0.07 + Math.random() * 0.09,
    delay:   Math.random() * 4,
  })), []);

  return (
    <>
      <FloatingSymbols
        symbols={['♥','✚','⚕','☘','🌿','○','△','◇','≈','∞','⟳','⊕']}
        color="rgba(194,24,91,0.8)"
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {hearts.map((h, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', left: `${h.x}%`, top: `${h.y}%` }}
            animate={{ scale: [1, 1.2, 1], opacity: [h.opacity, h.opacity * 1.8, h.opacity] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: h.delay }}
          >
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" style={{ opacity: h.opacity * 10 }}>
              <path d="M12,21 L3,12 Q0,8 3,5 Q6,2 9,4 Q10,5 12,7 Q14,5 15,4 Q18,2 21,5 Q24,8 21,12 Z"
                fill="rgba(194,24,91,0.5)"/>
            </svg>
          </motion.div>
        ))}
      </div>
    </>
  );
}

// =============================================================================
// MASTER EXPORT
// =============================================================================

export function SubjectSymbolsLayer({ variant }: { variant: string }) {
  switch (variant) {
    case 'mathematics': return <MathematicsSymbols />;
    case 'sciences':    return <SciencesSymbols />;
    case 'languages':   return <LanguagesSymbols />;
    case 'business':    return <BusinessSymbols />;
    case 'technology':  return <TechnologySymbols />;
    case 'arts':        return <ArtsSymbols />;
    case 'health':      return <HealthSymbols />;
    default:            return null;
  }
}