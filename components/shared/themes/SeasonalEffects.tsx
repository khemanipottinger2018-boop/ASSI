'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// =============================================================================
// EVENT DETECTION — Jamaica calendar
// =============================================================================

export type JamaicaEvent =
  | 'new_year'
  | 'valentine'
  | 'easter'
  | 'emancipation'
  | 'independence'
  | 'halloween'
  | 'christmas'
  | 'boxing_day'
  | null;

export type SeasonalPeriod = 'winter' | 'spring' | 'summer' | 'autumn';

export function detectJamaicaEvent(): JamaicaEvent {
  const now   = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day   = now.getDate();

  // Within 3 days before/after for most events
  // Christmas: Dec 20–26
  if (month === 12 && day >= 20 && day <= 26) return 'christmas';
  // Boxing Day / New Year: Dec 27–Jan 3
  if ((month === 12 && day >= 27) || (month === 1 && day <= 3)) return 'boxing_day';
  // New Year: Jan 1
  if (month === 1 && day >= 1 && day <= 3) return 'new_year';
  // Valentine: Feb 12–15
  if (month === 2 && day >= 12 && day <= 15) return 'valentine';
  // Easter: approximate (Good Friday area, mid-April)
  if (month === 4 && day >= 10 && day <= 20) return 'easter';
  // Emancipation Day: Jul 29–Aug 2
  if ((month === 7 && day >= 29) || (month === 8 && day <= 2)) return 'emancipation';
  // Independence Day: Aug 3–8
  if (month === 8 && day >= 3 && day <= 8) return 'independence';
  // Halloween: Oct 28–Nov 1
  if (month === 10 && day >= 28) return 'halloween';
  if (month === 11 && day === 1) return 'halloween';

  return null;
}

export function detectSeason(): SeasonalPeriod {
  const month = new Date().getMonth() + 1;
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3  && month <= 5) return 'spring';
  if (month >= 6  && month <= 8) return 'summer';
  return 'autumn';
}

// =============================================================================
// SNOWFLAKE (CSS SVG shape — not a circle)
// =============================================================================

function Snowflake({ size, opacity }: { size: number; opacity: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity }}>
      <g stroke="white" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="2"  x2="12" y2="22"/>
        <line x1="2"  y1="12" x2="22" y2="12"/>
        <line x1="5"  y1="5"  x2="19" y2="19"/>
        <line x1="19" y1="5"  x2="5"  y2="19"/>
        <line x1="12" y1="2"  x2="9"  y2="5"/>
        <line x1="12" y1="2"  x2="15" y2="5"/>
        <line x1="12" y1="22" x2="9"  y2="19"/>
        <line x1="12" y1="22" x2="15" y2="19"/>
        <line x1="2"  y1="12" x2="5"  y2="9"/>
        <line x1="2"  y1="12" x2="5"  y2="15"/>
        <line x1="22" y1="12" x2="19" y2="9"/>
        <line x1="22" y1="12" x2="19" y2="15"/>
      </g>
    </svg>
  );
}

// =============================================================================
// SNOW PILES (bottom of screen)
// =============================================================================

function SnowPiles() {
  return (
    <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 3 }}>
      <svg width="100%" height="80" viewBox="0 0 1440 80" preserveAspectRatio="none">
        <path d="M0,80 L0,55 Q60,30 120,45 Q180,58 240,40 Q300,22 360,38 Q420,52 480,35 Q540,18 600,40 Q660,58 720,42 Q780,26 840,44 Q900,60 960,38 Q1020,18 1080,36 Q1140,52 1200,40 Q1260,28 1320,46 Q1380,62 1440,50 L1440,80 Z"
          fill="rgba(255,255,255,0.85)" />
        <path d="M0,80 L0,65 Q80,48 160,58 Q240,66 320,52 Q400,38 480,55 Q560,70 640,58 Q720,46 800,60 Q880,72 960,58 Q1040,44 1120,56 Q1200,66 1280,54 Q1360,42 1440,60 L1440,80 Z"
          fill="rgba(255,255,255,0.60)" />
      </svg>
    </div>
  );
}

