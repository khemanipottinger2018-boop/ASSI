'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import {
  useTheme,
  LAVA_BLOB_COLORS,
  SPACE_BLOB_COLORS,
  SEASON_BLOB_COLORS,
  SUBJECT_BLOB_COLORS,
  getBlobOpacity,
} from '@/components/shared/themes/ThemeProvider';
import type {
  LavaLampVariant,
  SpaceVariant,
  SeasonVariant,
  SubjectVariant,
} from '@/components/shared/themes/ThemeProvider';

function getBlobColors(group: string, variant: string): string[] {
  switch (group) {
    case 'lavalamp': return LAVA_BLOB_COLORS[variant as LavaLampVariant]   ?? LAVA_BLOB_COLORS.assi;
    case 'space':    return SPACE_BLOB_COLORS[variant as SpaceVariant]     ?? SPACE_BLOB_COLORS.stars;
    case 'seasons':  return SEASON_BLOB_COLORS[variant as SeasonVariant]   ?? SEASON_BLOB_COLORS.summer;
    case 'subjects': return SUBJECT_BLOB_COLORS[variant as SubjectVariant] ?? SUBJECT_BLOB_COLORS.mathematics;
    default:         return LAVA_BLOB_COLORS.assi;
  }
}

function GrainOverlay({ opacity = 0.032 }: { opacity?: number }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 1,
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
        mixBlendMode: 'overlay',
      }}
    />
  );
}

function Vignette({ intensity = 0.55 }: { intensity?: number }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 2,
        background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
      }}
    />
  );
}

const STAR_COLORS = [
  '#ffffff', '#ffffff', '#ffffff',
  '#ffe8c0', '#ffd0a0', '#c8d8ff', '#e0ecff', '#fff4e0',
];

function useParallax(strength: number) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 40, damping: 30 });
  const springY = useSpring(y, { stiffness: 40, damping: 30 });

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const handleMove = (e: MouseEvent) => {
      x.set((e.clientX / window.innerWidth  - 0.5) * strength);
      y.set((e.clientY / window.innerHeight - 0.5) * strength);
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, [strength, x, y]);

  return { x: springX, y: springY };
}

interface StarData {
  x: number; y: number; size: number; opacity: number;
  color: string; layer: 0 | 1 | 2;
  twinkleDur: number; twinkleDelay: number;
}

interface ShootingStarData {
  x: number; y: number; length: number; angle: number;
  dur: number; delay: number; width: number;
}

