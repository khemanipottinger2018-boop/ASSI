'use client';

import { motion } from 'framer-motion';
import { useTheme, ThemeType } from '@/components/shared/themes/ThemeProvider';

/* =====================================================
 * COLOR MAP
 * ===================================================== */

const THEME_COLORS: Record<ThemeType, string[]> = {
  assi: ['#FF6B35', '#FF4D4D', '#FFD166'],
  math: ['#2980b9', '#3498db', '#5dade2'],
  english: ['#8e44ad', '#9b59b6', '#bb8fce'],
  science: ['#27ae60', '#2ecc71', '#58d68d'],
  business: ['#16a085', '#1abc9c', '#48c9b0'],
  accounts: ['#2c3e50', '#34495e', '#7f8c8d'],
  it: ['#674172', '#7d66a8', '#a29bfe'],
  physics: ['#1e3799', '#3867d6', '#56ccf2'],
  chemistry: ['#e67e22', '#f39c12', '#f8c471'],
  'social-studies': ['#8d6e63', '#aa8e83', '#c7b2a9'],

  // 🔒 Sentinel = no blobs
  sentinel: [],
};

/* =====================================================
 * SHAPE PROFILES
 * ===================================================== */

const SHAPE_PROFILES: Record<
  ThemeType,
  { scale: number; motion: number; size: number }
> = {
  assi: { scale: 1.2, motion: 1, size: 1 },
  math: { scale: 1.15, motion: 0.9, size: 0.95 },
  english: { scale: 1.25, motion: 1.1, size: 1.05 },
  science: { scale: 1.3, motion: 1.3, size: 1.15 },
  business: { scale: 1.1, motion: 0.8, size: 0.9 },
  accounts: { scale: 1.05, motion: 0.75, size: 0.85 },
  it: { scale: 1.28, motion: 1.4, size: 1.2 },
  physics: { scale: 1.35, motion: 1.5, size: 1.3 },
  chemistry: { scale: 1.22, motion: 1.2, size: 1.1 },
  'social-studies': { scale: 1.18, motion: 0.95, size: 1 },

  // 🔒 Sentinel = inert
  sentinel: { scale: 1, motion: 0, size: 0 },
};

/* =====================================================
 * BASE BLOB CONFIG
 * ===================================================== */

const BASE_BLOBS = [
  { w: 400, h: 400, top: '-100px', left: '-100px', delay: 0, dur: 28 },
  { w: 300, h: 300, top: '60%', left: '80%', delay: 6, dur: 32 },
  { w: 350, h: 350, top: '70%', left: '-50px', delay: 12, dur: 24 },
  { w: 250, h: 250, top: '-40px', left: '60%', delay: 18, dur: 34 },
  { w: 320, h: 320, top: '30%', left: '40%', delay: 24, dur: 26 },
] as const;

/* =====================================================
 * COMPONENT
 * ===================================================== */

export default function FloatingBlobs() {
  const { theme, timeOfDay, isSentinel } = useTheme();

  /**
   * SENTINEL MODE
   * ----------------
   * No motion.
   * No color.
   * No distraction.
   */
  if (isSentinel) {
    return null;
  }

  const colors = THEME_COLORS[theme];
  const shape = SHAPE_PROFILES[theme];
  const opacity = timeOfDay === 'night' ? 0.35 : 0.55;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {BASE_BLOBS.map((b, i) => {
        const color = colors[i % colors.length];
        const width = b.w * shape.size;
        const height = b.h * shape.size;

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width,
              height,
              top: b.top,
              left: b.left,
              background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
              opacity,
            }}
            animate={{
              x: [
                0,
                80 * shape.motion,
                -40 * shape.motion,
                60 * shape.motion,
                0,
              ],
              y: [
                0,
                -60 * shape.motion,
                100 * shape.motion,
                -40 * shape.motion,
                0,
              ],
              scale: [
                1,
                shape.scale,
                1 - (shape.scale - 1),
                shape.scale * 0.9,
                1,
              ],
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
