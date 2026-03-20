'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import {
  useTheme,
  LAVA_BLOB_COLORS,
  SPACE_BLOB_COLORS,
  SEASON_BLOB_COLORS,
  EVENT_BLOB_COLORS,
  SUBJECT_BLOB_COLORS,
  PREMIUM_BLOB_COLORS,
  getBlobOpacity,
  detectJamaicaEvent,
  detectSeason,
} from '@/components/shared/themes/core/ThemeProvider';

import type {
  LavaLampVariant,
  SpaceVariant,
  SeasonVariant,
  EventVariant,
  SubjectVariant,
  PremiumVariant,
} from '@/components/shared/themes/core/ThemeProvider';

import { SeasonalEffectsLayer } from '../SeasonalEffects';
import { SubjectSymbolsLayer } from '../SubjectSymbols';
import {
  CyberpunkTheme,
  OceanDepthsTheme,
  LoFiStudyTheme,
} from '../PremiumThemes';

/* ---------------------------------- */
/* UTILITIES                          */
/* ---------------------------------- */

function getBlobColors(group: string, variant: string): string[] {
  switch (group) {
    case 'lavalamp': return LAVA_BLOB_COLORS[variant as LavaLampVariant]   ?? LAVA_BLOB_COLORS.assi;
    case 'space':    return SPACE_BLOB_COLORS[variant as SpaceVariant]     ?? SPACE_BLOB_COLORS.stars;
    case 'seasons':  return SEASON_BLOB_COLORS[variant as SeasonVariant]   ?? SEASON_BLOB_COLORS.summer;
    case 'events':   return EVENT_BLOB_COLORS[variant as EventVariant]     ?? EVENT_BLOB_COLORS.christmas;
    case 'subjects': return SUBJECT_BLOB_COLORS[variant as SubjectVariant] ?? SUBJECT_BLOB_COLORS.mathematics;
    case 'premium':  return PREMIUM_BLOB_COLORS[variant as PremiumVariant] ?? PREMIUM_BLOB_COLORS.cyberpunk;
    default:         return LAVA_BLOB_COLORS.assi;
  }
}

/* ---------------------------------- */
/* SHARED VISUAL LAYERS               */
/* ---------------------------------- */

function GrainOverlay({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{
      zIndex: 10, opacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat', backgroundSize: '128px 128px', mixBlendMode: 'overlay',
    }} />
  );
}

function Vignette({ intensity = 0.4 }: { intensity?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{
      zIndex: 9,
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
    }} />
  );
}

/* ---------------------------------- */
/* STANDARD BLOBS (lava / fallback)   */
/* ---------------------------------- */

const BASE_BLOBS = [
  { w: 420, h: 420, top: '-120px', left: '-100px', delay: 0,  dur: 28 },
  { w: 320, h: 320, top: '60%',    left: '78%',    delay: 6,  dur: 34 },
  { w: 360, h: 360, top: '68%',    left: '-60px',  delay: 12, dur: 26 },
  { w: 260, h: 260, top: '-50px',  left: '58%',    delay: 18, dur: 36 },
  { w: 300, h: 300, top: '28%',    left: '38%',    delay: 24, dur: 30 },
] as const;

