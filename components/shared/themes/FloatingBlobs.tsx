'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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

// =============================================================================
// BLOB CONFIG
// =============================================================================

const BASE_BLOBS = [
  { w: 420, h: 420, top: '-120px', left: '-100px', delay: 0,  dur: 28 },
  { w: 320, h: 320, top: '60%',    left: '78%',    delay: 6,  dur: 34 },
  { w: 360, h: 360, top: '68%',    left: '-60px',  delay: 12, dur: 26 },
  { w: 260, h: 260, top: '-50px',  left: '58%',    delay: 18, dur: 36 },
  { w: 300, h: 300, top: '28%',    left: '38%',    delay: 24, dur: 30 },
] as const;

function getBlobColors(group: string, variant: string): string[] {
  switch (group) {
    case 'lavalamp': return LAVA_BLOB_COLORS[variant as LavaLampVariant]   ?? LAVA_BLOB_COLORS.assi;
    case 'space':    return SPACE_BLOB_COLORS[variant as SpaceVariant]     ?? SPACE_BLOB_COLORS.stars;
    case 'seasons':  return SEASON_BLOB_COLORS[variant as SeasonVariant]   ?? SEASON_BLOB_COLORS.summer;
    case 'subjects': return SUBJECT_BLOB_COLORS[variant as SubjectVariant] ?? SUBJECT_BLOB_COLORS.mathematics;
    default:         return LAVA_BLOB_COLORS.assi;
  }
}

// =============================================================================
// STAR FIELD (for space themes)
// =============================================================================

interface Star {
  x: number; y: number;
  size: number; opacity: number;
  twinkleDur: number; twinkleDelay: number;
  // For starfall
  isShooting?: boolean;
  angle?: number; speed?: number; shootDelay?: number;
}