function RealisticStarField({ variant }: { variant: SpaceVariant }) {
  const [stars,         setStars]         = useState<StarData[]>([]);
  const [shootingStars, setShootingStars] = useState<ShootingStarData[]>([]);
  const [mounted,       setMounted]       = useState(false);

  const far  = useParallax(8);
  const mid  = useParallax(18);
  const near = useParallax(32);

  useEffect(() => {
    const count = variant === 'nebula' ? 180 : variant === 'galaxy' ? 220 : 160;
    setStars(Array.from({ length: count }, () => {
      const layer = (Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2) as 0 | 1 | 2;
      return {
        x:           Math.random() * 100,
        y:           Math.random() * 100,
        size:        [0.5, 1.2, 2.2][layer] + Math.random() * [0.4, 0.8, 1.2][layer],
        opacity:     [0.35, 0.60, 0.85][layer] + Math.random() * 0.2,
        color:       STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        layer,
        twinkleDur:  2.5 + Math.random() * 4,
        twinkleDelay: Math.random() * 6,
      };
    }));

    if (variant === 'starfall') {
      setShootingStars(Array.from({ length: 8 }, (_, i) => ({
        x: 10 + Math.random() * 60, y: Math.random() * 35,
        length: 120 + Math.random() * 180,
        angle:  28 + Math.random() * 18,
        dur:    0.6 + Math.random() * 0.5,
        delay:  i * 3.2 + Math.random() * 3,
        width:  1 + Math.random() * 1.5,
      })));
    }
    setMounted(true);
  }, [variant]);

  const nebulaLayers = variant === 'nebula' ? [
    { color: 'rgba(123,47,247,0.12)',  x: '12%', y: '20%', size: 600, blur: 80,  delay: 0  },
    { color: 'rgba(247,37,133,0.09)',  x: '70%', y: '65%', size: 500, blur: 90,  delay: 4  },
    { color: 'rgba(76,201,240,0.08)',  x: '55%', y: '10%', size: 450, blur: 70,  delay: 8  },
    { color: 'rgba(67,97,238,0.10)',   x: '25%', y: '75%', size: 400, blur: 100, delay: 12 },
    { color: 'rgba(200,20,200,0.06)',  x: '85%', y: '30%', size: 350, blur: 80,  delay: 6  },
  ] : variant === 'galaxy' ? [
    { color: 'rgba(157,78,221,0.14)',  x: '50%', y: '50%', size: 700, blur: 100, delay: 0 },
    { color: 'rgba(67,97,238,0.10)',   x: '50%', y: '50%', size: 500, blur: 80,  delay: 2 },
    { color: 'rgba(255,255,255,0.05)', x: '50%', y: '50%', size: 300, blur: 40,  delay: 1 },
  ] : variant === 'stars' ? [
    { color: 'rgba(76,195,247,0.05)',  x: '20%', y: '30%', size: 500, blur: 120, delay: 0 },
    { color: 'rgba(144,202,249,0.04)', x: '75%', y: '60%', size: 400, blur: 100, delay: 5 },
  ] : [
    { color: 'rgba(124,77,255,0.06)',  x: '30%', y: '40%', size: 400, blur: 100, delay: 0 },
  ];

  const layerParallax = [far, mid, near];

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {nebulaLayers.map((n, i) => (
        <motion.div key={`neb-${i}`} style={{
          position: 'absolute', left: n.x, top: n.y,
          width: n.size, height: n.size,
          marginLeft: -n.size / 2, marginTop: -n.size / 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${n.color} 0%, transparent 70%)`,
          filter: `blur(${n.blur}px)`,
        }}
        animate={{ scale: [1, 1.08, 0.97, 1.05, 1], opacity: [1, 0.85, 1, 0.90, 1] }}
        transition={{ duration: 20 + i * 4, repeat: Infinity, ease: 'easeInOut', delay: n.delay }}
        />
      ))}

      {variant === 'galaxy' && (
        <>
          <motion.div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 800, height: 800, marginLeft: -400, marginTop: -400,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(157,78,221,0.04) 20%, transparent 40%, rgba(67,97,238,0.05) 60%, transparent 80%, rgba(157,78,221,0.03) 100%)',
            filter: 'blur(16px)',
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          />
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 120, height: 120, marginLeft: -60, marginTop: -60,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(157,78,221,0.08) 40%, transparent 70%)',
            filter: 'blur(12px)',
          }} />
        </>
      )}

      {([0, 1, 2] as const).map((layerIdx) => {
        const parallax = layerParallax[layerIdx];
        return (
          <motion.div key={`layer-${layerIdx}`}
            style={{ position: 'absolute', inset: '-5%', width: '110%', height: '110%', x: parallax.x, y: parallax.y }}
          >
            {stars.filter(s => s.layer === layerIdx).map((star, i) => (
              <motion.div key={i} style={{
                position: 'absolute', left: `${star.x}%`, top: `${star.y}%`,
                width: star.size, height: star.size, borderRadius: '50%',
                backgroundColor: star.color,
                boxShadow: star.layer === 2
                  ? `0 0 ${star.size * 3}px ${star.size}px ${star.color}44`
                  : star.layer === 1 && star.size > 1.5
                    ? `0 0 ${star.size * 2}px ${star.size * 0.5}px ${star.color}33`
                    : 'none',
              }}
              animate={{
                opacity: [star.opacity, star.opacity * 0.3, star.opacity * 0.8, star.opacity * 0.2, star.opacity],
                scale:   [1, 0.85, 1.1, 0.9, 1],
              }}
              transition={{ duration: star.twinkleDur, repeat: Infinity, delay: star.twinkleDelay, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>
        );
      })}

      {shootingStars.map((s, i) => (
        <motion.div key={`shoot-${i}`} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.length, height: s.width, borderRadius: s.width,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0) 100%)',
          rotate: `${s.angle}deg`, transformOrigin: 'left center',
        }}
        animate={{ x: [0, 400], y: [0, 260], opacity: [0, 0.95, 0.7, 0] }}
        transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, repeatDelay: 6 + Math.random() * 5, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

interface Particle { x: number; size: number; opacity: number; dur: number; delay: number; drift: number; rotate: number; }

function SeasonParticles({ variant }: { variant: SeasonVariant }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const count = variant === 'rainy' ? 70 : variant === 'winter' ? 45 : 28;
    setParticles(Array.from({ length: count }, () => ({
      x: Math.random() * 100, size: Math.random() * 6 + 2,
      opacity: Math.random() * 0.5 + 0.2,
      dur: Math.random() * 4 + 3, delay: Math.random() * 7,
      drift: (Math.random() - 0.5) * 80, rotate: Math.random() * 360,
    })));
  }, [variant]);

  const getStyle = (p: Particle, i: number) => {
    switch (variant) {
      case 'spring': return { width: p.size + 4, height: p.size + 4, borderRadius: '50% 0 50% 0', background: ['#f48fb1','#a5d6a7','#ffccbc','#ce93d8'][i % 4] };
      case 'autumn': return { width: p.size + 6, height: p.size + 4, borderRadius: '60% 10% 60% 10%', background: ['#ff7043','#ffa726','#8d6e63','#e64a19'][i % 4] };
      case 'winter': return { width: p.size + 2, height: p.size + 2, borderRadius: '50%', background: 'rgba(220,240,255,0.85)', boxShadow: `0 0 ${p.size*2}px ${p.size}px rgba(180,220,255,0.4)` };
      case 'rainy':  return { width: 1.5, height: p.size * 2 + 8, borderRadius: 1, background: 'linear-gradient(to bottom, rgba(100,160,255,0.5), rgba(100,160,255,0))' };
      default:       return { width: p.size, height: p.size, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {particles.map((p, i) => (
        <motion.div key={i} style={{ position: 'absolute', left: `${p.x}%`, opacity: p.opacity, ...getStyle(p, i) }}
          animate={{ y: ['-5vh', '110vh'], x: [0, p.drift], rotate: variant === 'autumn' || variant === 'spring' ? [p.rotate, p.rotate + 360] : 0 }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

const BASE_BLOBS = [
  { w: 420, h: 420, top: '-120px', left: '-100px', delay: 0,  dur: 28 },
  { w: 320, h: 320, top: '60%',    left: '78%',    delay: 6,  dur: 34 },
  { w: 360, h: 360, top: '68%',    left: '-60px',  delay: 12, dur: 26 },
  { w: 260, h: 260, top: '-50px',  left: '58%',    delay: 18, dur: 36 },
  { w: 300, h: 300, top: '28%',    left: '38%',    delay: 24, dur: 30 },
] as const;

function DarkModeBlobs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {BASE_BLOBS.map((b, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{
            width: b.w, height: b.h, top: b.top, left: b.left,
            background: `radial-gradient(circle, ${i===0?'rgba(255,112,60,0.07)':i===2?'rgba(255,202,79,0.05)':'rgba(255,255,255,0.025)'} 0%, transparent 70%)`,
          }}
          animate={{ x: [0, 60, -30, 50, 0], y: [0, -50, 80, -30, 0], scale: [1, 1.1, 0.95, 1.05, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        />
      ))}
    </div>
  );
}

export default function FloatingBlobs() {
  const { themeGroup, themeVariant, colorMode, timeOfDay, isSentinel } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (isSentinel || !mounted) return null;

  if (colorMode === 'dark') return <><DarkModeBlobs /><GrainOverlay opacity={0.025} /><Vignette intensity={0.50} /></>;
  if (colorMode === 'light') return <><GrainOverlay opacity={0.018} /><Vignette intensity={0.08} /></>;

  if (themeGroup === 'space') return (
    <><RealisticStarField variant={themeVariant as SpaceVariant} /><GrainOverlay opacity={0.02} /><Vignette intensity={0.65} /></>
  );

  if (themeGroup === 'seasons') {
    const colors = getBlobColors(themeGroup, themeVariant as string);
    const opacity = getBlobOpacity(timeOfDay) * 0.65;
    return (
      <>
        <SeasonParticles variant={themeVariant as SeasonVariant} />
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {BASE_BLOBS.slice(0, 3).map((b, i) => (
            <motion.div key={i} className="absolute rounded-full"
              style={{ width: b.w, height: b.h, top: b.top, left: b.left, background: `radial-gradient(circle, ${colors[i%colors.length]} 0%, transparent 70%)`, opacity }}
              animate={{ x: [0,50,-25,40,0], y: [0,-40,60,-20,0], scale: [1,1.1,0.92,1.08,1] }}
              transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
            />
          ))}
        </div>
        <GrainOverlay opacity={0.022} /><Vignette intensity={0.30} />
      </>
    );
  }

  const colors = getBlobColors(themeGroup, themeVariant as string);
  const opacity = getBlobOpacity(timeOfDay);
  const motionScale = themeGroup === 'subjects' ? 0.8 : 1.0;

  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {BASE_BLOBS.map((b, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: b.w, height: b.h, top: b.top, left: b.left, background: `radial-gradient(circle, ${colors[i%colors.length]} 0%, transparent 70%)`, opacity }}
            animate={{ x: [0,80*motionScale,-40*motionScale,60*motionScale,0], y: [0,-60*motionScale,100*motionScale,-40*motionScale,0], scale: [1,1.2,0.88,1.12,1], rotate: [0,45,-30,60,0] }}
            transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
          />
        ))}
      </div>
      <GrainOverlay opacity={0.028} /><Vignette intensity={0.35} />
    </>
  );
}