function StandardBlobs({ colors, opacity, motionScale = 1 }: {
  colors: string[]; opacity: number; motionScale?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {BASE_BLOBS.map((b, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{
            width: b.w, height: b.h, top: b.top, left: b.left,
            background: `radial-gradient(circle, ${colors[i % colors.length]} 0%, transparent 70%)`,
            opacity,
          }}
          animate={{
            x: [0, 80 * motionScale, -40 * motionScale, 60 * motionScale, 0],
            y: [0, -60 * motionScale, 100 * motionScale, -40 * motionScale, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------- */
/* SPACE EFFECTS                      */
/* ---------------------------------- */

function StarField({ count, variant }: { count: number; variant: SpaceVariant }) {
  const stars = useMemo(() => Array.from({ length: count }, () => ({
    x:       Math.random() * 100,
    y:       Math.random() * 100,
    size:    Math.random() > 0.92 ? 2.5 : Math.random() > 0.7 ? 1.5 : 1,
    opacity: 0.3 + Math.random() * 0.65,
    dur:     2 + Math.random() * 4,
    delay:   Math.random() * 5,
  })), [count]);

  const starColors: Record<SpaceVariant, string> = {
    stars:    '220, 240, 255',
    starfall: '200, 180, 255',
    nebula:   '255, 200, 255',
    galaxy:   '180, 210, 255',
  };
  const rgb = starColors[variant];

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {stars.map((s, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            borderRadius: '50%',
            background: `rgba(${rgb}, ${s.opacity})`,
            boxShadow: s.size > 2 ? `0 0 ${s.size * 3}px rgba(${rgb}, 0.6)` : 'none',
          }}
          animate={{ opacity: [s.opacity, s.opacity * 0.3, s.opacity] }}
          transition={{ duration: s.dur, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
        />
      ))}
    </div>
  );
}

function ShootingStars() {
  const shots = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    startX:      10 + Math.random() * 60,
    startY:      5  + Math.random() * 30,
    angle:       30 + Math.random() * 20,
    length:      120 + Math.random() * 100,
    dur:         0.6 + Math.random() * 0.5,
    delay:       i * 2.5 + Math.random() * 3,
    repeatDelay: 6 + Math.random() * 4,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {shots.map((s, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute',
            left: `${s.startX}%`, top: `${s.startY}%`,
            width: s.length, height: 1.5,
            background: 'linear-gradient(to right, rgba(255,255,255,0.9), transparent)',
            borderRadius: 1,
            rotate: `${s.angle}deg`,
            transformOrigin: 'left center',
          }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: [0, 1, 0], scaleX: [0, 1, 1] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'easeOut', repeatDelay: s.repeatDelay }}
        />
      ))}
    </div>
  );
}

function NebulaClouds({ variant }: { variant: SpaceVariant }) {
  const clouds = useMemo(() => {
    const colorMap: Record<SpaceVariant, string> = {
      stars:    '100, 180, 255',
      starfall: '150, 100, 255',
      nebula:   '220, 100, 255',
      galaxy:   '100, 140, 255',
    };
    const rgb = colorMap[variant];
    return Array.from({ length: 5 }, (_, i) => ({
      x:       10 + Math.random() * 80,
      y:       10 + Math.random() * 80,
      w:       200 + Math.random() * 300,
      h:       150 + Math.random() * 200,
      opacity: 0.04 + Math.random() * 0.06,
      rgb,
      dur:     12 + Math.random() * 10,
      delay:   i * 3,
    }));
  }, [variant]);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {clouds.map((c, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute',
            left: `${c.x}%`, top: `${c.y}%`,
            width: c.w, height: c.h,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(${c.rgb}, 0.8) 0%, rgba(${c.rgb}, 0) 70%)`,
            filter: 'blur(40px)',
            opacity: c.opacity,
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [c.opacity, c.opacity * 1.4, c.opacity] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: 'easeInOut', delay: c.delay }}
        />
      ))}
    </div>
  );
}

function GalaxyCore() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {[0, 45, 90, 135].map((angle, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 500 + i * 80, height: 180 + i * 40,
            marginTop: -(90 + i * 20), marginLeft: -(250 + i * 40),
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(120,160,255,${0.04 - i * 0.005}) 0%, transparent 70%)`,
            filter: 'blur(30px)',
            rotate: `${angle}deg`,
          }}
          animate={{ rotate: [`${angle}deg`, `${angle + 360}deg`] }}
          transition={{ duration: 80 + i * 20, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <motion.div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 120, height: 120, marginTop: -60, marginLeft: -60,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(180,210,255,0.12) 0%, transparent 70%)',
        filter: 'blur(20px)',
      }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function SpaceEffects({ variant }: { variant: SpaceVariant }) {
  return (
    <>
      <StarField count={variant === 'nebula' ? 120 : variant === 'galaxy' ? 180 : 150} variant={variant} />
      {variant === 'starfall' && <ShootingStars />}
      {(variant === 'nebula' || variant === 'galaxy' || variant === 'starfall') && (
        <NebulaClouds variant={variant} />
      )}
      {variant === 'galaxy' && <GalaxyCore />}
    </>
  );
}

/* ---------------------------------- */
/* MAIN COMPONENT                     */
/* ---------------------------------- */

export default function FloatingBlobs() {
  const { themeGroup, themeVariant, colorMode, timeOfDay, isSentinel } = useTheme();
  const [mounted, setMounted] = useState(false);

  const jamaicaEvent = useMemo(() => detectJamaicaEvent(), []);
  const season       = useMemo(() => detectSeason(), []);

  useEffect(() => setMounted(true), []);
  if (!mounted || isSentinel) return null;

  const colors  = getBlobColors(themeGroup, themeVariant);
  const opacity = getBlobOpacity(timeOfDay);

  /* ---------- DARK MODE ---------- */
  if (colorMode === 'dark') {
    return (
      <>
        <StandardBlobs colors={colors} opacity={opacity * 0.7} motionScale={0.7} />
        <GrainOverlay opacity={0.025} />
        <Vignette intensity={0.5} />
      </>
    );
  }

  /* ---------- LIGHT MODE ---------- */
  if (colorMode === 'light') {
    return (
      <>
        <GrainOverlay opacity={0.018} />
        <Vignette intensity={0.06} />
      </>
    );
  }

  /* ---------- SPACE ---------- */
  if (themeGroup === 'space') {
    return (
      <>
        <SpaceEffects variant={themeVariant as SpaceVariant} />
        <GrainOverlay opacity={0.015} />
        <Vignette intensity={0.55} />
      </>
    );
  }

  /* ---------- SEASONS ---------- */
  if (themeGroup === 'seasons') {
    return (
      <>
        <SeasonalEffectsLayer event={jamaicaEvent} season={season} variant={themeVariant} />
        <StandardBlobs colors={colors} opacity={opacity * 0.6} motionScale={0.7} />
        <GrainOverlay opacity={0.022} />
        <Vignette intensity={0.3} />
      </>
    );
  }

  /* ---------- EVENTS ---------- */
  if (themeGroup === 'events') {
    return (
      <>
        <SeasonalEffectsLayer event={themeVariant as EventVariant} season={season} variant={themeVariant} />
        <StandardBlobs colors={colors} opacity={opacity * 0.5} motionScale={0.6} />
        <GrainOverlay opacity={0.022} />
        <Vignette intensity={0.3} />
      </>
    );
  }

  /* ---------- SUBJECTS ---------- */
  if (themeGroup === 'subjects') {
    return (
      <>
        <SubjectSymbolsLayer variant={themeVariant} />
        <StandardBlobs colors={colors} opacity={opacity * 0.6} motionScale={0.65} />
        <GrainOverlay opacity={0.025} />
        <Vignette intensity={0.28} />
      </>
    );
  }

  /* ---------- PREMIUM ---------- */
  if (themeGroup === 'premium') {
    const variant = themeVariant as PremiumVariant;
    return (
      <>
        {variant === 'cyberpunk' && <CyberpunkTheme />}
        {variant === 'ocean'     && <OceanDepthsTheme />}
        {variant === 'lofi'      && <LoFiStudyTheme />}
        <GrainOverlay opacity={0.022} />
        <Vignette intensity={0.4} />
      </>
    );
  }

  /* ---------- DEFAULT — LAVA LAMP ---------- */
  return (
    <>
      <StandardBlobs colors={colors} opacity={opacity} />
      <GrainOverlay opacity={0.028} />
      <Vignette intensity={0.35} />
    </>
  );
}