// =============================================================================
// WINTER THEME
// =============================================================================

export function WinterEffects() {
  const [flakes, setFlakes] = useState<{ x: number; size: number; opacity: number; dur: number; delay: number; drift: number }[]>([]);
  useEffect(() => {
    setFlakes(Array.from({ length: 35 }, () => ({
      x:       Math.random() * 100,
      size:    8 + Math.random() * 14,
      opacity: 0.4 + Math.random() * 0.5,
      dur:     6 + Math.random() * 6,
      delay:   Math.random() * 8,
      drift:   (Math.random() - 0.5) * 100,
    })));
  }, []);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
        {flakes.map((f, i) => (
          <motion.div key={i} style={{ position: 'absolute', left: `${f.x}%` }}
            animate={{ y: ['-10vh', '105vh'], x: [0, f.drift], rotate: [0, 360] }}
            transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: 'linear' }}
          >
            <Snowflake size={f.size} opacity={f.opacity} />
          </motion.div>
        ))}
      </div>
      <SnowPiles />
    </>
  );
}

// =============================================================================
// CHRISTMAS THEME
// =============================================================================

function ChristmasTree({ x, y, size, opacity }: { x: number; y: number; size: number; opacity: number }) {
  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, opacity, pointerEvents: 'none' }}>
      <svg width={size} height={size * 1.3} viewBox="0 0 40 52">
        {/* Star */}
        <polygon points="20,2 21.9,7.6 27.8,7.6 23,11 24.9,16.6 20,13.2 15.1,16.6 17,11 12.2,7.6 18.1,7.6" fill="#FFD700" opacity="0.9"/>
        {/* Tree layers */}
        <polygon points="20,10 32,28 8,28" fill="#1a6b45" opacity="0.85"/>
        <polygon points="20,18 34,38 6,38" fill="#27ae60" opacity="0.85"/>
        <polygon points="20,26 36,48 4,48" fill="#1a6b45" opacity="0.85"/>
        {/* Trunk */}
        <rect x="17" y="48" width="6" height="4" fill="#8B4513" opacity="0.7"/>
        {/* Ornaments */}
        <circle cx="14" cy="32" r="2.5" fill="#e74c3c" opacity="0.9"/>
        <circle cx="26" cy="36" r="2.5" fill="#3498db" opacity="0.9"/>
        <circle cx="20" cy="40" r="2" fill="#f39c12" opacity="0.9"/>
        <circle cx="16" cy="42" r="1.8" fill="#9b59b6" opacity="0.8"/>
        <circle cx="28" cy="28" r="2" fill="#e74c3c" opacity="0.8"/>
      </svg>
    </div>
  );
}

function Ornament({ x, y, color, size }: { x: number; y: number; color: string; size: number }) {
  return (
    <motion.div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, pointerEvents: 'none' }}
      animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }}
      transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 3 }}
    >
      <svg width={size} height={size * 1.3} viewBox="0 0 20 26">
        <line x1="10" y1="0" x2="10" y2="4" stroke="#888" strokeWidth="1.5"/>
        <path d="M7,3 Q10,1 13,3" fill="none" stroke="#888" strokeWidth="1.5"/>
        <circle cx="10" cy="15" r="9" fill={color} opacity="0.85"/>
        <ellipse cx="8" cy="11" rx="3" ry="2" fill="rgba(255,255,255,0.25)" transform="rotate(-30,8,11)"/>
      </svg>
    </motion.div>
  );
}

