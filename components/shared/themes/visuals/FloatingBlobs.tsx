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
/* UTILITIES */
/* ---------------------------------- */

function getBlobColors(group: string, variant: string): string[] {
  switch (group) {
    case 'lavalamp':
      return LAVA_BLOB_COLORS[variant as LavaLampVariant]   ?? LAVA_BLOB_COLORS.assi;
    case 'space':
      return SPACE_BLOB_COLORS[variant as SpaceVariant]     ?? SPACE_BLOB_COLORS.stars;
    case 'seasons':
      return SEASON_BLOB_COLORS[variant as SeasonVariant]   ?? SEASON_BLOB_COLORS.summer;
    case 'events':
      return EVENT_BLOB_COLORS[variant as EventVariant]     ?? EVENT_BLOB_COLORS.christmas;
    case 'subjects':
      return SUBJECT_BLOB_COLORS[variant as SubjectVariant] ?? SUBJECT_BLOB_COLORS.mathematics;
    case 'premium':
      return PREMIUM_BLOB_COLORS[variant as PremiumVariant] ?? PREMIUM_BLOB_COLORS.cyberpunk;
    default:
      return LAVA_BLOB_COLORS.assi;
  }
}

/* ---------------------------------- */
/* VISUAL LAYERS */
/* ---------------------------------- */

function GrainOverlay({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 10,
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
        mixBlendMode: 'overlay',
      }}
    />
  );
}

function Vignette({ intensity = 0.4 }: { intensity?: number }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9,
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
      }}
    />
  );
}

/* ---------------------------------- */
/* PARALLAX */
/* ---------------------------------- */

function useParallax(strength: number) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 40, damping: 30 });
  const springY = useSpring(y, { stiffness: 40, damping: 30 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handler = (e: MouseEvent) => {
      x.set((e.clientX / window.innerWidth - 0.5) * strength);
      y.set((e.clientY / window.innerHeight - 0.5) * strength);
    };

    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [strength, x, y]);

  return { x: springX, y: springY };
}

/* ---------------------------------- */
/* STANDARD BLOBS */
/* ---------------------------------- */

const BASE_BLOBS = [
  { w: 420, h: 420, top: '-120px', left: '-100px', delay: 0,  dur: 28 },
  { w: 320, h: 320, top: '60%',    left: '78%',    delay: 6,  dur: 34 },
  { w: 360, h: 360, top: '68%',    left: '-60px',  delay: 12, dur: 26 },
  { w: 260, h: 260, top: '-50px',  left: '58%',    delay: 18, dur: 36 },
  { w: 300, h: 300, top: '28%',    left: '38%',    delay: 24, dur: 30 },
] as const;

function StandardBlobs({
  colors,
  opacity,
  motionScale = 1,
}: {
  colors: string[];
  opacity: number;
  motionScale?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {BASE_BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.w,
            height: b.h,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle, ${colors[i % colors.length]} 0%, transparent 70%)`,
            opacity,
          }}
          animate={{
            x: [0, 80 * motionScale, -40 * motionScale, 60 * motionScale, 0],
            y: [0, -60 * motionScale, 100 * motionScale, -40 * motionScale, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{
            duration: b.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: b.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------- */
/* MAIN COMPONENT */
/* ---------------------------------- */

export default function FloatingBlobs() {
  const { themeGroup, themeVariant, colorMode, timeOfDay, isSentinel } = useTheme();
  const [mounted, setMounted] = useState(false);

  // detectJamaicaEvent now correctly returns EventVariant | null
  // detectSeason now correctly returns SeasonVariant (no events mixed in)
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

  /* ---------- SEASONS ---------- */
  if (themeGroup === 'seasons') {
    return (
      <>
        <SeasonalEffectsLayer
          event={jamaicaEvent}  // ✅ EventVariant | null
          season={season}       // ✅ SeasonVariant
          variant={themeVariant}
        />
        <StandardBlobs colors={colors} opacity={opacity * 0.6} motionScale={0.7} />
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

  /* ---------- DEFAULT (LAVA) ---------- */
  return (
    <>
      <StandardBlobs colors={colors} opacity={opacity} />
      <GrainOverlay opacity={0.028} />
      <Vignette intensity={0.35} />
    </>
  );
}