function StarField({ variant }: { variant: SpaceVariant }) {
  const [stars, setStars] = useState<Star[]>([]);
  const [shooters, setShooters] = useState<Star[]>([]);

  useEffect(() => {
    // Background stars
    const generated: Star[] = Array.from({ length: variant === 'nebula' ? 80 : 140 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.2,
      twinkleDur: Math.random() * 3 + 2,
      twinkleDelay: Math.random() * 4,
    }));
    setStars(generated);

    // Shooting stars for starfall variant
    if (variant === 'starfall') {
      const shoots: Star[] = Array.from({ length: 6 }, (_, i) => ({
        x: Math.random() * 80,
        y: Math.random() * 40,
        size: 2,
        opacity: 0.9,
        twinkleDur: 0,
        twinkleDelay: 0,
        isShooting: true,
        angle: 35 + Math.random() * 20,
        speed: 1.2 + Math.random() * 0.8,
        shootDelay: i * 2.8 + Math.random() * 2,
      }));
      setShooters(shoots);
    }

    // Galaxy spiral for galaxy variant
  }, [variant]);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10" style={{ overflow: 'hidden' }}>
      {/* Static + twinkling stars */}
      {stars.map((star, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            backgroundColor: variant === 'nebula'
              ? ['#f72585', '#7b2ff7', '#4cc9f0'][i % 3]
              : variant === 'galaxy'
                ? ['#9d4edd', '#4361ee', '#fff'][i % 3]
                : '#ffffff',
          }}
          animate={{ opacity: [star.opacity, star.opacity * 0.2, star.opacity] }}
          transition={{
            duration: star.twinkleDur,
            repeat: Infinity,
            delay: star.twinkleDelay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Shooting stars */}
      {shooters.map((s, i) => (
        <motion.div
          key={`shoot-${i}`}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: 80,
            height: 1.5,
            borderRadius: 2,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0))',
            rotate: `${s.angle}deg`,
            transformOrigin: 'left center',
          }}
          animate={{
            x:       [0, 300],
            y:       [0, 200],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: s.speed!,
            repeat: Infinity,
            delay: s.shootDelay,
            repeatDelay: 5 + Math.random() * 4,
            ease: 'easeIn',
          }}
        />
      ))}

      {/* Nebula glow blobs */}
      {variant === 'nebula' && (
        <>
          <motion.div
            style={{
              position: 'absolute', width: 500, height: 500,
              borderRadius: '50%', left: '10%', top: '20%',
              background: 'radial-gradient(circle, rgba(123,47,247,0.15) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            style={{
              position: 'absolute', width: 400, height: 400,
              borderRadius: '50%', right: '5%', bottom: '15%',
              background: 'radial-gradient(circle, rgba(247,37,133,0.12) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
            animate={{ scale: [1, 1.2, 1], y: [0, -40, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />
          <motion.div
            style={{
              position: 'absolute', width: 350, height: 350,
              borderRadius: '50%', left: '55%', top: '10%',
              background: 'radial-gradient(circle, rgba(76,201,240,0.10) 0%, transparent 70%)',
              filter: 'blur(45px)',
            }}
            animate={{ scale: [1, 1.1, 1], x: [0, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          />
        </>
      )}

      {/* Galaxy spiral hint */}
      {variant === 'galaxy' && (
        <motion.div
          style={{
            position: 'absolute',
            width: 600, height: 600,
            borderRadius: '50%',
            left: '50%', top: '50%',
            marginLeft: -300, marginTop: -300,
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(157,78,221,0.06) 25%, transparent 50%, rgba(67,97,238,0.08) 75%, transparent 100%)',
            filter: 'blur(20px)',
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
}

// =============================================================================
// SEASONAL PARTICLES
// =============================================================================

interface Particle {
  x: number; startY: number;
  size: number; opacity: number;
  dur: number; delay: number; drift: number;
}

function SeasonParticles({ variant }: { variant: SeasonVariant }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const count = variant === 'rainy' ? 60 : variant === 'winter' ? 40 : 25;
    setParticles(Array.from({ length: count }, () => ({
      x:      Math.random() * 100,
      startY: -10,
      size:   Math.random() * 5 + 2,
      opacity: Math.random() * 0.5 + 0.2,
      dur:    Math.random() * 4 + 3,
      delay:  Math.random() * 6,
      drift:  (Math.random() - 0.5) * 60,
    })));
  }, [variant]);

  const getParticleStyle = (p: Particle) => {
    switch (variant) {
      case 'spring': return {
        width: p.size + 4, height: p.size + 4,
        borderRadius: '50% 0 50% 0',
        background: ['#f48fb1', '#a5d6a7', '#ffccbc'][Math.floor(Math.random() * 3)],
      };
      case 'autumn': return {
        width: p.size + 6, height: p.size + 4,
        borderRadius: '50% 10% 50% 10%',
        background: ['#ff7043', '#ffa726', '#8d6e63', '#e64a19'][Math.floor(Math.random() * 4)],
      };
      case 'winter': return {
        width: p.size + 2, height: p.size + 2,
        borderRadius: '50%',
        background: 'rgba(220, 240, 255, 0.8)',
        boxShadow: '0 0 4px rgba(180, 220, 255, 0.6)',
      };
      case 'rainy': return {
        width: 1.5, height: p.size * 2 + 8,
        borderRadius: 1,
        background: 'rgba(100, 160, 255, 0.35)',
      };
      case 'dry': return {
        width: p.size + 2, height: p.size * 0.5,
        borderRadius: 2,
        background: 'rgba(255, 200, 80, 0.3)',
      };
      default: return {
        width: p.size, height: p.size,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.3)',
      };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            opacity: p.opacity,
            ...getParticleStyle(p),
          }}
          animate={{
            y: ['-5vh', '110vh'],
            x: [0, p.drift],
            rotate: variant === 'autumn' || variant === 'spring' ? [0, 360] : 0,
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// DARK MODE BLOBS (grayscale with orange accent)
// =============================================================================

function DarkModeBlobs() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {BASE_BLOBS.map((b, i) => {
        const color = i === 0 ? 'rgba(255,112,60,0.07)' :
                      i === 2 ? 'rgba(255,202,79,0.05)' :
                      'rgba(255,255,255,0.03)';
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.w, height: b.h,
              top: b.top, left: b.left,
              background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            }}
            animate={{
              x: [0, 60, -30, 50, 0],
              y: [0, -50, 80, -30, 0],
              scale: [1, 1.1, 0.95, 1.05, 1],
            }}
            transition={{
              duration: b.dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: b.delay,
            }}
          />
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FloatingBlobs() {
  const { themeGroup, themeVariant, colorMode, timeOfDay, isSentinel } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (isSentinel || !mounted) return null;

  // Dark mode: minimal grayscale blobs + orange accent
  if (colorMode === 'dark') return <DarkModeBlobs />;

  // Light mode: no blobs, clean
  if (colorMode === 'light') return null;

  // Space themes: star fields instead of blobs
  if (themeGroup === 'space') {
    return <StarField variant={themeVariant as SpaceVariant} />;
  }

  // Seasonal themes: particles + blobs
  if (themeGroup === 'seasons') {
    const colors  = getBlobColors(themeGroup, themeVariant as string);
    const opacity = getBlobOpacity(timeOfDay) * 0.7;
    return (
      <>
        <SeasonParticles variant={themeVariant as SeasonVariant} />
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          {BASE_BLOBS.slice(0, 3).map((b, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: b.w, height: b.h,
                top: b.top, left: b.left,
                background: `radial-gradient(circle, ${colors[i % colors.length]} 0%, transparent 70%)`,
                opacity,
              }}
              animate={{
                x: [0, 50, -25, 40, 0],
                y: [0, -40, 60, -20, 0],
                scale: [1, 1.1, 0.92, 1.08, 1],
              }}
              transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
            />
          ))}
        </div>
      </>
    );
  }

  // Lava lamp + subjects: full blob treatment
  const colors  = getBlobColors(themeGroup, themeVariant as string);
  const opacity = getBlobOpacity(timeOfDay);

  const motionScale = themeGroup === 'subjects' ? 0.8 : 1.0;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {BASE_BLOBS.map((b, i) => {
        const color = colors[i % colors.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.w, height: b.h,
              top: b.top, left: b.left,
              background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
              opacity,
            }}
            animate={{
              x: [0, 80 * motionScale, -40 * motionScale, 60 * motionScale, 0],
              y: [0, -60 * motionScale, 100 * motionScale, -40 * motionScale, 0],
              scale: [1, 1.2, 0.88, 1.12, 1],
              rotate: [0, 45, -30, 60, 0],
            }}
            transition={{
              duration: b.dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: b.delay,
            }}
          />
        );
      })}
    </div>
  );
}