function SantaSilhouette() {
  return (
    <motion.div
      className="fixed pointer-events-none"
      style={{ bottom: '12%', zIndex: 3 }}
      initial={{ right: '-120px' }}
      animate={{ right: ['110%', '-120px'] }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear', delay: 10 }}
    >
      <svg width="100" height="60" viewBox="0 0 100 60" opacity="0.25">
        {/* Sleigh */}
        <path d="M20,45 Q40,30 70,35 Q85,38 90,45 Q80,55 50,52 Q25,52 20,45Z" fill="white"/>
        <path d="M15,48 Q10,52 20,55 Q50,58 80,55 Q90,52 95,48" fill="none" stroke="white" strokeWidth="2"/>
        {/* Reindeer (simplified) */}
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(${-30 - i*25}, 0)`}>
            <ellipse cx="50" cy="38" rx="12" ry="6" fill="white" opacity="0.7"/>
            <circle cx="62" cy="35" r="5" fill="white" opacity="0.7"/>
            <line x1="55" y1="32" x2="53" y2="24" stroke="white" strokeWidth="1.5" opacity="0.7"/>
            <line x1="59" y1="31" x2="61" y2="23" stroke="white" strokeWidth="1.5" opacity="0.7"/>
            <line x1="40" y1="44" x2="38" y2="54" stroke="white" strokeWidth="1.5" opacity="0.7"/>
            <line x1="46" y1="44" x2="44" y2="54" stroke="white" strokeWidth="1.5" opacity="0.7"/>
          </g>
        ))}
        {/* Santa */}
        <circle cx="25" cy="28" r="7" fill="white" opacity="0.6"/>
        <rect x="18" y="34" width="14" height="12" rx="3" fill="white" opacity="0.5"/>
      </svg>
    </motion.div>
  );
}

export function ChristmasEffects() {
  const [flakes, setFlakes] = useState<{ x: number; size: number; opacity: number; dur: number; delay: number; drift: number }[]>([]);
  const trees    = useMemo(() => Array.from({ length: 4 }, (_, i) => ({ x: 5 + i * 25 + Math.random() * 10, y: 55 + Math.random() * 20, size: 40 + Math.random() * 30, opacity: 0.15 + Math.random() * 0.15 })), []);
  const ornaments = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: 5 + Math.random() * 90, y: 5 + Math.random() * 30,
    color: ['#e74c3c','#3498db','#f39c12','#9b59b6','#1abc9c'][i % 5],
    size: 20 + Math.random() * 16,
  })), []);

  useEffect(() => {
    setFlakes(Array.from({ length: 25 }, () => ({
      x: Math.random() * 100, size: 6 + Math.random() * 10,
      opacity: 0.5 + Math.random() * 0.4,
      dur: 7 + Math.random() * 5, delay: Math.random() * 8,
      drift: (Math.random() - 0.5) * 80,
    })));
  }, []);

  return (
    <>
      {/* Background trees */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {trees.map((t, i) => <ChristmasTree key={i} {...t} />)}
        {ornaments.map((o, i) => <Ornament key={i} {...o} />)}
      </div>
      {/* Snowflakes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
        {flakes.map((f, i) => (
          <motion.div key={i} style={{ position: 'absolute', left: `${f.x}%` }}
            animate={{ y: ['-10vh', '105vh'], x: [0, f.drift], rotate: [0, 360] }}
            transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: 'linear' }}
          >
            <Snowflake size={f.size} opacity={f.opacity} />
          </motion.div>
        ))}
      </div>
      <SnowPiles />
      <SantaSilhouette />
    </>
  );
}

// =============================================================================
// SUMMER / SUNSET THEME
// =============================================================================

function PalmSilhouette({ x, side }: { x: number; side: 'left' | 'right' }) {
  const flip = side === 'right' ? 'scale(-1,1)' : 'scale(1,1)';
  return (
    <div className="fixed bottom-0 pointer-events-none" style={{ left: `${x}%`, zIndex: 3 }}>
      <svg width="120" height="220" viewBox="0 0 120 220" style={{ transform: flip, opacity: 0.4 }}>
        {/* Trunk */}
        <path d="M60,220 Q55,180 58,140 Q60,100 62,60" stroke="#3d2b1f" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* Fronds */}
        <path d="M62,62 Q20,40 5,20" stroke="#1a6b45" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85"/>
        <path d="M62,62 Q30,30 35,5"  stroke="#27ae60" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8"/>
        <path d="M62,62 Q70,25 95,10" stroke="#1a6b45" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85"/>
        <path d="M62,62 Q90,40 115,30" stroke="#27ae60" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8"/>
        <path d="M62,62 Q55,30 65,8"  stroke="#2ecc71" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.75"/>
        {/* Coconuts */}
        <circle cx="55" cy="68" r="7" fill="#8B4513" opacity="0.7"/>
        <circle cx="68" cy="72" r="6" fill="#8B4513" opacity="0.6"/>
      </svg>
    </div>
  );
}

function SunsetGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {/* Sun */}
      <motion.div style={{
        position: 'absolute', left: '50%', bottom: '28%',
        width: 120, height: 120, marginLeft: -60,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,220,50,0.6) 0%, rgba(255,140,0,0.4) 40%, transparent 70%)',
        filter: 'blur(8px)',
      }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Horizon glow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
        background: 'linear-gradient(to top, rgba(255,100,20,0.20) 0%, rgba(255,160,60,0.12) 40%, transparent 100%)',
      }}/>
      {/* Sun rays */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.div key={i} style={{
          position: 'absolute', left: '50%', bottom: '32%',
          width: 2, height: 160 + i * 20,
          marginLeft: -1,
          background: 'linear-gradient(to top, rgba(255,200,50,0.15), transparent)',
          transformOrigin: 'bottom center',
          rotate: `${i * 45}deg`,
        }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
    </div>
  );
}

function HeatShimmer() {
  return (
    <motion.div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}
      animate={{ opacity: [0, 0.03, 0, 0.02, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div style={{
        position: 'absolute', bottom: '15%', left: 0, right: 0, height: '20%',
        background: 'linear-gradient(to top, rgba(255,255,255,0.04), transparent)',
        filter: 'blur(2px)',
      }}/>
    </motion.div>
  );
}

export function SummerEffects() {
  return (
    <>
      <SunsetGlow />
      <HeatShimmer />
      <PalmSilhouette x={-2}  side="left" />
      <PalmSilhouette x={82} side="right" />
    </>
  );
}

// =============================================================================
// AUTUMN THEME — real leaf shapes
// =============================================================================

const LEAF_PATHS = [
  // Maple leaf
  "M12,2 L14,6 L18,4 L16,8 L20,8 L17,11 L19,15 L15,13 L12,18 L9,13 L5,15 L7,11 L4,8 L8,8 L6,4 L10,6 Z",
  // Simple oak-ish
  "M12,1 Q16,4 15,8 Q18,7 17,11 Q19,13 16,14 Q15,17 12,16 Q9,17 8,14 Q5,13 7,11 Q6,7 9,8 Q8,4 12,1 Z",
  // Elongated leaf
  "M12,2 Q18,8 16,14 Q14,18 12,20 Q10,18 8,14 Q6,8 12,2 Z",
];

const LEAF_COLORS = ['#c0392b','#e67e22','#f39c12','#d35400','#922b21','#a04000'];

export function AutumnEffects() {
  const leaves = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    x:       Math.random() * 100,
    size:    16 + Math.random() * 20,
    color:   LEAF_COLORS[i % LEAF_COLORS.length],
    path:    LEAF_PATHS[i % LEAF_PATHS.length],
    opacity: 0.55 + Math.random() * 0.35,
    dur:     7 + Math.random() * 6,
    delay:   Math.random() * 8,
    drift:   (Math.random() - 0.5) * 120,
    initRot: Math.random() * 360,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
      {leaves.map((l, i) => (
        <motion.div key={i} style={{ position: 'absolute', left: `${l.x}%` }}
          animate={{ y: ['-5vh', '108vh'], x: [0, l.drift], rotate: [l.initRot, l.initRot + 360] }}
          transition={{ duration: l.dur, repeat: Infinity, delay: l.delay, ease: 'linear' }}
        >
          <svg width={l.size} height={l.size} viewBox="0 0 24 24" style={{ opacity: l.opacity }}>
            <path d={l.path} fill={l.color}/>
            <line x1="12" y1="20" x2="12" y2="24" stroke={l.color} strokeWidth="1" opacity="0.5"/>
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// SPRING THEME — cherry blossoms
// =============================================================================

function Petal({ color }: { color: string }) {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10">
      <ellipse cx="7" cy="5" rx="6" ry="4" fill={color} opacity="0.8"/>
      <line x1="7" y1="2" x2="7" y2="8" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
    </svg>
  );
}

export function SpringEffects() {
  const petals = useMemo(() => Array.from({ length: 30 }, () => ({
    x:       Math.random() * 100,
    color:   ['#f48fb1','#f8bbd0','#fce4ec','#e91e63','#ff80ab','#ffccbc'][Math.floor(Math.random() * 6)],
    dur:     6 + Math.random() * 5,
    delay:   Math.random() * 7,
    drift:   (Math.random() - 0.5) * 100,
    initRot: Math.random() * 360,
    opacity: 0.5 + Math.random() * 0.4,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
      {petals.map((p, i) => (
        <motion.div key={i} style={{ position: 'absolute', left: `${p.x}%`, opacity: p.opacity }}
          animate={{ y: ['-5vh', '108vh'], x: [0, p.drift], rotate: [p.initRot, p.initRot + 180] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'linear' }}
        >
          <Petal color={p.color} />
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// JAMAICA INDEPENDENCE / EMANCIPATION
// =============================================================================

function JamaicanStar({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  return (
    <motion.div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, pointerEvents: 'none' }}
      animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.9, 1.1, 0.9] }}
      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={color} stroke={color} strokeWidth="0.5"/>
      </svg>
    </motion.div>
  );
}

export function IndependenceEffects() {
  const stars = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    x:     Math.random() * 90,
    y:     Math.random() * 70,
    size:  12 + Math.random() * 16,
    color: ['#FFD700','#000000','#009B3A'][i % 3], // Jamaica flag colors
    delay: Math.random() * 3,
  })), []);

  // Floating ribbon strips
  const ribbons = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    x: Math.random() * 100,
    color: ['#FFD700','#000000','#009B3A'][i % 3],
    dur: 5 + Math.random() * 4,
    delay: Math.random() * 6,
    drift: (Math.random() - 0.5) * 80,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
      {stars.map((s, i) => <JamaicanStar key={i} {...s} />)}
      {ribbons.map((r, i) => (
        <motion.div key={`r-${i}`}
          style={{ position: 'absolute', left: `${r.x}%`, width: 4, height: 20, background: r.color, borderRadius: 2, opacity: 0.6 }}
          animate={{ y: ['-5vh', '108vh'], x: [0, r.drift], rotate: [0, 720] }}
          transition={{ duration: r.dur, repeat: Infinity, delay: r.delay, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// HALLOWEEN
// =============================================================================

function Bat({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <motion.div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, pointerEvents: 'none' }}
      animate={{ x: [0, 60, 120, 200], y: [0, -20, 10, -15], opacity: [0, 0.6, 0.6, 0] }}
      transition={{ duration: 8 + Math.random() * 4, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <svg width={size} height={size * 0.5} viewBox="0 0 40 20" style={{ opacity: 0.7 }}>
        <path d="M20,10 Q8,2 0,8 Q6,10 8,14 Q12,8 20,10 Q28,8 32,14 Q34,10 40,8 Q32,2 20,10Z" fill="#1a1a2e"/>
        <circle cx="20" cy="9" r="3" fill="#2d1b69"/>
        <path d="M18,7 Q20,5 22,7" fill="none" stroke="#666" strokeWidth="0.8"/>
      </svg>
    </motion.div>
  );
}

export function HalloweenEffects() {
  const bats = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x:     Math.random() * 80,
    y:     5 + Math.random() * 40,
    size:  20 + Math.random() * 20,
    delay: i * 3 + Math.random() * 4,
  })), []);

  // Floating jack-o-lantern emojis
  const pumpkins = useMemo(() => Array.from({ length: 5 }, () => ({
    x:       10 + Math.random() * 80,
    y:       20 + Math.random() * 50,
    size:    24 + Math.random() * 20,
    opacity: 0.12 + Math.random() * 0.10,
    delay:   Math.random() * 4,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
      {bats.map((b, i) => <Bat key={i} {...b} />)}
      {pumpkins.map((p, i) => (
        <motion.div key={`p-${i}`}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size, opacity: p.opacity }}
          animate={{ y: [0, -12, 0], rotate: [-5, 5, -5] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
        >
          🎃
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// NEW YEAR
// =============================================================================

export function NewYearEffects() {
  const confetti = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    x:       Math.random() * 100,
    color:   ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7'][i % 6],
    size:    6 + Math.random() * 8,
    dur:     4 + Math.random() * 4,
    delay:   Math.random() * 6,
    drift:   (Math.random() - 0.5) * 120,
    shape:   Math.random() > 0.5 ? 'rect' : 'circle',
    initRot: Math.random() * 360,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
      {confetti.map((c, i) => (
        <motion.div key={i} style={{
          position: 'absolute', left: `${c.x}%`,
          width: c.size, height: c.shape === 'rect' ? c.size * 0.4 : c.size,
          borderRadius: c.shape === 'circle' ? '50%' : 2,
          background: c.color, opacity: 0.8,
        }}
        animate={{ y: ['-5vh', '108vh'], x: [0, c.drift], rotate: [c.initRot, c.initRot + 540] }}
        transition={{ duration: c.dur, repeat: Infinity, delay: c.delay, ease: 'linear' }}
        />
      ))}
      {/* Countdown / firework hints */}
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div key={`fw-${i}`}
          style={{
            position: 'absolute',
            left: `${15 + i * 18}%`, top: `${20 + Math.random() * 30}%`,
            width: 6, height: 6, borderRadius: '50%',
            background: ['#FFD700','#FF6B6B','#4ECDC4','#96CEB4','#FFEAA7'][i],
            boxShadow: `0 0 12px 4px ${'#FFD700'}`,
          }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
            boxShadow: [`0 0 0px 0px transparent`, `0 0 20px 8px ${'#FFD700'}88`, `0 0 0px 0px transparent`],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// RAINY SEASON
// =============================================================================

export function RainyEffects() {
  const drops = useMemo(() => Array.from({ length: 70 }, () => ({
    x:       Math.random() * 100,
    height:  12 + Math.random() * 16,
    opacity: 0.2 + Math.random() * 0.3,
    dur:     0.6 + Math.random() * 0.5,
    delay:   Math.random() * 2,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 3 }}>
      {drops.map((d, i) => (
        <motion.div key={i} style={{
          position: 'absolute', left: `${d.x}%`,
          width: 1.5, height: d.height, borderRadius: 1,
          background: 'linear-gradient(to bottom, rgba(100,160,255,0.6), rgba(100,160,255,0))',
          opacity: d.opacity,
        }}
        animate={{ y: ['-5vh', '105vh'] }}
        transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: 'linear' }}
        />
      ))}
      {/* Occasional lightning */}
      <LightningEffect />
    </div>
  );
}

function LightningEffect() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const flash = () => {
      setVisible(true);
      setTimeout(() => setVisible(false), 120);
      setTimeout(flash, 8000 + Math.random() * 12000);
    };
    const t = setTimeout(flash, 5000 + Math.random() * 8000);
    return () => clearTimeout(t);
  }, []);

  return visible ? (
    <div className="fixed inset-0 pointer-events-none" style={{
      zIndex: 4, background: 'rgba(180,200,255,0.08)',
      transition: 'opacity 0.05s',
    }} />
  ) : null;
}

// =============================================================================
// MASTER EXPORT — pick the right effect
// =============================================================================

export function SeasonalEffectsLayer({
  event,
  season,
  variant,
}: {
  event:   JamaicaEvent;
  season:  SeasonalPeriod;
  variant: string;
}) {
  // Event overrides season
  if (event === 'christmas')    return <ChristmasEffects />;
  if (event === 'new_year' || event === 'boxing_day') return <NewYearEffects />;
  if (event === 'independence' || event === 'emancipation') return <IndependenceEffects />;
  if (event === 'halloween')    return <HalloweenEffects />;
  if (event === 'easter')       return <SpringEffects />;

  // Season fallback (or manual override)
  switch (variant) {
    case 'winter':  return <WinterEffects />;
    case 'spring':  return <SpringEffects />;
    case 'summer':  return <SummerEffects />;
    case 'autumn':  return <AutumnEffects />;
    case 'rainy':   return <RainyEffects />;
    case 'dry':     return <SummerEffects />;
    default:        return null;
  }
}