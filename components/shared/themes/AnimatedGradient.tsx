'use client';

import { useEffect, useState } from 'react';
import {
  useTheme,
  LAVA_GRADIENTS,
  SPACE_GRADIENTS,
  SEASON_GRADIENTS,
  SUBJECT_GRADIENTS,
  getTimeOverlay,
} from '@/components/shared/themes/ThemeProvider';
import type {
  LavaLampVariant,
  SpaceVariant,
  SeasonVariant,
  SubjectVariant,
} from '@/components/shared/themes/ThemeProvider';

function resolveGradient(group: string, variant: string): string {
  switch (group) {
    case 'lavalamp': return LAVA_GRADIENTS[variant as LavaLampVariant] ?? LAVA_GRADIENTS.assi;
    case 'space':    return SPACE_GRADIENTS[variant as SpaceVariant]   ?? SPACE_GRADIENTS.stars;
    case 'seasons':  return SEASON_GRADIENTS[variant as SeasonVariant] ?? SEASON_GRADIENTS.summer;
    case 'subjects': return SUBJECT_GRADIENTS[variant as SubjectVariant] ?? SUBJECT_GRADIENTS.mathematics;
    default:         return LAVA_GRADIENTS.assi;
  }
}

export default function AnimatedGradient() {
  const { themeGroup, themeVariant, colorMode, timeOfDay, isSentinel } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* ── Sentinel: pitch dark ── */
  if (isSentinel) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{ backgroundColor: '#050505' }}
      />
    );
  }

  /* ── Light mode: clean white ── */
  if (colorMode === 'light') {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{ backgroundColor: '#f5f5f5' }}
      />
    );
  }

  /* ── Dark mode: black + orange accent glow ── */
  if (colorMode === 'dark') {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{ backgroundColor: '#0a0a0a' }}
      >
        {/* Subtle orange accent glow in corners */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 15% 85%, rgba(255,112,60,0.08) 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, rgba(255,202,79,0.06) 0%, transparent 50%)',
        }} />
      </div>
    );
  }

  /* ── Custom / subject / space / seasons: full gradient ── */
  const baseGradient = resolveGradient(themeGroup, themeVariant as string);
  const timeOverlay  = mounted ? getTimeOverlay(timeOfDay) : 'rgba(0,0,0,0)';

  /* Space themes get a darker base */
  const isSpace = themeGroup === 'space';

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-20 pointer-events-none"
      style={{
        backgroundImage: baseGradient,
        backgroundSize: '400% 400%',
        backgroundRepeat: 'no-repeat',
        animation: 'gradient-shift 18s ease-in-out infinite',
      }}
    >
      {/* Time-of-day overlay — darkens/warms by clock */}
      {mounted && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: timeOverlay,
            transition: 'background 4s ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Space themes: extra deep darkness */}
      {isSpace && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }} />
      )}

      <style>{`
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}